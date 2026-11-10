import type { Cable, Device, GpuId, Port, Setup, Source, VideoMode } from './types';

const checkedAt = '2026-11-10';
export const NVIDIA_4090: Source = {
  kind: 'manufacturer',
  label: 'NVIDIA — GeForce RTX 4090, design de référence',
  checkedAt,
  url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/',
};
export const NVIDIA_5080: Source = {
  kind: 'manufacturer',
  label: 'NVIDIA — GeForce RTX 5080, design de référence',
  checkedAt,
  url: 'https://www.nvidia.com/en-gb/geforce/graphics-cards/50-series/rtx-5080/',
};
export const DP_SOURCE: Source = {
  kind: 'standard',
  label: 'VESA — Débits DisplayPort (charge utile après codage)',
  checkedAt,
  url: 'https://vesa.org/featured-articles/vesa-publishes-displayport-2-0-video-standard-enabling-support-for-beyond-8k-resolutions-higher-refresh-rates-for-4k-hdr-and-virtual-reality-applications/',
};
export const DEMO_SOURCE: Source = {
  kind: 'demo',
  label: 'Profil fictif de démonstration — aucune référence commerciale',
};
export const USER_SOURCE: Source = {
  kind: 'user',
  label: 'Caractéristique déclarée par l’utilisateur',
};
export const VIDEO_MODES: VideoMode[] = [
  {
    id: '1080p60',
    label: 'Full HD · 60 Hz',
    width: 1920,
    height: 1080,
    refreshHz: 60,
    pixelClockMHz: 148.5,
    source: DEMO_SOURCE,
  },
  {
    id: '1440p60',
    label: 'QHD · 60 Hz',
    width: 2560,
    height: 1440,
    refreshHz: 60,
    pixelClockMHz: 241.5,
    source: DEMO_SOURCE,
  },
  {
    id: '1440p144',
    label: 'QHD · 144 Hz',
    width: 2560,
    height: 1440,
    refreshHz: 144,
    pixelClockMHz: 586,
    source: DEMO_SOURCE,
  },
  {
    id: '4k60',
    label: '4K · 60 Hz',
    width: 3840,
    height: 2160,
    refreshHz: 60,
    pixelClockMHz: 594,
    source: DEMO_SOURCE,
  },
  {
    id: '4k120',
    label: '4K · 120 Hz',
    width: 3840,
    height: 2160,
    refreshHz: 120,
    pixelClockMHz: 1188,
    source: DEMO_SOURCE,
  },
  {
    id: '4k144',
    label: '4K · 144 Hz',
    width: 3840,
    height: 2160,
    refreshHz: 144,
    pixelClockMHz: 1305,
    source: DEMO_SOURCE,
  },
  {
    id: '4k240',
    label: '4K · 240 Hz',
    width: 3840,
    height: 2160,
    refreshHz: 240,
    pixelClockMHz: 2376,
    source: DEMO_SOURCE,
  },
];
export const GPU_CATALOG: { id: GpuId; name: string; description: string; url: string }[] = [
  {
    id: 'rtx4090',
    name: 'NVIDIA GeForce RTX 4090',
    description: 'Référence NVIDIA · 3 × DP 1.4a · 1 × HDMI 2.1a',
    url: NVIDIA_4090.url!,
  },
  {
    id: 'rtx5080',
    name: 'NVIDIA GeForce RTX 5080',
    description: 'Référence NVIDIA · 3 × DP 2.1b UHBR20 · 1 × HDMI 2.1b',
    url: NVIDIA_5080.url!,
  },
];

