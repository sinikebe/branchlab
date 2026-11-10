import type { Device, GpuId, GpuSpecifications, Port, Source } from './types';

const checkedAt = '2026-11-10';
const nvidia = (model: string, path: string): Source => ({
  kind: 'manufacturer',
  label: `NVIDIA — ${model}, conception de référence`,
  url: `https://www.nvidia.com/en-us/geforce/graphics-cards/${path}/`,
  checkedAt,
});

export const NVIDIA_4090 = nvidia('GeForce RTX 4090', '40-series/rtx-4090');
export const NVIDIA_5090 = nvidia('GeForce RTX 5090', '50-series/rtx-5090');
export const NVIDIA_5080 = nvidia('GeForce RTX 5080', '50-series/rtx-5080');
export const NVIDIA_5070_FAMILY = nvidia(
  'GeForce RTX 5070 Ti et 5070',
  '50-series/rtx-5070-family',
);
export const NVIDIA_5060_FAMILY = nvidia(
  'GeForce RTX 5060 Ti et 5060',
  '50-series/rtx-5060-family',
);
export const NVIDIA_5050 = nvidia('GeForce RTX 5050', '50-series/rtx-5050');
export const NVIDIA_50_SERIES = nvidia('GeForce RTX série 50 — tableau comparatif', 'compare');
export const NVIDIA_ADA_ARCHITECTURE: Source = {
  kind: 'manufacturer',
  label: 'NVIDIA — architecture Ada, livre blanc v2.02, tableau 1 : bande passante RTX 4090',
  url: 'https://images.nvidia.com/aem-dam/Solutions/geforce/ada/nvidia-ada-gpu-architecture.pdf',
  checkedAt,
};
export const DP_SOURCE: Source = {
  kind: 'standard',
  label: 'VESA — Débits DisplayPort (charge utile après codage)',
  url: 'https://vesa.org/featured-articles/vesa-publishes-displayport-2-0-video-standard-enabling-support-for-beyond-8k-resolutions-higher-refresh-rates-for-4k-hdr-and-virtual-reality-applications/',
  checkedAt,
};

interface GpuOutputGroup {
  connector: 'displayport' | 'hdmi';
  count: number;
  version: string;
  linkRate?: string;
  maxPayloadGbps: number | null;
  dsc: boolean;
  supportedColorDepths: (8 | 10 | 12)[];
}
export interface GpuCatalogEntry {
  id: GpuId;
  name: string;
  shortName: string;
  description: string;
  url: string;
  source: Source;
  outputs: GpuOutputGroup[];
  specs: GpuSpecifications;
}

interface ReferenceModel {
  id: GpuId;
  shortName: string;
  source: Source;
  cudaCores: number;
  memoryGB: number;
  memoryBusBits: number;
  memoryBandwidthGBps: number;
  baseClockGHz: number;
  boostClockGHz: number;
  totalGraphicsPowerW: number;
  recommendedSystemPowerW: number;
  powerConnectionNotes: string[];
}

