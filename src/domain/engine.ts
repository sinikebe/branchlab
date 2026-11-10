import { VIDEO_MODES } from './catalog';
import { dscLinkPayloadGbps, dscPayloadGbps, dscProfileMatchesMode, sameDscProfile } from './dsc';
import { SETUP_SCHEMA } from './schema';
import type {
  Analysis,
  Cable,
  Connection,
  Device,
  Diagnostic,
  DscProfile,
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
  const uncompressed =
    mode.pixelClockMHz === null ? null : (mode.pixelClockMHz * 3 * setup.goal.colorDepth) / 1000;
  let required = uncompressed;
  let transport: ModeResult['transport'] = null;
  let selectedDscProfile: DscProfile | null = null;
  const lowerBound = (mode.width * mode.height * mode.refreshHz * 3 * setup.goal.colorDepth) / 1e9;
  const capacities: number[] = [];
  let capacityIncomplete = false;
  if (mode.pixelClockMHz === null)
    findings.push(
      diagnostic(
        'timing-unknown',
        'indeterminate',
        'Timing détaillé non documenté',
        `${mode.label} est identifié par sa résolution et sa fréquence, mais son horloge pixel n’est pas publiée dans les sources retenues. Le budget vidéo exact reste inconnu.`,
        [],
        'Obtenir les timings EDID ou une fiche technique détaillée pour ce mode.',
      ),
    );

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
      if (cable.maxPayloadGbps === null) capacityIncomplete = true;
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
      if (step.route.maxPayloadGbps === null) capacityIncomplete = true;
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
    if (port.maxPayloadGbps === null) capacityIncomplete = true;
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
    if (port.supportedModeIds?.includes(mode.id) && device.kind === 'display') {
      findings.push(
        diagnostic(
          'mode-declared',
          'compatible',
          'Mode déclaré pour cette entrée',
          `${device.name} — ${port.label} : ${mode.label} figure dans les modes renseignés pour cette entrée. Cette information ne confirme pas à elle seule le fonctionnement de toute la chaîne.`,
          [device.id],
        ),
      );
    } else if (port.supportedModeIds !== null && !port.supportedModeIds.includes(mode.id)) {
      const incomplete = port.modeListComplete === false;
      findings.push(
        diagnostic(
          incomplete ? 'mode-not-documented' : 'mode-unsupported',
          incomplete ? 'indeterminate' : 'incompatible',
          incomplete ? 'Mode non documenté pour cette entrée' : 'Mode non pris en charge',
          `${device.name} — ${port.label} : ${mode.label} n’appartient pas aux modes renseignés.${incomplete ? ' La liste est partielle : cette absence ne prouve pas une incompatibilité.' : ''}`,
          [device.id],
          'Consulter la table des modes de cette entrée, ou sélectionner un mode documenté.',
        ),
      );
    } else if (device.kind !== 'gpu' && port.supportedModeIds === null) {
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
  }
  // A known element still bounds the path, but does not prove the unknown elements' budgets.
  const knownPayloadLimit = capacities.length ? Math.min(...capacities) : null;
  let payload = capacityIncomplete ? null : knownPayloadLimit;
  if (required !== null && payload !== null && required <= payload) transport = 'uncompressed';
  if (
    knownPayloadLimit !== null &&
    ((required !== null && required > knownPayloadLimit) || lowerBound > knownPayloadLimit)
  ) {
    const hasInternalRoute = steps.some((step) => step.route);
    const noDsc =
      setup.goal.compression === 'off' ||
      (hasInternalRoute
        ? ports.every(({ port }) => port.dsc === false)
        : ports.some(({ port }) => port.dsc === false));
    const directDp =
      steps.length === 1 &&
      !!steps[0].cable &&
      ports.length === 2 &&
      ports.every(
        ({ port }) => port.connector === 'displayport' && port.protocols?.includes('displayport'),
      ) &&
      steps[0].cable.protocols?.includes('displayport');
    const dscSupported = ports.every(({ port }) => port.dsc === true);
    const commonProfiles =
      !noDsc && directDp && dscSupported
        ? (ports[0].port.dscProfiles ?? []).filter(
            (profile) =>
              dscProfileMatchesMode(profile, mode, setup.goal.colorDepth) &&
              ports[1].port.dscProfiles?.some((other) => sameDscProfile(profile, other)),
          )
        : [];
    const candidates = commonProfiles
      .map((profile) => ({
        profile,
        required: dscPayloadGbps(mode, profile),
        payload: Math.min(knownPayloadLimit, dscLinkPayloadGbps(profile)),
      }))
      // Prefer the least compression among documented configurations that fit.
      .sort((left, right) => right.profile.bitsPerPixelX16 - left.profile.bitsPerPixelX16);
    const accepted = candidates.find(
      (candidate) =>
        // Legacy aggregate capacities cannot establish the cable/port rate per lane.
        // Applying a two-lane HBR3 cap to a four-lane HBR2 aggregate is unsafe.
        candidate.profile.link.laneCount === 4 &&
        candidate.required !== null &&
        candidate.required <= candidate.payload,
    );
    if (accepted) {
      selectedDscProfile = accepted.profile;
      required = accepted.required;
      transport = 'dsc';
      payload = capacityIncomplete ? null : accepted.payload;
      findings.push(
        diagnostic(
          'dsc-profile-supported',
          'compatible',
          'Profil DSC commun documenté',
          `${mode.label}, RGB ${setup.goal.colorDepth} bits : profil DSC 1.2 à ${accepted.profile.bitsPerPixelX16 / 16} bits par pixel, ${accepted.profile.sliceCount} tranches et FEC. Budget de transport ${required!.toFixed(2)} Gbit/s, pour une limite connue de ${accepted.payload.toFixed(2)} Gbit/s. Ce calcul ne mesure pas la négociation réelle.`,
          ports.map(({ device }) => device.id),
        ),
      );
    } else if (noDsc && lowerBound > knownPayloadLimit) {
      findings.push(
        diagnostic(
          'bandwidth-limit',
          'incompatible',
          'Capacité insuffisante',
          `Le minimum de pixels actifs exige ${lowerBound.toFixed(2)} Gbit/s, au-delà des ${knownPayloadLimit.toFixed(2)} Gbit/s d’un maillon connu, et DSC est ${setup.goal.compression === 'off' ? 'désactivé dans ce projet' : 'indisponible'}.`,
          ports.map(({ device }) => device.id),
          'Réduire la résolution, la fréquence ou la profondeur de couleur, puis réanalyser.',
        ),
      );
    } else {
      const unknownLaneBudget = commonProfiles.some((profile) => profile.link.laneCount !== 4);
      findings.push(
        diagnostic(
          noDsc ? 'timing-budget' : unknownLaneBudget ? 'dsc-lanes-unverified' : 'dsc-required',
          'indeterminate',
          noDsc ? 'Budget de transport à confirmer' : 'Profil DSC à confirmer',
          noDsc
            ? `Le budget conservateur de ${(required ?? lowerBound).toFixed(2)} Gbit/s dépasse ${knownPayloadLimit.toFixed(2)} Gbit/s. Le traitement exact des intervalles de suppression n’est pas simulé.`
            : !directDp
              ? 'Le calcul DSC couvre uniquement une liaison DisplayPort directe. Le passage DSC par un intermédiaire ou un autre transport reste à documenter et à modéliser.'
              : !dscSupported
                ? 'La prise en charge DSC doit être explicitement renseignée aux deux extrémités avant de vérifier un profil compressé.'
                : unknownLaneBudget
                  ? 'Un profil DSC à une ou deux voies est renseigné, mais les débits agrégés des ports et du câble ne prouvent pas leur débit par voie. Seules les chaînes DSC à quatre voies sont actuellement validées.'
                  : commonProfiles.length === 0
                    ? 'DSC est pris en charge, mais aucun profil identique accepté pour ce timing et cette profondeur de couleur n’est documenté aux deux extrémités. Aucun taux de compression n’est supposé.'
                    : required === null
                      ? 'Un profil DSC commun est déclaré, mais l’horloge pixel du mode manque pour calculer son budget de transport.'
                      : 'Les profils DSC communs renseignés dépassent le budget connu. Cela ne permet pas d’exclure un autre profil accepté qui n’est pas encore documenté.',
          ports.map(({ device }) => device.id),
          'Documenter les timings et un même profil DSC accepté aux deux extrémités, ou sélectionner un mode inférieur.',
        ),
      );
    }
  }
  if (aggregate(findings) === 'compatible' && required !== null)
    findings.push(
      diagnostic(
        'path-supported',
        'compatible',
        'Chaîne compatible avec les données fournies',
        `${mode.label}, RGB ${setup.goal.colorDepth} bits${transport === 'dsc' ? ' avec DSC' : ' non compressé'} : budget vidéo ${required.toFixed(2)} Gbit/s pour ${payload?.toFixed(2)} Gbit/s utiles documentés.`,
        [...new Set(ports.map(({ device }) => device.id))],
      ),
    );
  return {
    diagnostics: findings,
    steps,
    payload,
    mode: {
      mode,
      status: aggregate(findings),
      requiredGbps: required,
      uncompressedGbps: uncompressed,
      transport,
      dscProfile: selectedDscProfile,
      diagnostics: findings,
    },
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
    transport: null,
    uncompressedGbps: null,
    dscProfile: null,
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
    'RGB 4:4:4, sans HDR, VRR, audio ni contenu protégé. Aucune mesure physique du matériel.',
    setup.goal.compression === 'off'
      ? 'DSC est désactivé dans le projet : seuls les budgets non compressés sont évalués.'
      : 'Le transport non compressé est privilégié. DSC exige un profil identique explicitement accepté aux deux extrémités pour le timing et la profondeur demandés ; aucun taux de compression n’est supposé.',
    'La validation DSC couvre DisplayPort direct SST 8b/10b sur quatre voies avec FEC, arrondis par tranche et marge d’horloge. Les profils à une ou deux voies sont conservés, mais leur chaîne reste indéterminée tant que les débits par voie des ports et du câble ne sont pas modélisés.',
    'Les profils DSC déclarent aussi l’acceptation des contraintes encodeur/décodeur ; le moteur ne simule ni PPS ni négociation réelle.',
    'Les timings de démonstration sont des profils fictifs. Les modes constructeur sans horloge pixel restent incomplets ; un timing standard ne constitue pas une lecture EDID du matériel.',
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
    transport: selected?.mode.transport ?? null,
    uncompressedGbps: selected?.mode.uncompressedGbps ?? null,
    dscProfile: selected?.mode.dscProfile ?? null,
  };
}
