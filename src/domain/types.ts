/** Browser-independent hardware graph. Connector/protocol ids remain open strings. */
export type Status = 'compatible' | 'incompatible' | 'indeterminate';
export type GpuId =
  | 'rtx4090'
  | 'rtx5090'
  | 'rtx5080'
  | 'rtx5070ti'
  | 'rtx5070'
  | 'rtx5060ti-16gb'
  | 'rtx5060ti-8gb'
  | 'rtx5060'
  | 'rtx5050';
export type DisplayId = 'demo' | 'xeneon-flex';
export interface Source {
  kind: 'manufacturer' | 'standard' | 'user' | 'demo';
  label: string;
  url?: string;
  checkedAt?: string;
}
/** Informational reference specifications, not a power/FPS/multi-display simulation. */
export interface GpuSpecifications {
  architecture: string;
  cudaCores: number;
  memoryGB: number;
  memoryType: string;
  memoryBusBits: number;
  memoryBandwidthGBps: number | null;
  baseClockGHz: number | null;
  boostClockGHz: number | null;
  pcieGeneration: string | null;
  pcieLanes: number | null;
  totalGraphicsPowerW: number | null;
  recommendedSystemPowerW: number | null;
  /** Cable/adapter options; these do not imply multiple physical sockets on the GPU. */
  powerConnectionNotes: string[];
  maxDisplays: number | null;
  displaySupportNotes: string[];
  notes: string[];
  source: Source;
  evidence?: Record<string, Source>;
}
/** A configuration explicitly accepted for this RGB timing by the declaring port.
 * This contract includes its encoder/decoder throughput and buffer constraints;
 * general DSC support alone does not establish acceptance of a profile.
 * One/two-lane profiles are preserved, but whole-chain validation currently
 * requires four lanes: aggregate payload fields do not specify a per-lane rate.
 */
export interface DscProfile {
  modeId: string;
  colorDepth: 8 | 10 | 12;
  version: '1.2';
  bitsPerPixelX16: number;
  sliceCount: number;
  sliceHeight: number;
  link: { encoding: '8b10b'; laneCount: 1 | 2 | 4; fec: true };
  source: Source;
}
export interface Port {
  id: string;
  label: string;
  connector: string;
  role: 'source' | 'sink' | 'bidirectional';
  protocols: string[] | null;
  /** Effective aggregate link payload, not a raw or per-lane rate. Null means unknown. */
  maxPayloadGbps: number | null;
  dsc: boolean | null;
  dscProfiles?: DscProfile[] | null;
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
  gpu?: GpuSpecifications;
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
  /** Aggregate payload only; this cannot establish the capacity on fewer DP lanes. */
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
    /** Omitted in older projects: DSC is allowed, never assumed negotiated. */
    compression?: 'auto' | 'off';
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
  transport?: 'uncompressed' | 'dsc' | null;
  uncompressedGbps?: number | null;
  dscProfile?: DscProfile | null;
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
  transport?: 'uncompressed' | 'dsc' | null;
  uncompressedGbps?: number | null;
  dscProfile?: DscProfile | null;
}