const partnerPowerNotes = [
  'NVIDIA indique un câble PCIe 8 broches ou un câble PCIe Gen 5 d’au moins 300 W, selon le modèle et son adaptateur.',
  'Vérifiez la prise présente sur la carte partenaire : ces options ne décrivent pas deux prises simultanées.',
];
const models: ReferenceModel[] = [
  {
    id: 'rtx5090',
    shortName: 'RTX 5090',
    source: NVIDIA_5090,
    cudaCores: 21760,
    memoryGB: 32,
    memoryBusBits: 512,
    memoryBandwidthGBps: 1792,
    baseClockGHz: 2.01,
    boostClockGHz: 2.41,
    totalGraphicsPowerW: 575,
    recommendedSystemPowerW: 1000,
    powerConnectionNotes: [
      'Quatre câbles PCIe 8 broches via adaptateur, ou un câble PCIe Gen 5 de 600 W.',
    ],
  },
  {
    id: 'rtx5080',
    shortName: 'RTX 5080',
    source: NVIDIA_5080,
    cudaCores: 10752,
    memoryGB: 16,
    memoryBusBits: 256,
    memoryBandwidthGBps: 960,
    baseClockGHz: 2.3,
    boostClockGHz: 2.62,
    totalGraphicsPowerW: 360,
    recommendedSystemPowerW: 850,
    powerConnectionNotes: [
      'Trois câbles PCIe 8 broches via adaptateur, ou un câble PCIe Gen 5 d’au moins 450 W.',
    ],
  },
  {
    id: 'rtx5070ti',
    shortName: 'RTX 5070 Ti',
    source: NVIDIA_5070_FAMILY,
    cudaCores: 8960,
    memoryGB: 16,
    memoryBusBits: 256,
    memoryBandwidthGBps: 896,
    baseClockGHz: 2.3,
    boostClockGHz: 2.45,
    totalGraphicsPowerW: 300,
    recommendedSystemPowerW: 750,
    powerConnectionNotes: [
      'Deux câbles PCIe 8 broches via adaptateur, ou un câble PCIe Gen 5 d’au moins 300 W selon la fiche NVIDIA.',
    ],
  },
  {
    id: 'rtx5070',
    shortName: 'RTX 5070',
    source: NVIDIA_5070_FAMILY,
    cudaCores: 6144,
    memoryGB: 12,
    memoryBusBits: 192,
    memoryBandwidthGBps: 672,
    baseClockGHz: 2.33,
    boostClockGHz: 2.51,
    totalGraphicsPowerW: 250,
    recommendedSystemPowerW: 650,
    powerConnectionNotes: [
      'Deux câbles PCIe 8 broches via adaptateur, ou un câble PCIe Gen 5.',
      'Le seuil du câble Gen 5 diffère entre la fiche NVIDIA et le guide Founders Edition : suivez le guide fourni avec votre carte.',
    ],
  },
  {
    id: 'rtx5060ti-16gb',
    shortName: 'RTX 5060 Ti · 16 Go',
    source: NVIDIA_5060_FAMILY,
    cudaCores: 4608,
    memoryGB: 16,
    memoryBusBits: 128,
    memoryBandwidthGBps: 448,
    baseClockGHz: 2.41,
    boostClockGHz: 2.57,
    totalGraphicsPowerW: 180,
    recommendedSystemPowerW: 600,
    powerConnectionNotes: partnerPowerNotes,
  },
  {
    id: 'rtx5060ti-8gb',
    shortName: 'RTX 5060 Ti · 8 Go',
    source: NVIDIA_5060_FAMILY,
    cudaCores: 4608,
    memoryGB: 8,
    memoryBusBits: 128,
    memoryBandwidthGBps: 448,
    baseClockGHz: 2.41,
    boostClockGHz: 2.57,
    totalGraphicsPowerW: 180,
    recommendedSystemPowerW: 600,
    powerConnectionNotes: partnerPowerNotes,
  },
  {
    id: 'rtx5060',
    shortName: 'RTX 5060',
    source: NVIDIA_5060_FAMILY,
    cudaCores: 3840,
    memoryGB: 8,
    memoryBusBits: 128,
    memoryBandwidthGBps: 448,
    baseClockGHz: 2.28,
    boostClockGHz: 2.5,
    totalGraphicsPowerW: 145,
    recommendedSystemPowerW: 550,
    powerConnectionNotes: partnerPowerNotes,
  },
  {
    id: 'rtx5050',
    shortName: 'RTX 5050',
    source: NVIDIA_5050,
    cudaCores: 2560,
    memoryGB: 8,
    memoryBusBits: 128,
    memoryBandwidthGBps: 320,
    baseClockGHz: 2.31,
    boostClockGHz: 2.57,
    totalGraphicsPowerW: 130,
    recommendedSystemPowerW: 550,
    powerConnectionNotes: partnerPowerNotes,
  },
  {
    id: 'rtx4090',
    shortName: 'RTX 4090',
    source: NVIDIA_4090,
    cudaCores: 16384,
    memoryGB: 24,
    memoryBusBits: 384,
    memoryBandwidthGBps: 1008,
    baseClockGHz: 2.23,
    boostClockGHz: 2.52,
    totalGraphicsPowerW: 450,
    recommendedSystemPowerW: 850,
    powerConnectionNotes: [
      'Trois câbles PCIe 8 broches via adaptateur, ou un câble PCIe Gen 5 d’au moins 450 W.',
    ],
  },
];

