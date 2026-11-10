import { VIDEO_MODES } from './catalog';
import { SETUP_SCHEMA } from './schema';
import type {
  Analysis,
  Cable,
  Connection,
  Device,
  Diagnostic,
  Endpoint,
  InternalRoute,
  ModeResult,
  Port,
  Setup,
  Status,
  VideoMode,
} from './types';

interface Step {
  from: Endpoint;
  to: Endpoint;
  connection?: Connection;
  cable?: Cable;
  route?: InternalRoute;
}
interface PathResult {
  diagnostics: Diagnostic[];
  steps: Step[];
  payload: number | null;
  mode: ModeResult;
}
const key = (endpoint: Endpoint) => JSON.stringify([endpoint.deviceId, endpoint.portId]);
const diagnostic = (
  code: string,
  status: Status,
  title: string,
  message: string,
  componentIds: string[] = [],
  suggestion?: string,
): Diagnostic => ({ code, status, title, message, componentIds, suggestion });
const aggregate = (items: Diagnostic[]): Status =>
  items.some((item) => item.status === 'incompatible')
    ? 'incompatible'
    : items.some((item) => item.status === 'indeterminate')
      ? 'indeterminate'
      : 'compatible';
const rank = (status: Status) => (status === 'compatible' ? 0 : status === 'indeterminate' ? 1 : 2);

/** Enumerates modeled signal paths. Connections are physical; internal routes are directed. */
function signalPaths(setup: Setup): { paths: Step[][]; truncated: boolean } {
  const adjacency = new Map<string, Step[]>();
  const add = (step: Step) =>
    adjacency.set(key(step.from), [...(adjacency.get(key(step.from)) ?? []), step]);
  for (const connection of setup.connections) {
    const cable = setup.cables.find((entry) => entry.id === connection.cableId)!;
    add({ from: connection.from, to: connection.to, connection, cable });
    if (cable.direction !== 'forward')
      add({ from: connection.to, to: connection.from, connection, cable });
  }
  for (const device of setup.devices)
    for (const route of device.routes)
      add({
        from: { deviceId: device.id, portId: route.fromPortId },
        to: { deviceId: device.id, portId: route.toPortId },
        route,
      });
  const starts = setup.devices.find((entry) => entry.id === setup.goal.sourceDeviceId)?.ports ?? [];
  const found: Step[][] = [];
  let explored = 0;
  let truncated = false;
  // The initial engine intentionally bounds exploration; excess topology yields unknown in analyzeSetup.
  for (const port of starts) {
    const start = { deviceId: setup.goal.sourceDeviceId, portId: port.id };
    const queue: { at: Endpoint; steps: Step[]; visited: Set<string> }[] = [
      { at: start, steps: [], visited: new Set([key(start)]) },
    ];
    while (queue.length && explored++ < 2000 && found.length < 100 && !truncated) {
      const current = queue.shift()!;
      if (current.at.deviceId === setup.goal.displayDeviceId) {
        found.push(current.steps);
        continue;
      }
      for (const step of adjacency.get(key(current.at)) ?? []) {
        if (current.visited.has(key(step.to))) continue;
        if (queue.length >= 2000) {
          truncated = true;
          break;
        }
        queue.push({
          at: step.to,
          steps: [...current.steps, step],
          visited: new Set([...current.visited, key(step.to)]),
        });
      }
    }
    if (queue.length || explored >= 2000 || found.length >= 100) {
      truncated = true;
      break;
    }
  }
  return { paths: found, truncated };
}

