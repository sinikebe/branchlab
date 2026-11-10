/** Browser-independent hardware graph. Connector/protocol ids remain open strings. */
export type Status = 'compatible' | 'incompatible' | 'indeterminate';
export type GpuId = 'rtx4090' | 'rtx5080';
export type DisplayId = 'demo' | 'xeneon-flex';
export interface Source {
  kind: 'manufacturer' | 'standard' | 'user' | 'demo';
  label: string;
  url?: string;
  checkedAt?: string;
}
export interface Port {
  id: string;
  label: string;
  connector: string;
  role: 'source' | 'sink' | 'bidirectional';
  protocols: string[] | null;
  /** Effective link payload, not marketing/raw line rate. Null means unknown. */
  maxPayloadGbps: number | null;
  dsc: boolean | null;
  supportedModeIds: string[] | null;
  /** False for a curated manufacturer subset: an omitted mode is not a negative claim. */
  modeListComplete?: boolean;
  supportedColorDepths?: (8 | 10 | 12)[] | null;
  source: Source;
  /** Overrides source for individual characteristics derived from another reference. */
  evidence?: Record<string, Source>;
}
export interface InternalRoute {
  fromPortId: string;
  toPortId: string;
  supported: boolean | null;
  maxPayloadGbps: number | null;
  source: Source;
}
export interface Device {
  id: string;
  name: string;
  kind: 'gpu' | 'display' | 'adapter' | 'other';
  ports: Port[];
  routes: InternalRoute[];
  source: Source;
  catalogId?: string;
  display?: {
    diagonalInches: number;
    panelTechnology: string;
    nativeWidth: number;
    nativeHeight: number;
    maxRefreshHz: number;
    /** Panel specification, not a per-input/depth/mode negotiation guarantee. */
    colorDepthBits?: number;
    notes: string[];
    source: Source;
  };
}
export interface Cable {
  id: string;
  name: string;
  ends: [string, string];
  protocols: string[] | null;
  maxPayloadGbps: number | null;
  direction?: 'forward' | 'bidirectional';
  source: Source;
}
export interface Endpoint {
  deviceId: string;
  portId: string;
}
export interface Connection {
  id: string;
  from: Endpoint;
  to: Endpoint;
  cableId: string;
}
export interface Setup {
  schemaVersion: 1;
  name: string;
  devices: Device[];
  cables: Cable[];
  connections: Connection[];
  goal: {
    sourceDeviceId: string;
    displayDeviceId: string;
    modeId: string;
    colorDepth: 8 | 10 | 12;
  };
  conditions: { computerOperational: boolean | null; displayPowered: boolean | null };
}
export interface VideoMode {
  id: string;
  label: string;
  width: number;
  height: number;
  refreshHz: number;
  /** Includes timing blanking. A synthetic timing is explicitly identified. */
  pixelClockMHz: number | null;
  source: Source;
}
export interface Diagnostic {
  code: string;
  status: Status;
  title: string;
  message: string;
  componentIds: string[];
  suggestion?: string;
}
export interface ModeResult {
  mode: VideoMode;
  status: Status;
  requiredGbps: number | null;
  diagnostics: Diagnostic[];
}
export interface Analysis {
  status: Status;
  displayStatus: Status;
  requestedMode: VideoMode | null;
  availableModes: VideoMode[];
  modeResults: ModeResult[];
  diagnostics: Diagnostic[];
  path: string[];
  assumptions: string[];
  bottleneckGbps: number | null;
  requiredGbps: number | null;
}