export function createGpu(id: GpuId): Device {
  const source = id === 'rtx4090' ? NVIDIA_4090 : NVIDIA_5080;
  const payload = id === 'rtx4090' ? 25.92 : 77.37;
  const ports: Port[] = [1, 2, 3].map((n) => ({
    id: `dp-${n}`,
    label: `DisplayPort ${n} · ${id === 'rtx4090' ? '1.4a' : '2.1b'}`,
    connector: 'displayport',
    role: 'source',
    protocols: ['displayport'],
    maxPayloadGbps: payload,
    dsc: true,
    supportedModeIds: null,
    supportedColorDepths: [8, 10, 12],
    source,
    evidence: { maxPayloadGbps: DP_SOURCE },
  }));
  ports.push({
    id: 'hdmi-1',
    label: `HDMI · ${id === 'rtx4090' ? '2.1a' : '2.1b'}`,
    connector: 'hdmi',
    role: 'source',
    protocols: ['hdmi'],
    maxPayloadGbps: null,
    dsc: true,
    supportedModeIds: null,
    supportedColorDepths: [8, 10, 12],
    source,
  });
  return {
    id: 'gpu-1',
    name: GPU_CATALOG.find((gpu) => gpu.id === id)!.name,
    kind: 'gpu',
    ports,
    routes: [],
    source,
  };
}

export const CABLE_PROFILES: {
  id: string;
  name: string;
  connector: string;
  payload: number | null;
}[] = [
  {
    id: 'dp-hbr3',
    name: 'DisplayPort · profil HBR3 déclaré',
    connector: 'displayport',
    payload: 25.92,
  },
  {
    id: 'dp-uhbr20',
    name: 'DisplayPort · profil UHBR20 déclaré',
    connector: 'displayport',
    payload: 77.37,
  },
  {
    id: 'dp-hbr2',
    name: 'DisplayPort · profil HBR2 déclaré',
    connector: 'displayport',
    payload: 17.28,
  },
  {
    id: 'dp-unknown',
    name: 'DisplayPort · capacité inconnue',
    connector: 'displayport',
    payload: null,
  },
  { id: 'hdmi', name: 'HDMI · capacité inconnue', connector: 'hdmi', payload: null },
];
export function createCable(profileId: string, id = 'cable-1'): Cable {
  const profile = CABLE_PROFILES.find((entry) => entry.id === profileId);
  if (!profile) throw new Error('Profil de câble inconnu');
  return {
    id,
    name: profile.name,
    ends: [profile.connector, profile.connector],
    protocols: [profile.connector],
    maxPayloadGbps: profile.payload,
    direction: 'bidirectional',
    source: USER_SOURCE,
  };
}

export function createSetup(gpu: GpuId = 'rtx4090'): Setup {
  const allModes = VIDEO_MODES.map((mode) => mode.id);
  const display: Device = {
    id: 'display-1',
    name: 'Écran de démonstration 4K',
    kind: 'display',
    source: DEMO_SOURCE,
    routes: [],
    ports: [
      {
        id: 'dp-in',
        label: 'DisplayPort · entrée',
        connector: 'displayport',
        role: 'sink',
        protocols: ['displayport'],
        maxPayloadGbps: 77.37,
        dsc: null,
        supportedModeIds: allModes,
        supportedColorDepths: [8, 10],
        source: DEMO_SOURCE,
      },
      {
        id: 'hdmi-in',
        label: 'HDMI · entrée',
        connector: 'hdmi',
        role: 'sink',
        protocols: ['hdmi'],
        maxPayloadGbps: null,
        dsc: null,
        supportedModeIds: ['1080p60', '1440p60', '4k60'],
        supportedColorDepths: [8, 10],
        source: DEMO_SOURCE,
      },
    ],
  };
  return {
    schemaVersion: 1,
    name: 'Mon premier setup',
    devices: [createGpu(gpu), display],
    cables: [createCable('dp-hbr3')],
    connections: [
      {
        id: 'connection-1',
        from: { deviceId: 'gpu-1', portId: 'dp-1' },
        to: { deviceId: 'display-1', portId: 'dp-in' },
        cableId: 'cable-1',
      },
    ],
    goal: { sourceDeviceId: 'gpu-1', displayDeviceId: 'display-1', modeId: '4k60', colorDepth: 8 },
    conditions: { computerOperational: true, displayPowered: true },
  };
}