function inspectPath(setup: Setup, steps: Step[], mode: VideoMode): PathResult {
  const findings: Diagnostic[] = [];
  const devices = new Map(setup.devices.map((entry) => [entry.id, entry]));
  const getPort = (endpoint: Endpoint) =>
    devices.get(endpoint.deviceId)!.ports.find((entry) => entry.id === endpoint.portId)!;
  const points = new Map<string, { device: Device; port: Port }>();
  for (const step of steps)
    for (const endpoint of [step.from, step.to])
      points.set(key(endpoint), {
        device: devices.get(endpoint.deviceId)!,
        port: getPort(endpoint),
      });
  const ports = [...points.values()];
  const required = (mode.pixelClockMHz * 3 * setup.goal.colorDepth) / 1000;
  const lowerBound = (mode.width * mode.height * mode.refreshHz * 3 * setup.goal.colorDepth) / 1e9;
  const capacities: number[] = [];

  for (const [condition, label] of [
    ['computerOperational', 'Ordinateur opérationnel'],
    ['displayPowered', 'Écran alimenté'],
  ] as const) {
    const value = setup.conditions[condition];
    if (value !== true)
      findings.push(
        diagnostic(
          `condition-${condition}`,
          value === false ? 'incompatible' : 'indeterminate',
          label,
          value === false
            ? `${label} : condition non satisfaite, aucune image ne peut être établie.`
            : `${label} : état non renseigné.`,
          [],
          'Vérifier l’alimentation et le démarrage des appareils.',
        ),
      );
  }
  const sourceDevice = devices.get(setup.goal.sourceDeviceId)!;
  if (sourceDevice.kind !== 'gpu')
    findings.push(
      diagnostic(
        'source-unverified',
        'indeterminate',
        'Origine du signal non documentée',
        'Les capacités de la carte NVIDIA ne sont pas attribuées à cette sortie. Le processeur graphique relié, son activation et le routage doivent être renseignés.',
        [sourceDevice.id],
      ),
    );

  for (const step of steps) {
    const from = getPort(step.from),
      to = getPort(step.to);
    if (step.cable) {
      const cable = step.cable;
      const ids = [step.from.deviceId, cable.id, step.to.deviceId];
      const orientation = key(step.from) === key(step.connection!.from);
      const ends = orientation ? cable.ends : [...cable.ends].reverse();
      if (from.connector !== ends[0] || to.connector !== ends[1])
        findings.push(
          diagnostic(
            'physical-mismatch',
            'incompatible',
            'Connecteurs incompatibles',
            `Le câble ${cable.name} (${cable.ends.join(' → ')}) ne correspond pas aux prises ${from.connector} et ${to.connector}.`,
            ids,
            'Choisir un câble adapté aux deux prises.',
          ),
        );
      if (from.role === 'sink' || to.role === 'source')
        findings.push(
          diagnostic(
            'signal-direction',
            'incompatible',
            'Sens du signal incompatible',
            'Ce chemin relie une entrée comme source ou une sortie comme destination.',
            ids,
          ),
        );
      if (
        ![from.connector, to.connector].every((connector) =>
          ['displayport', 'hdmi'].includes(connector),
        )
      )
        findings.push(
          diagnostic(
            'connector-not-covered',
            'indeterminate',
            'Connecteur conservé, règle à ajouter',
            'Ce connecteur peut être enregistré dans le projet, mais sa compatibilité n’est pas encore simulée.',
            ids,
          ),
        );
      if (from.protocols === null || to.protocols === null || cable.protocols === null)
        findings.push(
          diagnostic(
            'protocol-unknown',
            'indeterminate',
            'Protocole non documenté',
            'Une prise ou le câble ne précise pas quel signal vidéo est transporté.',
            ids,
          ),
        );
      else {
        const common = from.protocols.filter(
          (protocol) => to.protocols!.includes(protocol) && cable.protocols!.includes(protocol),
        );
        if (common.length === 0)
          findings.push(
            diagnostic(
              'protocol-mismatch',
              'incompatible',
              'Aucun protocole commun',
              'Les deux ports et le câble ne partagent aucun protocole vidéo documenté.',
              ids,
              'Vérifier les protocoles de chaque élément, ou ajouter une conversion documentée.',
            ),
          );
        else if (!common.some((protocol) => ['displayport', 'hdmi'].includes(protocol)))
          findings.push(
            diagnostic(
              'protocol-not-covered',
              'indeterminate',
              'Transport non simulé',
              'Le moteur ne sait pas encore calculer les capacités de ce transport.',
              ids,
            ),
          );
      }
      if (cable.maxPayloadGbps === null)
        findings.push(
          diagnostic(
            'cable-capacity-unknown',
            'indeterminate',
            'Capacité du câble inconnue',
            'La forme du connecteur et sa version ne prouvent pas le débit utile du câble.',
            [cable.id],
            'Renseigner un profil de câble documenté.',
          ),
        );
      else capacities.push(cable.maxPayloadGbps);
    } else if (step.route) {
      if (step.route.supported !== true)
        findings.push(
          diagnostic(
            'internal-route',
            step.route.supported === false ? 'incompatible' : 'indeterminate',
            'Routage interne',
            step.route.supported === false
              ? 'Ce passage interne est déclaré impossible.'
              : 'Ce passage interne n’est pas documenté.',
            [step.from.deviceId],
          ),
        );
      if (step.route.maxPayloadGbps === null)
        findings.push(
          diagnostic(
            'internal-capacity-unknown',
            'indeterminate',
            'Capacité interne inconnue',
            'Le budget du passage interne doit être documenté.',
            [step.from.deviceId],
          ),
        );
      else capacities.push(step.route.maxPayloadGbps);
    }
  }

  for (const { device, port } of ports) {
    if (port.maxPayloadGbps === null)
      findings.push(
        diagnostic(
          'port-capacity-unknown',
          'indeterminate',
          'Capacité du port inconnue',
          `${device.name} — ${port.label} : débit utile non documenté.`,
          [device.id],
        ),
      );
    else capacities.push(port.maxPayloadGbps);
    if (!port.supportedColorDepths)
      findings.push(
        diagnostic(
          'color-depth-unknown',
          'indeterminate',
          'Profondeur de couleur inconnue',
          `${port.label} : le support de ${setup.goal.colorDepth} bits par composante n’est pas renseigné.`,
          [device.id],
        ),
      );
    else if (!port.supportedColorDepths.includes(setup.goal.colorDepth))
      findings.push(
        diagnostic(
          'color-depth',
          'incompatible',
          'Profondeur de couleur non prise en charge',
          `${port.label} ne supporte pas les ${setup.goal.colorDepth} bits par composante demandés.`,
          [device.id],
        ),
      );
    if (port.supportedModeIds !== null && !port.supportedModeIds.includes(mode.id))
      findings.push(
        diagnostic(
          'mode-unsupported',
          'incompatible',
          'Mode non pris en charge',
          `${device.name} — ${port.label} : ${mode.label} n’appartient pas aux modes déclarés.`,
          [device.id],
          'Choisir un mode déclaré pour cette entrée.',
        ),
      );
    else if (device.kind !== 'gpu' && port.supportedModeIds === null)
      findings.push(
        diagnostic(
          'mode-unknown',
          'indeterminate',
          'Modes de l’entrée inconnus',
          `${device.name} — ${port.label} : les timings acceptés ne sont pas documentés.`,
          [device.id],
          'Renseigner les modes vidéo de cette entrée.',
        ),
      );
  }
  const payload = capacities.length ? Math.min(...capacities) : null;
  if (payload !== null && required > payload) {
    const hasInternalRoute = steps.some((step) => step.route);
    // A converter may decode/re-encode DSC between segments; no end-to-end inference in that case.
    const noDsc = hasInternalRoute
      ? ports.every(({ port }) => port.dsc === false)
      : ports.some(({ port }) => port.dsc === false);
    // Active pixels give a strict lower bound. The pixel-clock budget is conservative for DP blanking.
    if (noDsc && lowerBound > payload)
      findings.push(
        diagnostic(
          'bandwidth-limit',
          'incompatible',
          'Capacité insuffisante',
          `Le minimum de pixels actifs exige ${lowerBound.toFixed(2)} Gbit/s, au-delà des ${payload.toFixed(2)} Gbit/s de la chaîne, et DSC est indisponible.`,
          ports.map(({ device }) => device.id),
          'Réduire la résolution, la fréquence ou la profondeur de couleur, puis réanalyser.',
        ),
      );
    else
      findings.push(
        diagnostic(
          noDsc ? 'timing-budget' : 'dsc-required',
          'indeterminate',
          noDsc ? 'Budget de transport à confirmer' : 'Compression ou timing à vérifier',
          noDsc
            ? `Le budget conservateur de ${required.toFixed(2)} Gbit/s dépasse ${payload.toFixed(2)} Gbit/s. Le traitement exact des intervalles de suppression n’est pas simulé.`
            : `Le budget non compressé de ${required.toFixed(2)} Gbit/s dépasse ${payload.toFixed(2)} Gbit/s. Le moteur ne négocie pas DSC et ne peut pas garantir ce mode.`,
          ports.map(({ device }) => device.id),
          'Vérifier les timings et DSC sur l’ensemble du chemin, ou sélectionner un mode inférieur.',
        ),
      );
  }
  if (!findings.length)
    findings.push(
      diagnostic(
        'path-supported',
        'compatible',
        'Chaîne compatible avec les données fournies',
        `${mode.label}, RGB ${setup.goal.colorDepth} bits : budget vidéo ${required.toFixed(2)} Gbit/s pour ${payload?.toFixed(2)} Gbit/s utiles documentés.`,
        [...new Set(ports.map(({ device }) => device.id))],
      ),
    );
  return {
    diagnostics: findings,
    steps,
    payload,
    mode: { mode, status: aggregate(findings), requiredGbps: required, diagnostics: findings },
  };
}

