import type { Device, MotherboardId, MotherboardSpecifications, Port, Source } from './types';

const checkedAt = '2026-11-10';
export const ASROCK_B850_SOURCE: Source = {
  kind: 'manufacturer',
  label: 'ASRock — B850 Pro-A WiFi, caractéristiques officielles',
  url: 'https://www.asrock.com/mb/AMD/B850%20Pro-A%20WiFi/index.asp#Specification',
  checkedAt,
};
export const ASROCK_B850_MANUAL: Source = {
  kind: 'manufacturer',
  label: 'ASRock — B850 Pro-A WiFi, manuel, spécifications p. 2–5, prises p. 9–10, schéma p. 11',
  url: 'https://download.asrock.com/Manual/B850%20Pro-A%20WiFi.pdf',
  checkedAt,
};
export const MSI_X870E_SOURCE: Source = {
  kind: 'manufacturer',
  label: 'MSI — MPG X870E CARBON WIFI, tableau de caractéristiques du modèle AM5',
  url: 'https://www.msi.com/Motherboard/MPG-X870E-CARBON-WIFI/Specification',
  checkedAt,
};
export const MSI_X870E_MANUAL: Source = {
  kind: 'manufacturer',
  label: 'MSI — MPG X870E CARBON WIFI, manuel, p. 17–21 et 24–25',
  url: 'https://download.msi.com/archive/mnu_exe/mb/MPGX870ECARBONWIFI_English.pdf',
  checkedAt,
};
export const MSI_X870E_DATASHEET: Source = {
  kind: 'manufacturer',
  label: 'MSI — MPG X870E CARBON WIFI, fiche synthétique : mémoire 8400+ MT/s OC',
  url: 'https://storage-asset.msi.com/datasheet/mb/id/MPG-X870E-CARBON-WIFI.pdf',
  checkedAt,
};

export interface MotherboardCatalogEntry {
  id: MotherboardId;
  name: string;
  shortName: string;
  description: string;
  url: string;
  source: Source;
  specs: MotherboardSpecifications;
  outputs: Port[];
}

function videoPort(id: string, label: string, connector: string, source: Source): Port {
  return {
    id,
    label,
    connector,
    role: 'source',
    protocols: [connector === 'hdmi' ? 'hdmi' : 'displayport'],
    maxPayloadGbps: null,
    dsc: null,
    dscProfiles: null,
    supportedModeIds: null,
    modeListComplete: false,
    supportedColorDepths: null,
    source,
  };
}

