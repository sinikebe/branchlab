import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  type Connection as FlowConnection,
} from '@xyflow/react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  BookOpen,
  Cable as CableIcon,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Cpu,
  ExternalLink,
  GitBranch,
  Info,
  Layers3,
  Link2,
  Monitor,
  MousePointer2,
  Plus,
  RotateCcw,
  Undo2,
  X,
  Zap,
} from 'lucide-react';
import {
  analyzeSetup,
  createSetup,
  createGpu,
  createDisplay,
  DISPLAY_CATALOG,
  createCable,
  CABLE_PROFILES,
  GPU_CATALOG,
  getGpuId,
  createMotherboard,
  getMotherboardId,
  MOTHERBOARD_CATALOG,
  VIDEO_MODES,
  type Setup,
  type Device,
  type GpuId,
  type MotherboardId,
  type Status,
  type DscProfile,
} from './domain';
import { loadSetup, saveSetup, parseSetup, exportSetup } from './storage';
import { validateEditorSetup } from './editor-validation';
import { DisplayReference, PublishedModes } from './components/DisplayReference';
import { DscSettings } from './components/DscSettings';
import { GpuReference } from './components/GpuReference';
import { MotherboardReference } from './components/MotherboardReference';
import { Changelog } from './components/Changelog';
import { APP_VERSION as appVersion } from './version';

type EquipmentData = {
  device: Device;
  selected: boolean;
  activePortId?: string;
  onSelect: () => void;
};
type EquipmentNode = Node<EquipmentData, 'equipment'>;
type Selection = 'gpu' | 'display' | 'cable';
const statusText: Record<Status, string> = {
  compatible: 'Compatible',
  incompatible: 'Objectif non atteint',
  indeterminate: 'À vérifier',
};
const format = (value: number | null) =>
  value === null
    ? 'Non documenté'
    : `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Gbit/s`;
const connectorName = (id: string) =>
  id === 'displayport' ? 'DisplayPort' : id === 'hdmi' ? 'HDMI' : id === 'usb-c' ? 'USB-C' : id;
const userSource = { kind: 'user' as const, label: 'Caractéristique déclarée par l’utilisateur' };

function HardwareArt({
  display = false,
  motherboard = false,
}: {
  display?: boolean;
  motherboard?: boolean;
}) {
  if (motherboard)
    return (
      <div className="motherboard-art" aria-hidden="true">
        <div className="motherboard-socket">
          <Cpu size={31} />
        </div>
        <div className="motherboard-memory">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="motherboard-slots">
          <i />
          <i />
          <i />
        </div>
        <span>AM5</span>
      </div>
    );
  return display ? (
    <div className="monitor-art" aria-hidden="true">
      <div className="monitor-glass">
        <div className="landscape landscape-one" />
        <div className="landscape landscape-two" />
        <div className="sun" />
        <span>BranchLab</span>
      </div>
      <div className="monitor-neck" />
      <div className="monitor-foot" />
    </div>
  ) : (
    <div className="gpu-art" aria-hidden="true">
      <div className="gpu-bracket" />
      <div className="gpu-stripe" />
      <div className="fan">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="fan fan-second">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <span>GEFORCE RTX</span>
      <div className="gpu-pins" />
    </div>
  );
}

function Equipment({ data }: NodeProps<EquipmentNode>) {
  const display = data.device.kind === 'display';
  const visiblePorts = display
    ? data.device.ports.filter(
        (port) =>
          (['displayport', 'hdmi', 'usb-c'].includes(port.connector) && port.role !== 'source') ||
          port.id === data.activePortId,
      )
    : data.device.ports;
  return (
    <article className={`equipment-node ${data.selected ? 'chosen' : ''}`}>
      <button
        className="node-main nodrag"
        onClick={data.onSelect}
        aria-label={`Inspecter ${data.device.name}`}
      >
        <div className="node-eyebrow">
          <span className={`node-icon ${display ? 'purple' : ''}`}>
            {display ? <Monitor size={15} /> : <Cpu size={15} />}
          </span>
          {display
            ? 'ÉCRAN'
            : data.device.kind === 'gpu'
              ? 'CARTE GRAPHIQUE'
              : data.device.motherboard
                ? 'CARTE MÈRE'
                : 'SOURCE VIDÉO'}
          <span className="node-menu">···</span>
        </div>
        <HardwareArt display={display} motherboard={Boolean(data.device.motherboard)} />
        <h3>{data.device.name.replace('NVIDIA GeForce ', '')}</h3>
        <p>
          {data.device.source.kind === 'demo'
            ? 'Profil de démonstration · personnalisable'
            : data.device.display
              ? `${data.device.display.diagonalInches}″ ${data.device.display.panelTechnology} · ${data.device.display.nativeWidth} × ${data.device.display.nativeHeight}`
              : data.device.kind === 'gpu'
                ? data.device.gpu
                  ? `${data.device.gpu.memoryGB} Go ${data.device.gpu.memoryType} · ${data.device.gpu.architecture}`
                  : getGpuId(data.device)
                    ? 'NVIDIA · design de référence'
                    : 'Profil importé · données conservées'
                : data.device.motherboard
                  ? `${data.device.motherboard.socket} · ${data.device.motherboard.chipset} · ${data.device.motherboard.formFactor}`
                  : 'Capacités à renseigner'}
        </p>
      </button>
      <div className="node-ports">
        {visiblePorts.map((port) => (
          <div className={`port-row ${display ? 'incoming' : ''}`} key={port.id}>
            {display && (
              <Handle
                type="target"
                id={port.id}
                position={Position.Left}
                aria-label={`Entrée ${port.label}`}
              />
            )}
            <span className={`port-shape ${port.connector}`} />
            <span>{port.label}</span>
            <span className="port-dot" />
            {!display && (
              <Handle
                type="source"
                id={port.id}
                position={Position.Right}
                aria-label={`Sortie ${port.label}`}
              />
            )}
          </div>
        ))}
      </div>
      {data.device.ports.length > visiblePorts.length && (
        <button className="node-extra-ports nodrag" onClick={data.onSelect}>
          Voir les {data.device.ports.length - visiblePorts.length} autres prises{' '}
          <ChevronRight size={12} />
        </button>
      )}
    </article>
  );
}
const nodeTypes = { equipment: Equipment };