export function analyzeSetup(input: Setup): Analysis {
  const parsed = SETUP_SCHEMA.safeParse(input);
  const empty: Analysis = {
    status: 'indeterminate',
    displayStatus: 'indeterminate',
    requestedMode: null,
    availableModes: [],
    modeResults: [],
    diagnostics: [],
    path: [],
    assumptions: [],
    bottleneckGbps: null,
    requiredGbps: null,
  };
  if (!parsed.success)
    return {
      ...empty,
      diagnostics: [
        diagnostic(
          'invalid-setup',
          'indeterminate',
          'Installation à corriger',
          parsed.error.issues.map((issue) => issue.message).join(' · '),
        ),
      ],
    };
  const setup = parsed.data;
  const assumptions = [
    'Analyse du signal vidéo uniquement : ordinateur démarré, GPU initialisé et pilote opérationnel selon la déclaration ci-dessus.',
    'Écran alimenté et bonne entrée sélectionnée selon la déclaration utilisateur ; le moteur ne vérifie pas les alimentations.',
    'RGB 4:4:4 non compressé, sans HDR, VRR, audio ni contenu protégé. Aucune mesure physique du matériel.',
    'Les timings de démonstration sont des profils fictifs ; la source doit accepter leur programmation et l’écran doit les annoncer.',
    'Le budget pixel-clock inclut les intervalles de suppression de façon conservatrice ; les cas limites restent indéterminés.',
  ];
  const requestedMode = VIDEO_MODES.find((mode) => mode.id === setup.goal.modeId) ?? null;
  // Shared GPU/dock allocation is deliberately not inferred by this single-display engine.
  if (
    setup.devices.filter((device) => device.kind === 'display').length > 1 ||
    setup.connections.length > 20
  )
    return {
      ...empty,
      requestedMode,
      assumptions,
      diagnostics: [
        diagnostic(
          'topology-not-covered',
          'indeterminate',
          'Topologie au-delà du premier moteur',
          'Les données sont conservées, mais plusieurs écrans et les budgets partagés ne sont pas encore évalués.',
        ),
      ],
    };
  const { paths, truncated } = signalPaths(setup);
  if (truncated)
    return {
      ...empty,
      requestedMode,
      assumptions,
      diagnostics: [
        diagnostic(
          'path-search-limit',
          'indeterminate',
          'Chemins trop nombreux',
          'Cette topologie dépasse les limites de recherche du premier moteur. Aucun résultat partiel n’est présenté comme une preuve.',
        ),
      ],
    };
  if (!paths.length)
    return {
      ...empty,
      status: 'incompatible',
      displayStatus: 'incompatible',
      requestedMode,
      assumptions,
      diagnostics: [
        diagnostic(
          'no-path',
          'incompatible',
          'Aucun chemin vers l’écran',
          'Relier une sortie de la source à une entrée de l’écran. Un adaptateur nécessite également un routage interne documenté.',
          [setup.goal.sourceDeviceId, setup.goal.displayDeviceId],
        ),
      ],
    };
  const results = VIDEO_MODES.map(
    (mode) =>
      paths
        .map((steps) => inspectPath(setup, steps, mode))
        .sort((left, right) => rank(left.mode.status) - rank(right.mode.status))[0],
  );
  const selected = results.find((result) => result.mode.mode.id === setup.goal.modeId);
  const modeResults = results.map((result) => result.mode);
  const availableModes = modeResults
    .filter((result) => result.status === 'compatible')
    .map((result) => result.mode);
  // Any image is independent of the requested color depth: e.g. a 12-bit target can fail while 8-bit works.
  const fallbackResults = availableModes.length
    ? []
    : ([8, 10, 12] as const)
        .filter((depth) => depth !== setup.goal.colorDepth)
        .flatMap((colorDepth) =>
          VIDEO_MODES.map(
            (mode) =>
              paths
                .map((steps) =>
                  inspectPath({ ...setup, goal: { ...setup.goal, colorDepth } }, steps, mode),
                )
                .sort((left, right) => rank(left.mode.status) - rank(right.mode.status))[0].mode,
          ),
        );
  const imageStatuses = [...modeResults, ...fallbackResults].map((result) => result.status);
  const unmodeledDisplayTiming = paths.some((steps) => {
    const last = steps.at(-1)?.to;
    const inputPort = setup.devices
      .find((device) => device.id === last?.deviceId)
      ?.ports.find((port) => port.id === last?.portId);
    const knownModeIndependentBlocker = inspectPath(setup, steps, VIDEO_MODES[0]).diagnostics.some(
      (item) =>
        item.status === 'incompatible' &&
        [
          'physical-mismatch',
          'protocol-mismatch',
          'signal-direction',
          'internal-route',
          'condition-computerOperational',
          'condition-displayPowered',
        ].includes(item.code),
    );
    return (
      !knownModeIndependentBlocker &&
      inputPort?.supportedModeIds?.some((id) => !VIDEO_MODES.some((mode) => mode.id === id))
    );
  });
  // A real screen may advertise modes outside the small timing catalog. Absence from our catalog is not absence of signal.
  if (unmodeledDisplayTiming) imageStatuses.push('indeterminate');
  const displayStatus: Status = imageStatuses.includes('compatible')
    ? 'compatible'
    : imageStatuses.includes('indeterminate')
      ? 'indeterminate'
      : 'incompatible';
  return {
    status: selected?.mode.status ?? 'indeterminate',
    displayStatus,
    requestedMode,
    availableModes,
    modeResults,
    diagnostics: selected?.diagnostics ?? [
      diagnostic(
        'unknown-mode',
        'indeterminate',
        'Mode non modélisé',
        'Ce mode n’appartient pas aux timings couverts par le moteur.',
      ),
    ],
    path: selected
      ? [
          ...new Set(
            selected.steps.flatMap((step) => [
              step.from.deviceId,
              ...(step.cable ? [step.cable.id] : []),
              step.to.deviceId,
            ]),
          ),
        ]
      : [],
    assumptions,
    bottleneckGbps: selected?.payload ?? null,
    requiredGbps: selected?.mode.requiredGbps ?? null,
  };
}