export const MOTHERBOARD_CATALOG: MotherboardCatalogEntry[] = [
  {
    id: 'asrock-b850-pro-a-wifi',
    name: 'ASRock B850 Pro-A WiFi',
    shortName: 'B850 Pro-A WiFi',
    description: 'ATX · AM5 · DDR5 · Wi-Fi 6E · LAN 2,5 Gb/s · HDMI et USB-C vidéo',
    url: ASROCK_B850_SOURCE.url!,
    source: ASROCK_B850_SOURCE,
    specs: {
      manufacturer: 'ASRock',
      socket: 'AM5',
      chipset: 'AMD B850',
      formFactor: 'ATX · 305 × 244 mm',
      cpuSupport: [
        'AMD Ryzen de bureau séries 9000, 8000 et 7000 ; vérifier la liste CPU et le BIOS du modèle.',
      ],
      memory: {
        type: 'DDR5 DIMM · double canal · EXPO / XMP',
        slots: 4,
        maxCapacityGB: 256,
        maxOcMtps: 8000,
        notes: [
          '8000+ MT/s annoncé en overclocking ; résultat dépendant du processeur, des barrettes, de leur organisation et du BIOS.',
        ],
      },
      expansionSlots: [
        'PCIE1 : emplacement physique x16, jusqu’à PCIe 5.0 x16 avec Ryzen 9000/7000 ; PCIe 4.0 x8 avec Phoenix 1 ou x4 avec Phoenix 2.',
        'PCIE2 : emplacement physique x16, câblé PCIe 4.0 x4 ; désactivé si M2_3 est occupé.',
      ],
      storage: [
        'M2_1 : jusqu’à PCIe 5.0 x4, PCIe 4.0 x4 avec Ryzen 8000.',
        'M2_2 : PCIe 4.0 x4, réduit à x2 avec Phoenix 2 ; M2_3 : PCIe 4.0 x4, partagé avec PCIE2.',
        'M2_4 : PCIe 3.0 x4, réduit à x2 si SATA3_1 ou SATA3_2 est occupé.',
        '4 connecteurs SATA 6 Gb/s.',
      ],
      rearConnectors: [
        '1 HDMI 2.1 et 1 USB-C 5 Gb/s avec DisplayPort Alt Mode ; aucun DisplayPort au format standard.',
        '1 autre USB-C 10 Gb/s, sans fonction vidéo documentée.',
        '4 USB-A 5 Gb/s et 6 USB-A 2.0.',
        '1 RJ45 2,5 Gb/s, 2 prises d’antenne Wi-Fi, 3 jacks audio analogiques et bouton BIOS Flashback.',
      ],
      internalConnectors: [
        'Alimentation : 1 ATX 24 broches et 2 ATX12V 8 broches.',
        'USB : 1 connecteur frontal USB-C 20 Gb/s, 1 connecteur pour 2 USB 5 Gb/s et 2 connecteurs pour 3 USB 2.0.',
        'Ventilation : 2 CPU, 4 châssis et 1 pompe AIO, tous à 4 broches.',
        'Audio frontal, 1 RGB 12 V, 3 ARGB 5 V, TPM, connecteurs de panneau avant et haut-parleur.',
      ],
      network: [
        'Ethernet Realtek Dragon RTL8125BG · 2,5 Gb/s',
        'Wi-Fi 6E · 2×2 · 2,4 / 5 / 6 GHz',
        'Bluetooth 5.2',
      ],
      audio: ['Realtek ALC897 · audio HD 7.1 ; 3 jacks arrière.'],
      displayNotes: [
        'HDMI 2.1 TMDS / FRL8G : plafond annoncé 3840 × 2160 à 120 Hz, selon le processeur.',
        'USB-C arrière 5 Gb/s : DisplayPort 1.4a HBR3, plafond annoncé 3840 × 2160 à 60 Hz ; le connecteur 10 Gb/s n’est pas cette sortie.',
        'La vidéo provient du circuit graphique intégré au processeur. Sa présence, son activation et ses limites restent à documenter.',
      ],
      notes: [
        'Les débits USB sont des débits de données. Le budget vidéo, le nombre de voies DP, les profondeurs de couleur et les profils DSC ne sont pas établis ici.',
      ],
      source: ASROCK_B850_SOURCE,
      evidence: {
        expansionSlots: ASROCK_B850_MANUAL,
        storage: ASROCK_B850_MANUAL,
        rearConnectors: ASROCK_B850_MANUAL,
        internalConnectors: ASROCK_B850_MANUAL,
        displayNotes: ASROCK_B850_MANUAL,
      },
    },
    outputs: [
      videoPort('hdmi-out', 'HDMI 2.1 · TMDS / FRL8G · selon CPU', 'hdmi', ASROCK_B850_SOURCE),
      videoPort(
        'usb-c-dp-out',
        'USB-C 5 Gb/s · DP 1.4a HBR3 · selon CPU',
        'usb-c',
        ASROCK_B850_SOURCE,
      ),
    ],
  },
  {
    id: 'msi-mpg-x870e-carbon-wifi',
    name: 'MSI MPG X870E CARBON WIFI',
    shortName: 'MPG X870E CARBON WIFI',
    description: 'ATX · AM5 · DDR5 · Wi-Fi 7 · LAN 5 et 2,5 Gb/s · HDMI et deux USB4 vidéo',
    url: MSI_X870E_SOURCE.url!,
    source: MSI_X870E_SOURCE,
    specs: {
      manufacturer: 'MSI',
      socket: 'AM5',
      chipset: 'AMD X870E',
      formFactor: 'ATX · 305 × 244 mm',
      cpuSupport: [
        'AMD Ryzen de bureau séries 9000, 8000 et 7000 ; vérifier la liste CPU et le BIOS du modèle.',
      ],
      memory: {
        type: 'DDR5 UDIMM · double canal · EXPO',
        slots: 4,
        maxCapacityGB: 256,
        maxOcMtps: 9000,
        notes: [
          'La fiche actuelle présente une plage OC allant jusqu’à 9000 MT/s, mais son détail Ryzen 9000 et la fiche synthétique indiquent 8400+ MT/s en 1DPC 1R.',
          'Les autres organisations Ryzen 9000 détaillées sont annoncées à 6400+ MT/s. Aucun de ces plafonds OC n’est garanti : CPU, barrettes, disposition et BIOS interviennent.',
        ],
      },
      expansionSlots: [
        'PCI_E1 : physique x16, jusqu’à PCIe 5.0 x16 CPU ; PCI_E2 : physique x16, jusqu’à PCIe 5.0 x4 CPU ; PCI_E3 : physique x16, PCIe 4.0 x4 chipset.',
        'Avec Ryzen 9000/7000, PCI_E1, PCI_E2 et M2_2 partagent les voies : x16 seul ou x8 / x4 / x4.',
        'Ryzen 8000 : PCI_E2 et M2_2 indisponibles ; PCI_E1 en PCIe 4.0 x8 avec 8700/8600/8400, ou x4 avec 8500/8300.',
      ],
      storage: [
        'M2_1 et M2_2 : jusqu’à PCIe 5.0 x4 ; M2_3 et M2_4 : PCIe 4.0 x4.',
        'Ryzen 8000 : M2_1 en PCIe 4.0 x4 et M2_2 indisponible. M2_2 partage les voies avec PCI_E1 / PCI_E2 sur Ryzen 9000/7000.',
        '4 connecteurs SATA 6 Gb/s.',
      ],
      rearConnectors: [
        '1 HDMI 2.1 FRL et 2 USB-C USB4 40 Gb/s avec DisplayPort ; aucun DisplayPort au format standard.',
        '2 autres USB-C 10 Gb/s, sans fonction vidéo documentée, et 9 USB-A 10 Gb/s.',
        '2 RJ45 (5 et 2,5 Gb/s), 2 prises d’antenne Wi-Fi, sortie audio et entrée micro sur jacks, S/PDIF optique.',
        'Boutons Flash BIOS, Clear CMOS et Smart Button.',
      ],
      internalConnectors: [
        'Alimentation : 1 ATX 24 broches, 2 CPU 8 broches et 1 PCIe 8 broches.',
        'USB : 1 connecteur frontal USB-C 20 Gb/s, 2 connecteurs pour 4 USB 5 Gb/s et 2 connecteurs pour 4 USB 2.0.',
        'Ventilation : 1 CPU, 5 système et 1 pompe/système, tous à 4 broches.',
        'Éclairage : 1 RGB 12 V à 4 broches et 3 ARGB Gen2 5 V à 3 broches.',
        'Audio frontal, 2 connecteurs de panneau système, intrusion châssis, sonde thermique et EZ Conn-Header V2.',
      ],
      network: [
        'Ethernet Realtek RTL8126 · 5 Gb/s',
        'Ethernet Realtek RTL8125 · 2,5 Gb/s',
        'Wi-Fi 7',
        'Bluetooth 5.4',
      ],
      audio: ['Realtek ALC4080 · audio HD 7.1 ; jacks Line-out / Mic-in et S/PDIF optique.'],
      displayNotes: [
        'HDMI 2.1 FRL : plafond annoncé 7680 × 4320 à 60 Hz, selon le processeur ; débit FRL exact non établi ici.',
        'Chacune des deux prises USB4 arrière 40 Gb/s fournit DisplayPort 1.4 HBR3 sur USB-C, avec un plafond annoncé de 3840 × 2160 à 60 Hz.',
        'La vidéo exige le circuit graphique intégré au processeur ; une GeForce installée n’alimente pas automatiquement ces sorties.',
      ],
      notes: [
        'Le débit USB4 40 Gb/s ne définit pas le budget vidéo disponible. Nombre de voies DP, profondeur de couleur et profils DSC restent inconnus.',
      ],
      source: MSI_X870E_SOURCE,
      evidence: {
        expansionSlots: MSI_X870E_MANUAL,
        storage: MSI_X870E_MANUAL,
        rearConnectors: MSI_X870E_MANUAL,
        internalConnectors: MSI_X870E_MANUAL,
        displayNotes: MSI_X870E_MANUAL,
        memory: MSI_X870E_SOURCE,
        memoryAlternative: MSI_X870E_DATASHEET,
      },
    },
    outputs: [
      videoPort('hdmi-out', 'HDMI 2.1 FRL · selon CPU', 'hdmi', MSI_X870E_SOURCE),
      videoPort(
        'usb4-1-out',
        'USB4 n° 1 · USB-C · DP 1.4 HBR3 · selon CPU',
        'usb-c',
        MSI_X870E_SOURCE,
      ),
      videoPort(
        'usb4-2-out',
        'USB4 n° 2 · USB-C · DP 1.4 HBR3 · selon CPU',
        'usb-c',
        MSI_X870E_SOURCE,
      ),
    ],
  },
];

export function createMotherboard(id: MotherboardId): Device {
  const entry = MOTHERBOARD_CATALOG.find((item) => item.id === id);
  if (!entry) throw new Error(`Carte mère inconnue : ${id}`);
  return structuredClone({
    id: 'motherboard-1',
    name: entry.name,
    kind: 'motherboard',
    catalogId: entry.id,
    ports: entry.outputs,
    routes: [],
    motherboard: entry.specs,
    source: entry.source,
  });
}

export function getMotherboardId(device: Device): MotherboardId | null {
  if (device.kind !== 'motherboard') return null;
  return MOTHERBOARD_CATALOG.find((entry) => entry.id === device.catalogId)?.id ?? null;
}