export function App() {
  const [setup, setSetup] = useState<Setup>(() => createSetup());
  const [ready, setReady] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [saveResult, setSaveResult] = useState<{ setup: Setup | null; status: string }>({
    setup: null,
    status: 'Chargement…',
  });
  const saveState =
    ready && canSave && saveResult.setup !== setup ? 'Enregistrement…' : saveResult.status;
  const [selection, setSelection] = useState<Selection>('cable');
  const [panel, setPanel] = useState<'diagnosis' | 'equipment'>('diagnosis');
  const [modal, setModal] = useState<'library' | 'sources' | 'guide' | 'changelog' | null>(null);
  const [notice, setNotice] = useState('');
  const [pendingOutput, setPendingOutput] = useState('dp-1');
  const [pendingInput, setPendingInput] = useState('dp-in');
  const [history, setHistory] = useState<Setup[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<EquipmentNode>([]);
  const upload = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const modalClose = useRef<HTMLButtonElement>(null);
  const previousOutputs = useRef<Record<string, string>>({});
  const [flow, setFlow] = useState<ReactFlowInstance<EquipmentNode> | null>(null);
  const source = setup.devices.find((device) => device.id === setup.goal.sourceDeviceId)!;
  const gpuModelId = source.kind === 'gpu' ? getGpuId(source) : null;
  const motherboardModelId = getMotherboardId(source);
  const display = setup.devices.find((device) => device.id === setup.goal.displayDeviceId)!;
  const cable = setup.cables[0];
  const connection = setup.connections[0];
  const analysis = analyzeSetup(setup);
  const mode = analysis.requestedMode;
  const sourcePort =
    source.ports.find((port) => port.id === (connection?.from.portId ?? pendingOutput)) ??
    source.ports[0];
  const displayPort =
    display.ports.find((port) => port.id === (connection?.to.portId ?? pendingInput)) ??
    display.ports[0];
  const dscProfile = displayPort.dscProfiles?.find(
    (profile) =>
      profile.modeId === setup.goal.modeId &&
      profile.colorDepth === setup.goal.colorDepth &&
      sourcePort.dscProfiles?.some(
        (candidate) =>
          candidate.modeId === profile.modeId &&
          candidate.colorDepth === profile.colorDepth &&
          candidate.version === profile.version &&
          candidate.bitsPerPixelX16 === profile.bitsPerPixelX16 &&
          candidate.sliceCount === profile.sliceCount &&
          candidate.sliceHeight === profile.sliceHeight &&
          candidate.link.encoding === profile.link.encoding &&
          candidate.link.laneCount === profile.link.laneCount &&
          candidate.link.fec === profile.link.fec,
      ),
  );

  useEffect(() => {
    let active = true;
    loadSetup()
      .then((saved) => {
        if (active) {
          if (saved) {
            validateEditorSetup(saved);
            setSetup(saved);
          }
          setCanSave(true);
          setReady(true);
        }
      })
      .catch((error) => {
        if (active) {
          setNotice(error.message);
          setSaveResult({ setup: null, status: 'Sauvegarde indisponible' });
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !canSave) return;
    let active = true;
    setSaveResult({ setup, status: 'Enregistrement…' });
    const timer = setTimeout(() => {
      saveSetup(setup)
        .then(() => {
          if (active) setSaveResult({ setup, status: 'Enregistré sur cet appareil' });
        })
        .catch(() => {
          if (!active) return;
          setSaveResult({ setup, status: 'Échec de sauvegarde' });
          setNotice(
            'La sauvegarde locale est indisponible. Exportez votre setup pour le conserver.',
          );
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [setup, ready, canSave]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 8000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!modal) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    modalClose.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModal(null);
      if (event.key !== 'Tab') return;
      const focusable = [
        ...document.querySelectorAll<HTMLElement>(
          '.modal button, .modal a[href], .modal input, .modal select',
        ),
      ];
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [modal]);

  const update = useCallback(
    (change: (draft: Setup) => void) => {
      const next = structuredClone(setup);
      change(next);
      setHistory((items) => [...items.slice(-19), setup]);
      setSetup(next);
      setCanSave(true);
    },
    [setup],
  );
  const replace = (next: Setup) => {
    setHistory((items) => [...items.slice(-19), setup]);
    setSetup(next);
    setCanSave(true);
  };
  const selectDevice = useCallback((id: Selection) => {
    setSelection(id);
    setPanel('equipment');
  }, []);

  useEffect(() => {
    setNodes((current) =>
      [source, display].map((device, index) => ({
        id: device.id,
        type: 'equipment',
        position: current.find((node) => node.id === device.id)?.position ?? {
          x: index === 0 ? 60 : 485,
          y: index === 0 ? 110 : 145,
        },
        data: {
          device,
          activePortId: index === 0 ? connection?.from.portId : connection?.to.portId,
          selected: panel === 'equipment' && selection === (index === 0 ? 'gpu' : 'display'),
          onSelect: () => selectDevice(index === 0 ? 'gpu' : 'display'),
        },
      })),
    );
  }, [source, display, selection, panel, selectDevice, setNodes, connection]);

  useEffect(() => {
    if (!flow || !canvas.current) return;
    let timer: number | undefined;
    let previousWidth = -1;
    let previousHeight = -1;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (
        width < 1 ||
        height < 1 ||
        (Math.abs(width - previousWidth) < 1 && Math.abs(height - previousHeight) < 1)
      )
        return;
      previousWidth = width;
      previousHeight = height;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void flow.fitView({ padding: 0.2, maxZoom: 1 });
      }, 100);
    });
    observer.observe(canvas.current);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [flow, source.id]);

  const setGpu = (id: GpuId) => {
    const output = sourcePort.id;
    previousOutputs.current[source.id] = output;
    const replacement = createGpu(id);
    const replacementPort = replacement.ports.some((port) => port.id === output) ? output : 'dp-1';
    update((draft) => {
      draft.devices = draft.devices.filter((device) => device.kind !== 'gpu');
      draft.devices.unshift(replacement);
      draft.goal.sourceDeviceId = 'gpu-1';
      if (draft.connections[0])
        draft.connections[0].from = {
          deviceId: 'gpu-1',
          portId: replacementPort,
        };
    });
    setPendingOutput(replacementPort);
    setModal(null);
    selectDevice('gpu');
  };
  const setDisplay = (id: 'demo' | 'xeneon-flex') => {
    const replacement = createDisplay(id, display.id);
    const input =
      replacement.ports.find(
        (port) => port.connector === displayPort.connector && port.role !== 'source',
      ) ?? replacement.ports[0];
    update((draft) => {
      draft.devices = draft.devices.map((device) =>
        device.id === display.id ? replacement : device,
      );
      if (draft.connections[0])
        draft.connections[0].to = { deviceId: replacement.id, portId: input.id };
      draft.goal.modeId = id === 'xeneon-flex' ? 'uwqhd60' : '4k60';
    });
    setPendingInput(input.id);
    setModal(null);
    selectDevice('display');
    setNotice(
      id === 'xeneon-flex'
        ? 'XENEON FLEX ajouté. Objectif initial : 3440 × 1440 à 60 Hz. Le câble et la source sont conservés.'
        : 'Profil de démonstration sélectionné.',
    );
  };
  const setMotherboard = (id: MotherboardId) => {
    previousOutputs.current[source.id] = sourcePort.id;
    const replacement = createMotherboard(id);
    const output =
      replacement.ports.find((port) => port.connector === sourcePort.connector) ??
      replacement.ports[0];
    update((draft) => {
      draft.devices = draft.devices.filter(
        (device) => device.kind !== 'motherboard' && device.id !== 'motherboard-1',
      );
      draft.devices.push(replacement);
      draft.goal.sourceDeviceId = replacement.id;
      if (draft.connections[0])
        draft.connections[0].from = { deviceId: replacement.id, portId: output.id };
    });
    setPendingOutput(output.id);
    setModal(null);
    selectDevice('gpu');
    setNotice(
      'Carte mère ajoutée. Ses sorties vidéo nécessitent un processeur avec circuit graphique et un routage documentés.',
    );
  };
  const changeOrigin = (motherboard: boolean) => {
    previousOutputs.current[source.id] = sourcePort.id;
    if (!motherboard) {
      const previousGpu = setup.devices.find(
        (device) => device.kind === 'gpu' && device.ports.length > 0,
      );
      if (!previousGpu) {
        setNotice(
          'Choisissez votre carte graphique dans la bibliothèque pour documenter cette sortie.',
        );
        setModal('library');
        return;
      }
      const preferred = previousOutputs.current[previousGpu.id];
      const output =
        previousGpu.ports.find((port) => port.id === preferred) ?? previousGpu.ports[0];
      update((draft) => {
        draft.goal.sourceDeviceId = previousGpu.id;
        if (draft.connections[0])
          draft.connections[0].from = { deviceId: previousGpu.id, portId: output.id };
      });
      setPendingOutput(output.id);
      return;
    }
    const previousBoard = setup.devices.find(
      (device) =>
        (device.kind === 'motherboard' || device.id === 'motherboard-1') && device.ports.length > 0,
    );
    const board: Device = previousBoard ?? {
      id: 'motherboard-1',
      name: 'Sortie de carte mère',
      kind: 'other',
      source: userSource,
      routes: [],
      ports: [
        {
          id: 'dp-out',
          label: 'DisplayPort · non documenté',
          connector: 'displayport',
          role: 'source',
          protocols: null,
          maxPayloadGbps: null,
          dsc: null,
          supportedModeIds: null,
          source: userSource,
        },
      ],
    };
    const preferred = previousOutputs.current[board.id];
    const output = board.ports.find((port) => port.id === preferred) ?? board.ports[0];
    update((draft) => {
      if (!previousBoard) draft.devices.push(board);
      draft.goal.sourceDeviceId = board.id;
      if (draft.connections[0])
        draft.connections[0].from = { deviceId: board.id, portId: output.id };
    });
    setPendingOutput(output.id);
  };
  const onConnect = (link: FlowConnection) => {
    if (
      link.source !== source.id ||
      link.target !== display.id ||
      !link.sourceHandle ||
      !link.targetHandle
    )
      return;
    update((draft) => {
      draft.connections = [
        {
          id: 'connection-1',
          from: { deviceId: link.source, portId: link.sourceHandle! },
          to: { deviceId: link.target, portId: link.targetHandle! },
          cableId: draft.cables[0].id,
        },
      ];
    });
  };
  const exportProject = () => {
    const url = URL.createObjectURL(new Blob([exportSetup(setup)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'branchlab-setup.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importProject = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Ce fichier dépasse la limite de 2 Mio.');
      const imported = parseSetup(await file.text());
      validateEditorSetup(imported);
      replace(imported);
      setNotice('Votre setup a été importé.');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Import impossible. Le projet actuel est conservé.',
      );
    }
    if (upload.current) upload.current.value = '';
  };
  const patchDisplayPort = (patch: Partial<typeof displayPort>) =>
    update((draft) => {
      const port = draft.devices
        .find((device) => device.id === display.id)!
        .ports.find((port) => port.id === displayPort.id)!;
      const originalSource = port.source;
      const preservedEvidence = Object.fromEntries(
        [
          'connector',
          'role',
          'protocols',
          'maxPayloadGbps',
          'dsc',
          'dscProfiles',
          'supportedModeIds',
          'supportedColorDepths',
          'modeListComplete',
        ].map((key) => [key, port.evidence?.[key] ?? originalSource]),
      );
      Object.assign(port, patch, { source: userSource });
      port.evidence = {
        ...preservedEvidence,
        ...port.evidence,
        ...Object.fromEntries(Object.keys(patch).map((key) => [key, userSource])),
      };
    });
  const saveDscProfile = (profile: DscProfile) => {
    update((draft) => {
      for (const [deviceId, portId] of [
        [source.id, sourcePort.id],
        [display.id, displayPort.id],
      ]) {
        const port = draft.devices
          .find((item) => item.id === deviceId)!
          .ports.find((item) => item.id === portId)!;
        const dscSource = port.dsc === true ? (port.evidence?.dsc ?? port.source) : profile.source;
        port.dsc = true;
        port.dscProfiles = [
          ...(port.dscProfiles ?? []).filter(
            (item) =>
              item.source.kind !== 'user' ||
              item.modeId !== profile.modeId ||
              item.colorDepth !== profile.colorDepth,
          ),
          structuredClone(profile),
        ];
        port.evidence = { ...port.evidence, dsc: dscSource, dscProfiles: profile.source };
      }
    });
    setNotice('Profil DSC enregistré comme déclaration utilisateur pour les deux ports.');
  };
  const removeDscProfile = () => {
    update((draft) => {
      for (const [deviceId, portId] of [
        [source.id, sourcePort.id],
        [display.id, displayPort.id],
      ]) {
        const port = draft.devices
          .find((item) => item.id === deviceId)!
          .ports.find((item) => item.id === portId)!;
        port.dscProfiles = (port.dscProfiles ?? []).filter(
          (item) =>
            item.source.kind !== 'user' ||
            item.modeId !== setup.goal.modeId ||
            item.colorDepth !== setup.goal.colorDepth,
        );
      }
    });
    setNotice(
      'Profil DSC retiré pour cet objectif. La capacité générale DSC des ports est conservée.',
    );
  };
  const sources = [
    ...new Map(
      setup.devices
        .flatMap((device) => [
          device.source,
          ...(device.display ? [device.display.source] : []),
          ...(device.gpu ? [device.gpu.source, ...Object.values(device.gpu.evidence ?? {})] : []),
          ...(device.motherboard
            ? [device.motherboard.source, ...Object.values(device.motherboard.evidence ?? {})]
            : []),
          ...device.ports.flatMap((port) => [
            port.source,
            ...(port.videoReference
              ? [port.videoReference.source, ...Object.values(port.videoReference.evidence ?? {})]
              : []),
            ...Object.values(port.evidence ?? {}),
            ...(port.dscProfiles ?? []).map((profile) => profile.source),
          ]),
        ])
        .concat(setup.cables.map((item) => item.source))
        .concat(analysis.requestedMode ? [analysis.requestedMode.source] : [])
        .map((item) => [JSON.stringify(item), item]),
    ).values(),
  ];
  const statusClass = analysis.status;

  if (!ready)
    return (
      <div className="loading">
        <GitBranch size={30} />
        <p>Ouverture de votre atelier…</p>
      </div>
    );
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#" aria-label="BranchLab, atelier">
          <span className="brand-symbol">
            <GitBranch size={23} />
          </span>
          Branch<span>Lab</span>
        </a>
        <div className="header-divider" />
        <div className="project-breadcrumb">
          <span>Espace personnel</span>
          <ChevronRight size={14} />
          <strong>Mon setup</strong>
        </div>
        <span className="local-badge">
          <span /> Instance locale
        </span>
        <button
          className="header-help icon-button"
          title="Guide de démarrage"
          aria-label="Guide de démarrage"
          onClick={() => setModal('guide')}
        >
          <CircleHelp size={19} />
        </button>
        <div className="avatar" title="Sans compte · données sur cet appareil">
          B
        </div>
      </header>
      <div className="workspace-shell">
        <aside className="library-sidebar">
          <div className="sidebar-label">VOTRE ESPACE</div>
          <button className="sidebar-nav active" onClick={() => setPanel('diagnosis')}>
            <Layers3 size={18} />
            Mon atelier<span>01</span>
          </button>
          <button className="sidebar-nav" onClick={() => setModal('sources')}>
            <BookOpen size={18} />
            Sources & fiabilité
          </button>
          <div className="sidebar-separator" />
          <div className="sidebar-label library-heading">
            BIBLIOTHÈQUE{' '}
            <span>{GPU_CATALOG.length + MOTHERBOARD_CATALOG.length + DISPLAY_CATALOG.length}</span>
          </div>
          <p className="sidebar-hint">Les premières briques de votre installation.</p>
          {GPU_CATALOG.map((gpu) => (
            <button className="library-item" key={gpu.id} onClick={() => setGpu(gpu.id)}>
              <span className="library-icon">
                <Cpu size={21} />
              </span>
              <span>
                <strong>{gpu.shortName.replace(/(\d+) Go$/, '$1\u00a0Go')}</strong>
                <small>NVIDIA · Carte graphique</small>
              </span>
              <Plus size={15} />
            </button>
          ))}
          {MOTHERBOARD_CATALOG.map((board) => (
            <button
              className="library-item"
              key={board.id}
              onClick={() => setMotherboard(board.id)}
            >
              <span className="library-icon">
                <Layers3 size={21} />
              </span>
              <span>
                <strong>{board.shortName}</strong>
                <small>Carte mère · AM5</small>
              </span>
              <Plus size={15} />
            </button>
          ))}
          <button className="library-item" onClick={() => setDisplay('xeneon-flex')}>
            <span className="library-icon purple">
              <Monitor size={21} />
            </span>
            <span>
              <strong>XENEON FLEX</strong>
              <small>Corsair · Écran OLED 45″</small>
            </span>
            <Plus size={15} />
          </button>
          <button className="library-item" onClick={() => selectDevice('display')}>
            <span className="library-icon purple">
              <Monitor size={21} />
            </span>
            <span>
              <strong>Écran personnalisé</strong>
              <small>Profil à renseigner</small>
            </span>
            <ArrowUpRight size={15} />
          </button>
          <div className="library-note">
            <Info size={14} />
            <p>
              Les modèles NVIDIA suivent le design de référence. Vérifiez les ports de votre carte
              partenaire.
            </p>
          </div>
          <div className="sidebar-bottom">
            <span className="private-dot" /> Vos données restent ici.
            <p>Sans compte. Sans envoi de votre setup.</p>
            <button onClick={() => setModal('guide')}>
              Découvrir BranchLab <ArrowUpRight size={13} />
            </button>
          </div>
        </aside>
        <main className="main-workspace">
          <section className="workspace-intro">
            <div>
              <div className="eyebrow">L’ATELIER DE CONNEXIONS</div>
              <h1>
                Votre setup, au clair<span>.</span>
              </h1>
              <p>Reliez vos équipements. Comprenez ce qui fonctionne.</p>
            </div>
            <button className="button primary" onClick={() => setModal('library')}>
              <Plus size={17} />
              Équipements
            </button>
          </section>
          <section className="studio" aria-label="Éditeur de votre installation">
            <div className="studio-toolbar">
              <div className="project-title">
                <span className="project-dot" />
                <input
                  aria-label="Nom du setup"
                  value={setup.name}
                  onChange={(event) =>
                    update((draft) => {
                      draft.name = event.target.value.slice(0, 100) || 'Mon setup';
                    })
                  }
                />
                <span className="draft-badge">Brouillon</span>
              </div>
              <div className="toolbar-actions">
                <button
                  className="icon-button"
                  aria-label="Annuler la dernière modification"
                  disabled={!history.length}
                  onClick={() => {
                    const previous = history.at(-1);
                    if (previous) {
                      setSetup(previous);
                      setHistory((items) => items.slice(0, -1));
                    }
                  }}
                >
                  <Undo2 size={17} />
                </button>
                <span className="toolbar-line" />
                <button className="text-button" onClick={() => upload.current?.click()}>
                  <ArrowUpFromLine size={15} />
                  <span>Importer</span>
                </button>
                <button className="text-button" onClick={exportProject}>
                  <ArrowDownToLine size={15} />
                  <span>Exporter</span>
                </button>
                <input
                  className="hidden"
                  ref={upload}
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => void importProject(event.target.files?.[0])}
                />
              </div>
            </div>
            {display.ports.some(
              (port) =>
                port.source.kind === 'demo' ||
                Object.values(port.evidence ?? {}).some((item) => item.kind === 'demo'),
            ) && (
              <div className="demo-banner">
                <Info size={13} />
                <span>
                  Écran de démonstration : capacités fictives. Renseignez celles de votre écran pour
                  analyser votre matériel.
                </span>
              </div>
            )}
            <div className="studio-body">
              <div className="canvas-wrap" ref={canvas}>
                <div className="canvas-label">
                  <span className="canvas-step">01</span> Installation vidéo{' '}
                  <span className="canvas-count">2 équipements</span>
                </div>
                <ReactFlow
                  onInit={setFlow}
                  nodes={nodes}
                  edges={
                    connection
                      ? [
                          {
                            id: connection.id,
                            source: connection.from.deviceId,
                            sourceHandle: connection.from.portId,
                            target: connection.to.deviceId,
                            targetHandle: connection.to.portId,
                            type: 'smoothstep',
                            label: cable.name.split(' · ')[0],
                            animated: analysis.displayStatus === 'compatible',
                            style: {
                              stroke:
                                analysis.status === 'incompatible'
                                  ? '#d28a47'
                                  : analysis.status === 'compatible'
                                    ? '#5278db'
                                    : '#9aa5bb',
                              strokeWidth: 2.5,
                            },
                            labelStyle: { fill: '#56637d', fontSize: 11, fontWeight: 600 },
                            labelBgStyle: { fill: '#fff' },
                            labelBgPadding: [10, 6],
                            labelBgBorderRadius: 7,
                          },
                        ]
                      : []
                  }
                  onNodesChange={onNodesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  onEdgeClick={() => selectDevice('cable')}
                  fitView
                  fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                  minZoom={0.4}
                  maxZoom={1.4}
                  defaultEdgeOptions={{ interactionWidth: 28 }}
                  proOptions={{ hideAttribution: false }}
                  deleteKeyCode={null}
                  nodesConnectable
                  connectionRadius={28}
                  aria-label="Schéma interactif de l’installation"
                >
                  <Background gap={20} size={1} color="#d7dce5" />
                  <Controls showInteractive={false} position="bottom-left" />
                </ReactFlow>
                <div className="canvas-tip">
                  <MousePointer2 size={14} />
                  <span>Déplacez les appareils · Reliez les points des ports</span>
                </div>
                <div className="canvas-legend">
                  <span>
                    <i className="legend-device" />
                    Équipement
                  </span>
                  <span>
                    <i className="legend-link" />
                    Connexion
                  </span>
                </div>
              </div>
              <aside className="inspector" aria-label="Inspection et diagnostic">
                <div className="inspector-tabs">
                  <button
                    className={panel === 'diagnosis' ? 'active' : ''}
                    onClick={() => setPanel('diagnosis')}
                  >
                    <Zap size={15} />
                    Diagnostic
                  </button>
                  <button
                    className={panel === 'equipment' ? 'active' : ''}
                    onClick={() => setPanel('equipment')}
                  >
                    <Layers3 size={15} />
                    Éléments
                  </button>
                </div>
                {panel === 'diagnosis' ? (
                  <div className="inspector-content">
                    <div className="section-kicker">VOTRE OBJECTIF</div>
                    <h2>Une image, sans surprise.</h2>
                    <label className="field-label" htmlFor="goal-mode">
                      Résolution & fréquence
                    </label>
                    <select
                      id="goal-mode"
                      value={setup.goal.modeId}
                      onChange={(event) =>
                        update((draft) => {
                          draft.goal.modeId = event.target.value;
                        })
                      }
                    >
                      {VIDEO_MODES.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.width} × {item.height} · {item.refreshHz} Hz
                        </option>
                      ))}
                    </select>
                    <div className="color-row">
                      <span>Couleurs</span>
                      <select
                        aria-label="Profondeur des couleurs"
                        value={setup.goal.colorDepth}
                        onChange={(event) =>
                          update((draft) => {
                            draft.goal.colorDepth = Number(event.target.value) as 8 | 10 | 12;
                          })
                        }
                      >
                        <option value="8">RGB · 8 bits</option>
                        <option value="10">RGB · 10 bits</option>
                        <option value="12">RGB · 12 bits</option>
                      </select>
                    </div>
                    <label className="field-label" htmlFor="goal-compression">
                      Compression DSC
                    </label>
                    <select
                      id="goal-compression"
                      value={setup.goal.compression ?? 'auto'}
                      onChange={(event) =>
                        update((draft) => {
                          draft.goal.compression = event.target.value as 'auto' | 'off';
                        })
                      }
                    >
                      <option value="auto">Autoriser si nécessaire</option>
                      <option value="off">Désactiver pour cette analyse</option>
                    </select>
                    <p className="fine-print">
                      La simulation utilise DSC seulement avec un profil accepté par les deux ports.
                    </p>
                    <div className={`result-card ${statusClass}`}>
                      <div className="result-icon">
                        {analysis.status === 'compatible' ? (
                          <CheckCircle2 size={22} />
                        ) : analysis.status === 'incompatible' ? (
                          <Info size={22} />
                        ) : (
                          <CircleHelp size={22} />
                        )}
                      </div>
                      <div>
                        <strong>{statusText[analysis.status]}</strong>
                        <p>
                          {analysis.status === 'compatible'
                            ? 'Ce mode est disponible avec les caractéristiques renseignées.'
                            : analysis.status === 'incompatible'
                              ? 'Un maillon de la chaîne limite ce mode.'
                              : 'Des caractéristiques manquent pour conclure.'}
                        </p>
                      </div>
                    </div>
                    <div className="signal-row">
                      <span>Signal vidéo possible</span>
                      <strong className={analysis.displayStatus}>
                        {analysis.displayStatus === 'compatible'
                          ? 'Oui, sous hypothèses'
                          : analysis.displayStatus === 'incompatible'
                            ? 'Non'
                            : 'Indéterminé'}
                      </strong>
                    </div>
                    <div className="inspector-separator" />
                    <div className="section-kicker">LA CHAÎNE EN DÉTAIL</div>
                    <div className="chain-track">
                      {[
                        {
                          label: source.name.replace('NVIDIA GeForce ', ''),
                          icon: <Cpu size={14} />,
                          id: 'gpu' as const,
                        },
                        {
                          label:
                            connectorName(sourcePort.connector) +
                            ' → ' +
                            connectorName(displayPort.connector),
                          icon: <CableIcon size={14} />,
                          id: 'cable' as const,
                        },
                        {
                          label: display.name,
                          icon: <Monitor size={14} />,
                          id: 'display' as const,
                        },
                      ].map((item, index) => (
                        <button key={item.id} onClick={() => selectDevice(item.id)}>
                          <span className="chain-icon">{item.icon}</span>
                          <span>
                            {item.label}
                            <small>
                              {index === 0
                                ? 'Source du signal'
                                : index === 1
                                  ? connection
                                    ? 'Câble et ports sélectionnés'
                                    : 'Aucun câble relié'
                                  : 'Capacités de l’entrée choisie'}
                            </small>
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                    </div>
                    {display.catalogId === 'xeneon-flex' && (
                      <PublishedModes
                        port={displayPort}
                        onSelect={(id) =>
                          update((draft) => {
                            draft.goal.modeId = id;
                          })
                        }
                      />
                    )}
                    <div className="section-kicker mode-heading">
                      MODES VALIDÉS POUR CETTE CHAÎNE <span>{analysis.availableModes.length}</span>
                    </div>
                    <div className="available-modes">
                      {analysis.availableModes.length ? (
                        analysis.availableModes.map((item) => (
                          <button
                            key={item.id}
                            onClick={() =>
                              update((draft) => {
                                draft.goal.modeId = item.id;
                              })
                            }
                            className={item.id === setup.goal.modeId ? 'selected' : ''}
                          >
                            <Check size={12} />
                            {item.label}
                          </button>
                        ))
                      ) : (
                        <p>Aucun mode confirmé pour le moment.</p>
                      )}
                    </div>
                    <p className="fine-print">
                      Parmi les modes renseignés · RGB {setup.goal.colorDepth} bits ·{' '}
                      {setup.goal.compression === 'off'
                        ? 'DSC désactivé'
                        : 'DSC autorisé si documenté'}
                    </p>
                    {mode && (
                      <DscSettings
                        key={`${source.name}:${sourcePort.id}:${display.id}:${displayPort.id}:${mode.id}:${setup.goal.colorDepth}:${JSON.stringify(dscProfile)}`}
                        mode={mode}
                        colorDepth={setup.goal.colorDepth}
                        available={
                          Boolean(connection) &&
                          source.kind === 'gpu' &&
                          sourcePort.connector === 'displayport' &&
                          displayPort.connector === 'displayport'
                        }
                        current={dscProfile}
                        onSave={saveDscProfile}
                        onRemove={removeDscProfile}
                      />
                    )}
                  </div>
                ) : (
                  <div className="inspector-content">
                    <div className="element-switch">
                      {(['gpu', 'cable', 'display'] as Selection[]).map((item) => (
                        <button
                          className={selection === item ? 'active' : ''}
                          key={item}
                          onClick={() => setSelection(item)}
                        >
                          {item === 'gpu' ? 'Source' : item === 'display' ? 'Écran' : 'Liaison'}
                        </button>
                      ))}
                    </div>
                    {selection === 'gpu' ? (
                      <>
                        <div className="section-kicker">ORIGINE DU SIGNAL</div>
                        <h2>Le bon port, la bonne source.</h2>
                        <label className="field-label" htmlFor="origin">
                          Emplacement de la sortie
                        </label>
                        <select
                          id="origin"
                          value={source.kind === 'gpu' ? 'gpu' : 'motherboard'}
                          onChange={(event) => changeOrigin(event.target.value === 'motherboard')}
                        >
                          <option value="gpu">Carte graphique dédiée</option>
                          <option value="motherboard">Carte mère</option>
                        </select>
                        {source.kind === 'gpu' && (
                          <>
                            <label className="field-label" htmlFor="gpu-model">
                              Carte graphique
                            </label>
                            <select
                              id="gpu-model"
                              value={gpuModelId ?? ''}
                              onChange={(event) => setGpu(event.target.value as GpuId)}
                            >
                              {!gpuModelId && (
                                <option value="" disabled>
                                  Profil importé · {source.name}
                                </option>
                              )}
                              {GPU_CATALOG.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                        {source.kind !== 'gpu' && (
                          <>
                            <label className="field-label" htmlFor="motherboard-model">
                              Carte mère
                            </label>
                            <select
                              id="motherboard-model"
                              value={motherboardModelId ?? ''}
                              onChange={(event) =>
                                setMotherboard(event.target.value as MotherboardId)
                              }
                            >
                              {!motherboardModelId && (
                                <option value="" disabled>
                                  {source.motherboard
                                    ? `Profil importé · ${source.name}`
                                    : 'Modèle non documenté'}
                                </option>
                              )}
                              {MOTHERBOARD_CATALOG.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                        <div className="info-box">
                          <Info size={16} />
                          <p>
                            {source.kind === 'gpu'
                              ? gpuModelId
                                ? 'Profil NVIDIA de référence. Les ports d’une carte partenaire peuvent différer.'
                                : 'Profil importé : ses caractéristiques sont conservées sans les attribuer à une carte du catalogue.'
                              : 'La carte graphique dédiée ne fournit pas automatiquement le signal d’une sortie de carte mère. Le processeur et le routage doivent être documentés.'}
                          </p>
                        </div>
                        {source.kind === 'gpu' &&
                          (source.gpu ? (
                            <GpuReference device={source} />
                          ) : (
                            <p className="fine-print">
                              Cette fiche ne contient pas de caractéristiques détaillées. Choisissez
                              un modèle dans Équipements pour charger sa référence NVIDIA.
                            </p>
                          ))}
                        {source.motherboard && <MotherboardReference device={source} />}
                        <div className="section-kicker">SORTIES VIDÉO</div>
                        <div className="spec-list">
                          {source.ports.map((port) => (
                            <div key={port.id}>
                              <span>{port.label}</span>
                              <strong>
                                {port.maxPayloadGbps === null &&
                                port.videoReference?.rawBandwidthGbps != null
                                  ? `${port.videoReference.rawBandwidthGbps.toLocaleString('fr-FR')} Gbit/s bruts`
                                  : format(port.maxPayloadGbps)}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : selection === 'cable' ? (
                      <>
                        <div className="section-kicker">LES MAILLONS COMPTENT</div>
                        <h2>Inspecter la liaison.</h2>
                        <label className="field-label" htmlFor="out-port">
                          Port de sortie
                        </label>
                        <select
                          id="out-port"
                          value={sourcePort.id}
                          onChange={(event) => {
                            setPendingOutput(event.target.value);
                            update((draft) => {
                              if (draft.connections[0])
                                draft.connections[0].from.portId = event.target.value;
                            });
                          }}
                        >
                          {source.ports.map((port) => (
                            <option key={port.id} value={port.id}>
                              {port.label}
                            </option>
                          ))}
                        </select>
                        <label className="field-label" htmlFor="cable-profile">
                          Câble utilisé
                        </label>
                        <select
                          id="cable-profile"
                          value={
                            CABLE_PROFILES.find((profile) => {
                              const reference = createCable(profile.id);
                              return (
                                reference.name === cable.name &&
                                JSON.stringify(reference.ends) === JSON.stringify(cable.ends) &&
                                JSON.stringify(reference.protocols) ===
                                  JSON.stringify(cable.protocols) &&
                                reference.maxPayloadGbps === cable.maxPayloadGbps
                              );
                            })?.id ?? ''
                          }
                          onChange={(event) =>
                            update((draft) => {
                              draft.cables[0] = createCable(event.target.value, cable.id);
                            })
                          }
                        >
                          <option value="" disabled>
                            Profil importé
                          </option>
                          {CABLE_PROFILES.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.name}
                            </option>
                          ))}
                        </select>
                        <label className="field-label" htmlFor="in-port">
                          Entrée de l’écran
                        </label>
                        <select
                          id="in-port"
                          value={displayPort.id}
                          onChange={(event) => {
                            setPendingInput(event.target.value);
                            update((draft) => {
                              if (draft.connections[0])
                                draft.connections[0].to.portId = event.target.value;
                            });
                          }}
                        >
                          {display.ports.map((port) => (
                            <option key={port.id} value={port.id}>
                              {port.label}
                            </option>
                          ))}
                        </select>
                        <div className="info-box">
                          <CableIcon size={17} />
                          <p>
                            Le profil d’un câble est une déclaration à vérifier sur sa fiche. Un
                            câble de capacité inconnue ne permet pas de confirmer le mode demandé.
                          </p>
                        </div>
                        <button
                          className="button full"
                          onClick={() =>
                            update((draft) => {
                              draft.connections = draft.connections.length
                                ? []
                                : [
                                    {
                                      id: 'connection-1',
                                      from: { deviceId: source.id, portId: sourcePort.id },
                                      to: { deviceId: display.id, portId: displayPort.id },
                                      cableId: cable.id,
                                    },
                                  ];
                            })
                          }
                        >
                          <Link2 size={15} />
                          {connection ? 'Débrancher le câble' : 'Relier les ports'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="section-kicker">CAPACITÉS DE L’ÉCRAN</div>
                        <h2>Ce que l’entrée accepte.</h2>
                        <label className="field-label" htmlFor="screen-model">
                          Modèle d’écran
                        </label>
                        <select
                          id="screen-model"
                          value={display.catalogId === 'xeneon-flex' ? 'xeneon-flex' : 'demo'}
                          onChange={(event) =>
                            setDisplay(event.target.value as 'demo' | 'xeneon-flex')
                          }
                        >
                          {DISPLAY_CATALOG.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        {display.catalogId === 'xeneon-flex' && (
                          <DisplayReference device={display} port={displayPort} />
                        )}
                        <label className="field-label" htmlFor="screen-name">
                          Nom de l’écran
                        </label>
                        <input
                          id="screen-name"
                          value={display.name}
                          onChange={(event) =>
                            update((draft) => {
                              const item = draft.devices.find(
                                (device) => device.id === display.id,
                              )!;
                              item.name = event.target.value.slice(0, 100) || 'Mon écran';
                              item.source = userSource;
                            })
                          }
                        />
                        <p className="fine-print">
                          {display.catalogId === 'xeneon-flex'
                            ? 'Les champs ci-dessous concernent l’entrée sélectionnée. Toute modification est marquée comme déclaration utilisateur.'
                            : 'La démonstration utilise un écran fictif. Remplacez ses capacités par celles de votre modèle.'}
                        </p>
                        <label className="field-label" htmlFor="screen-input">
                          Configurer l’entrée
                        </label>
                        <select
                          id="screen-input"
                          value={displayPort.id}
                          onChange={(event) => {
                            setPendingInput(event.target.value);
                            update((draft) => {
                              if (draft.connections[0])
                                draft.connections[0].to.portId = event.target.value;
                            });
                          }}
                        >
                          {display.ports.map((port) => (
                            <option key={port.id} value={port.id}>
                              {port.label}
                            </option>
                          ))}
                        </select>
                        <label className="field-label" htmlFor="screen-bandwidth">
                          Capacité utile de l’entrée
                        </label>
                        <select
                          id="screen-bandwidth"
                          value={displayPort.maxPayloadGbps ?? 'unknown'}
                          onChange={(event) =>
                            patchDisplayPort({
                              maxPayloadGbps:
                                event.target.value === 'unknown'
                                  ? null
                                  : Number(event.target.value),
                            })
                          }
                        >
                          <option value="unknown">Non documentée</option>
                          <option value="17.28">DisplayPort HBR2 · 17,28 Gbit/s</option>
                          <option value="25.92">DisplayPort HBR3 · 25,92 Gbit/s</option>
                          <option value="77.37">DisplayPort UHBR20 · 77,37 Gbit/s</option>
                        </select>
                        <label className="field-label" htmlFor="screen-protocol">
                          Protocole vidéo de l’entrée
                        </label>
                        <select
                          id="screen-protocol"
                          value={
                            displayPort.protocols === null
                              ? 'unknown'
                              : (displayPort.protocols[0] ?? 'none')
                          }
                          onChange={(event) =>
                            patchDisplayPort({
                              protocols:
                                event.target.value === 'unknown'
                                  ? null
                                  : event.target.value === 'none'
                                    ? []
                                    : [event.target.value],
                            })
                          }
                        >
                          <option value="unknown">Non documenté</option>
                          <option value="displayport">DisplayPort</option>
                          <option value="hdmi">HDMI</option>
                          <option value="none">Aucun protocole vidéo</option>
                        </select>
                        <label className="field-label" htmlFor="screen-depth">
                          Profondeurs de couleur acceptées
                        </label>
                        <select
                          id="screen-depth"
                          value={displayPort.supportedColorDepths?.join(',') ?? 'unknown'}
                          onChange={(event) =>
                            patchDisplayPort({
                              supportedColorDepths:
                                event.target.value === 'unknown'
                                  ? null
                                  : (event.target.value.split(',').map(Number) as (8 | 10 | 12)[]),
                            })
                          }
                        >
                          <option value="unknown">Non documentées</option>
                          <option value="8">8 bits</option>
                          <option value="8,10">8 et 10 bits</option>
                          <option value="8,10,12">8, 10 et 12 bits</option>
                        </select>
                        <label className="field-label" htmlFor="screen-dsc">
                          Compression DSC de l’entrée
                        </label>
                        <select
                          id="screen-dsc"
                          value={String(displayPort.dsc)}
                          onChange={(event) =>
                            patchDisplayPort({
                              dsc:
                                event.target.value === 'null'
                                  ? null
                                  : event.target.value === 'true',
                            })
                          }
                        >
                          <option value="null">Non documentée</option>
                          <option value="false">Non prise en charge</option>
                          <option value="true">Prise en charge déclarée</option>
                        </select>
                        <p className="fine-print">
                          La présence de DSC ne suffit pas. Un profil commun se renseigne dans les
                          paramètres DSC avancés du Diagnostic.
                        </p>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={displayPort.modeListComplete !== false}
                            onChange={(event) =>
                              patchDisplayPort({ modeListComplete: event.target.checked })
                            }
                          />
                          <span>Liste exhaustive des modes</span>
                        </label>
                        {displayPort.modeListComplete === false && (
                          <p className="fine-print">
                            Un mode absent de cette liste reste non documenté, sans être déclaré
                            impossible.
                          </p>
                        )}
                        <div className="checkbox-heading">Modes déclarés sur cette entrée</div>
                        {VIDEO_MODES.map((item) => (
                          <label className="checkbox-row" key={item.id}>
                            <input
                              type="checkbox"
                              checked={displayPort.supportedModeIds?.includes(item.id) ?? false}
                              onChange={(event) =>
                                patchDisplayPort({
                                  supportedModeIds: event.target.checked
                                    ? [...(displayPort.supportedModeIds ?? []), item.id]
                                    : (displayPort.supportedModeIds ?? []).filter(
                                        (id) => id !== item.id,
                                      ),
                                })
                              }
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                        <button
                          className="inline-link"
                          onClick={() =>
                            patchDisplayPort({
                              supportedModeIds: null,
                              modeListComplete: false,
                              maxPayloadGbps: null,
                              supportedColorDepths: null,
                              protocols: null,
                              dsc: null,
                              dscProfiles: null,
                            })
                          }
                        >
                          Marquer les caractéristiques inconnues
                        </button>
                      </>
                    )}
                  </div>
                )}
              </aside>
            </div>
            <footer className="studio-footer">
              <span>
                <span className={`save-dot ${saveState.startsWith('Échec') ? 'error' : ''}`} />
                {saveState}
              </span>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Remplacer le setup actuel par la démonstration ? Vous pourrez annuler cette action.',
                    )
                  )
                    replace(createSetup());
                }}
              >
                <RotateCcw size={13} />
                Réinitialiser la démo
              </button>
            </footer>
          </section>
          <section className="diagnostics-section">
            <div className="diagnostics-heading">
              <div>
                <span className="section-kicker">COMPRENDRE, PUIS AJUSTER</span>
                <h2>Le diagnostic de votre installation</h2>
              </div>
              <span className="analysis-badge">
                <span />
                Analyse locale
              </span>
            </div>
            <div className="diagnostic-grid">
              <div className="diagnostic-explanations">
                {analysis.diagnostics.length ? (
                  analysis.diagnostics.map((diagnostic, index) => (
                    <article
                      className={`explanation ${diagnostic.status}`}
                      key={`${diagnostic.code}-${index}`}
                    >
                      <span className="explanation-icon">
                        {diagnostic.status === 'compatible' ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <Info size={18} />
                        )}
                      </span>
                      <div>
                        <h3>{diagnostic.title}</h3>
                        <p>{diagnostic.message}</p>
                        {diagnostic.suggestion && (
                          <p className="suggestion">
                            <ArrowUpRight size={13} />
                            {diagnostic.suggestion}
                          </p>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="explanation compatible">
                    <CheckCircle2 size={19} />
                    <div>
                      <h3>Votre chaîne répond à cet objectif</h3>
                      <p>
                        Les caractéristiques renseignées permettent de transporter le mode demandé
                        {analysis.transport === 'dsc'
                          ? ' avec le profil DSC renseigné.'
                          : ' sans compression DSC.'}
                      </p>
                    </div>
                  </article>
                )}
              </div>
              <div className="bandwidth-card">
                <div className="section-kicker">CAPACITÉ DE LA CHAÎNE</div>
                <div className="bandwidth-value">
                  {analysis.bottleneckGbps === null
                    ? '—'
                    : analysis.bottleneckGbps.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                  <span>Gbit/s utiles</span>
                </div>
                <div className="bandwidth-meter">
                  <div
                    style={{
                      width: `${analysis.requiredGbps && analysis.bottleneckGbps ? Math.min(100, (analysis.requiredGbps / analysis.bottleneckGbps) * 100) : 0}%`,
                    }}
                  />
                </div>
                <div className="bandwidth-detail">
                  <span>
                    {analysis.transport === 'dsc'
                      ? 'Avec DSC, FEC et marge'
                      : 'Budget non compressé'}
                  </span>
                  <strong>{format(analysis.requiredGbps)}</strong>
                </div>
                {analysis.transport === 'dsc' && (
                  <>
                    <div className="bandwidth-detail">
                      <span>Sans compression</span>
                      <strong>{format(analysis.uncompressedGbps ?? null)}</strong>
                    </div>
                    {analysis.dscProfile && (
                      <p className="dsc-budget-profile">
                        Profil DSC 1.2 · {analysis.dscProfile.bitsPerPixelX16 / 16} bpp ·{' '}
                        {analysis.dscProfile.sliceCount} tranches ·{' '}
                        {analysis.dscProfile.link.laneCount} voies DP.
                        <br />
                        {analysis.dscProfile.source.kind === 'user'
                          ? 'Déclaration utilisateur : '
                          : 'Référence : '}
                        {analysis.dscProfile.source.label}
                      </p>
                    )}
                  </>
                )}
                <p>
                  {analysis.bottleneckGbps === null
                    ? 'Le débit d’au moins un maillon n’est pas documenté. La capacité de toute la chaîne reste à confirmer.'
                    : 'Budget limité par le maillon le moins capable. Le contrôle du débit seul ne garantit pas l’affichage.'}
                </p>
              </div>
            </div>
            <details className="assumptions">
              <summary>
                <Info size={15} />
                Hypothèses & limites de cette analyse
                <ChevronRight size={14} />
              </summary>
              <ul>
                {analysis.assumptions.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <p>
                Le diagnostic concerne le signal vidéo, pas les performances en jeu. Les timings de
                démonstration sont des exemples. Pour le XENEON FLEX, les modes publiés sont sourcés
                et les timings retrouvés dans le firmware sont identifiés. DSC est calculé sur une
                liaison DisplayPort directe, avec un profil accepté par les deux ports. Les
                paramètres absents et les chemins complexes restent à vérifier.
              </p>
              <div className="assumption-controls">
                <label>
                  PC démarré et opérationnel
                  <select
                    aria-label="PC opérationnel"
                    value={String(setup.conditions.computerOperational)}
                    onChange={(event) =>
                      update((draft) => {
                        draft.conditions.computerOperational =
                          event.target.value === 'null' ? null : event.target.value === 'true';
                      })
                    }
                  >
                    <option value="true">Supposé oui</option>
                    <option value="false">Non</option>
                    <option value="null">Inconnu</option>
                  </select>
                </label>
                <label>
                  Écran alimenté
                  <select
                    aria-label="Écran alimenté"
                    value={String(setup.conditions.displayPowered)}
                    onChange={(event) =>
                      update((draft) => {
                        draft.conditions.displayPowered =
                          event.target.value === 'null' ? null : event.target.value === 'true';
                      })
                    }
                  >
                    <option value="true">Supposé oui</option>
                    <option value="false">Non</option>
                    <option value="null">Inconnu</option>
                  </select>
                </label>
              </div>
            </details>
          </section>
          <footer className="page-footer">
            <span>
              BranchLab <span className="footer-dot">·</span> Chaque connexion a une explication.
            </span>
            <div className="footer-links">
              <div className="app-version">
                <span aria-label={`Version de l’application : ${appVersion}`}>v{appVersion}</span>
                <button
                  aria-label={`Nouveautés de la version ${appVersion}`}
                  aria-haspopup="dialog"
                  onClick={() => setModal('changelog')}
                >
                  Nouveautés
                  <ChevronRight size={13} />
                </button>
              </div>
              <button onClick={() => setModal('sources')}>
                Voir les sources
                <ArrowUpRight size={13} />
              </button>
            </div>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Info size={18} />
          <span>{notice}</span>
          <button
            className="icon-button"
            onClick={() => setNotice('')}
            aria-label="Fermer la notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={modalClose}
              className="icon-button modal-close"
              aria-label="Fermer"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">BRANCHLAB</div>
            <h2 id="modal-title">
              {modal === 'sources'
                ? 'Des données, pas des suppositions.'
                : modal === 'guide'
                  ? 'Bienvenue dans votre atelier.'
                  : modal === 'changelog'
                    ? 'Les nouveautés de BranchLab'
                    : 'Les premières briques.'}
            </h2>
            {modal === 'sources' ? (
              <>
                <p>
                  Chaque fiche indique l’origine de ses caractéristiques. Les capacités non
                  documentées restent inconnues.
                </p>
                {sources.map((item, index) => (
                  <div className="source-item" key={index}>
                    <span className={`source-tag ${item.kind}`}>
                      {item.kind === 'manufacturer'
                        ? 'Constructeur'
                        : item.kind === 'standard'
                          ? 'Standard'
                          : item.kind === 'user'
                            ? 'Déclaration'
                            : 'Démonstration'}
                    </span>
                    <strong>{item.label}</strong>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        Consulter la source <ExternalLink size={13} />
                      </a>
                    )}
                    {item.checkedAt && (
                      <small>
                        Vérifié le {new Date(item.checkedAt).toLocaleDateString('fr-FR')}
                      </small>
                    )}
                  </div>
                ))}
                <p className="fine-print">
                  Les spécifications NVIDIA concernent le design de référence. Le débit utile
                  DisplayPort est dérivé des débits normalisés, pas une mesure de votre matériel.
                </p>
              </>
            ) : modal === 'changelog' ? (
              <Changelog currentVersion={appVersion} />
            ) : modal === 'guide' ? (
              <>
                <p>
                  Reproduisez une connexion et voyez comment chaque maillon influence le résultat.
                </p>
                <ol className="guide-list">
                  <li>
                    <strong>Choisissez une source.</strong> GeForce RTX 50, RTX 4090 ou carte mère
                    AM5. Les sorties de la carte mère dépendent du circuit graphique du processeur.
                  </li>
                  <li>
                    <strong>Renseignez votre écran.</strong> Cliquez sur sa carte pour adapter les
                    capacités de chaque entrée.
                  </li>
                  <li>
                    <strong>Reliez les bons ports.</strong> Faites glisser un point de sortie vers
                    un point d’entrée, puis vérifiez le câble.
                  </li>
                  <li>
                    <strong>Choisissez votre objectif.</strong> Le diagnostic distingue un mode
                    indisponible d’une absence totale de signal.
                  </li>
                </ol>
                <div className="info-box">
                  <Info size={18} />
                  <p>
                    Cette première version couvre une source et un écran en liaison directe. Les
                    autres familles de votre setup seront ajoutées progressivement.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p>
                  Choisissez une carte de référence pour remplacer la source actuelle. Votre écran
                  et ses caractéristiques sont conservés.
                </p>
                {GPU_CATALOG.map((item) => (
                  <button className="catalog-choice" key={item.id} onClick={() => setGpu(item.id)}>
                    <Cpu size={27} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </span>
                    <Plus size={18} />
                  </button>
                ))}
                {MOTHERBOARD_CATALOG.map((item) => (
                  <button
                    className="catalog-choice"
                    key={item.id}
                    onClick={() => setMotherboard(item.id)}
                  >
                    <Layers3 size={27} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </span>
                    <Plus size={18} />
                  </button>
                ))}
                <button className="catalog-choice" onClick={() => setDisplay('xeneon-flex')}>
                  <Monitor size={27} />
                  <span>
                    <strong>Corsair XENEON FLEX 45WQHD240</strong>
                    <small>45″ OLED · 3440 × 1440 · Jusqu’à 240 Hz · Fiche sourcée</small>
                  </span>
                  <Plus size={18} />
                </button>
                <button
                  className="catalog-choice"
                  onClick={() => {
                    selectDevice('display');
                    setModal(null);
                  }}
                >
                  <Monitor size={27} />
                  <span>
                    <strong>Configurer mon écran</strong>
                    <small>Entrées, capacité et modes acceptés</small>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
                <div className="info-box">
                  <Info size={16} />
                  <p>
                    Une seule liaison vidéo est analysée à la fois. Votre carte graphique et votre
                    carte mère restent enregistrées lorsque vous changez l’origine du signal.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {mode?.label} : {statusText[analysis.status]}
      </span>
    </div>
  );
}