/** International desktop reference line-up; memory variants have separate stable identifiers. */
export const GPU_CATALOG: GpuCatalogEntry[] = models.map((model) => {
  const legacy = model.id === 'rtx4090';
  const displayPortVersion = legacy ? '1.4a' : '2.1b';
  const hdmiVersion = legacy ? '2.1a' : '2.1b';
  const { id, shortName, source, ...specs } = model;
  return {
    id,
    shortName,
    name: `NVIDIA GeForce ${shortName}`,
    source,
    url: source.url!,
    description: `Référence NVIDIA · 3 × DP ${displayPortVersion} · 1 × HDMI ${hdmiVersion}`,
    outputs: [
      {
        connector: 'displayport',
        count: 3,
        version: displayPortVersion,
        linkRate: legacy ? 'HBR3' : 'UHBR20',
        maxPayloadGbps: legacy ? 25.92 : 77.37,
        dsc: true,
        supportedColorDepths: [8, 10, 12],
      },
      {
        connector: 'hdmi',
        count: 1,
        version: hdmiVersion,
        maxPayloadGbps: null,
        dsc: true,
        supportedColorDepths: [8, 10, 12],
      },
    ],
    specs: {
      ...specs,
      powerConnectionNotes: [...specs.powerConnectionNotes],
      architecture: legacy ? 'Ada Lovelace' : 'Blackwell',
      memoryType: legacy ? 'GDDR6X' : model.id === 'rtx5050' ? 'GDDR6' : 'GDDR7',
      pcieGeneration: legacy ? '4.0' : '5.0',
      pcieLanes: null,
      maxDisplays: 4,
      displaySupportNotes: legacy
        ? [
            'NVIDIA annonce jusqu’à 4K à 240 Hz ou 8K à 60 Hz, HDR 12 bits, avec DSC sur DP ou HDMI.',
          ]
        : [
            'NVIDIA annonce jusqu’à 4K à 480 Hz ou 8K à 165 Hz par DisplayPort, et 8K à 120 Hz par HDMI, avec DSC.',
            'Ces plafonds NVIDIA dépendent du mode et de la configuration ; ils ne valident pas à eux seuls une chaîne écran/câble.',
          ],
      notes: [
        'Conception de référence NVIDIA. Connecteurs, fréquences, dimensions et alimentation peuvent varier selon la carte partenaire.',
        'Les débits DisplayPort indiqués supposent quatre voies. Le débit HDMI exact reste non documenté dans ce profil.',
        'La puissance d’alimentation recommandée concerne le système complet. Les prises et adaptateurs doivent être vérifiés sur votre modèle.',
        'Les spécifications de mémoire, de calcul, de PCIe et d’alimentation sont informatives ; elles ne prédisent pas les performances en jeu ni un bilan électrique.',
      ],
      source,
      evidence: {
        memoryBandwidthGBps: legacy ? NVIDIA_ADA_ARCHITECTURE : NVIDIA_50_SERIES,
        ...(id === 'rtx5070'
          ? {
              powerConnectionGuide: {
                kind: 'manufacturer' as const,
                label: 'NVIDIA — GeForce RTX 5070 Founders Edition, guide r1 (alimentation)',
                url: 'https://www.nvidia.com/content/geforce-gtx/geforce-rtx-5070-user-guide-r1.pdf',
                checkedAt,
              },
            }
          : {}),
      },
    },
  };
});

/** Recognize legacy snapshots conservatively; an unknown/imported card never becomes a 4090. */
export function getGpuId(device: Device): GpuId | null {
  if (device.kind !== 'gpu') return null;
  if (device.catalogId !== undefined)
    return GPU_CATALOG.find((entry) => entry.id === device.catalogId)?.id ?? null;
  if (device.source.kind !== 'manufacturer') return null;
  return (
    GPU_CATALOG.find(
      (entry) => ['rtx4090', 'rtx5080'].includes(entry.id) && entry.name === device.name,
    )?.id ?? null
  );
}

export function createGpu(id: GpuId): Device {
  const entry = GPU_CATALOG.find((item) => item.id === id);
  if (!entry) throw new Error('Référence de carte graphique inconnue');
  const ports: Port[] = entry.outputs.flatMap((output) =>
    Array.from({ length: output.count }, (_, index) => ({
      id: `${output.connector === 'displayport' ? 'dp' : 'hdmi'}-${index + 1}`,
      label: `${output.connector === 'displayport' ? `DisplayPort ${index + 1}` : 'HDMI'} · ${output.version}`,
      connector: output.connector,
      role: 'source' as const,
      protocols: [output.connector],
      maxPayloadGbps: output.maxPayloadGbps,
      dsc: output.dsc,
      supportedModeIds: null,
      supportedColorDepths: [...output.supportedColorDepths],
      source: entry.source,
      ...(output.maxPayloadGbps !== null ? { evidence: { maxPayloadGbps: DP_SOURCE } } : {}),
    })),
  );
  return structuredClone({
    id: 'gpu-1',
    name: entry.name,
    kind: 'gpu',
    catalogId: id,
    ports,
    routes: [],
    source: entry.source,
    gpu: entry.specs,
  });
}
