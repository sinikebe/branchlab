import { describe, expect, it } from 'vitest';
import { exportSetup, parseSetup } from '../storage';
import {
  analyzeSetup,
  createCable,
  createGpu,
  createMotherboard,
  createSetup,
  GPU_CATALOG,
  MOTHERBOARD_CATALOG,
  SETUP_SCHEMA,
  type GpuId,
  type MotherboardId,
  type Setup,
} from './index';

function hdmiSetup(id: 'rtx4090' | 'rtx5080'): Setup {
  const setup = createSetup(id);
  setup.goal.modeId = '1080p60';
  setup.connections[0].from.portId = 'hdmi-1';
  setup.connections[0].to.portId = 'hdmi-in';
  setup.cables[0] = createCable('hdmi');
  setup.cables[0].maxPayloadGbps = 14.4;
  return setup;
}

describe('sourced video-port references', () => {
  it('documents RTX 4090 FRL signalling separately from usable video capacity', () => {
    const hdmi = createGpu('rtx4090').ports.find((port) => port.connector === 'hdmi')!;
    expect(hdmi.videoReference).toMatchObject({
      version: expect.stringContaining('2.1a'),
      laneCount: 4,
      laneRateGbps: 12,
      rawBandwidthGbps: 48,
      source: { kind: 'manufacturer' },
    });
    expect(hdmi.videoReference?.transport).toMatch(/FRL/i);
    expect(hdmi.videoReference?.source.url).toMatch(/nvidia\.com/);
    expect(hdmi.videoReference?.notes.join(' ')).toMatch(/1\.2a/);
    expect(hdmi.videoReference?.notes.join(' ')).toMatch(/VRR/i);
    expect(hdmi.maxPayloadGbps).toBeNull();
    expect(hdmi.dscProfiles).toBeUndefined();
  });

  it('does not transfer the RTX 4090 FRL rate to the RTX 5080 from its HDMI version', () => {
    const hdmi = createGpu('rtx5080').ports.find((port) => port.connector === 'hdmi')!;
    expect(hdmi.videoReference).toMatchObject({
      version: expect.stringContaining('2.1b'),
      laneCount: null,
      laneRateGbps: null,
      rawBandwidthGbps: null,
      source: { kind: 'manufacturer' },
    });
    expect(hdmi.videoReference?.maxMode).toMatch(/480/);
    expect(hdmi.videoReference?.maxMode).toMatch(/120/);
    expect(hdmi.videoReference?.maxMode).toMatch(/12/);
    expect(hdmi.videoReference?.maxMode).toMatch(/DSC/i);
    expect(hdmi.maxPayloadGbps).toBeNull();
    expect(hdmi.dscProfiles).toBeUndefined();
  });

  it('limits new GeForce references to HDMI on the two requested GPU models', () => {
    for (const entry of GPU_CATALOG) {
      const card = createGpu(entry.id);
      for (const port of card.ports) {
        if (['rtx4090', 'rtx5080'].includes(entry.id) && port.connector === 'hdmi') {
          expect(port.videoReference).toBeDefined();
        } else {
          expect(port.videoReference).toBeUndefined();
        }
      }
    }
  });

  it('keeps the ASRock FRL8G declaration distinct from its USB-C DP Alt Mode', () => {
    const board = createMotherboard('asrock-b850-pro-a-wifi');
    expect(board.ports).toHaveLength(2);
    const hdmi = board.ports.find((port) => port.connector === 'hdmi')!;
    expect(hdmi.videoReference).toMatchObject({
      laneCount: 4,
      laneRateGbps: 8,
      rawBandwidthGbps: 32,
    });
    const usb = board.ports.find((port) => port.connector === 'usb-c')!;
    expect(usb.videoReference).toMatchObject({
      laneCount: null,
      laneRateGbps: 8.1,
      rawBandwidthGbps: null,
    });
    expect(usb.videoReference?.transport).toMatch(/HBR3/i);
    expect(usb.maxPayloadGbps).toBeNull();
  });

  it('documents both MSI USB4 video ports without using USB data rates as video bandwidth', () => {
    const board = createMotherboard('msi-mpg-x870e-carbon-wifi');
    expect(board.ports).toHaveLength(3);
    const hdmi = board.ports.find((port) => port.connector === 'hdmi')!;
    expect(hdmi.videoReference).toMatchObject({
      laneCount: null,
      laneRateGbps: null,
      rawBandwidthGbps: null,
    });
    const usbPorts = board.ports.filter((port) => port.connector === 'usb-c');
    expect(usbPorts).toHaveLength(2);
    for (const port of usbPorts) {
      expect(port.videoReference).toMatchObject({
        laneCount: null,
        laneRateGbps: 8.1,
        rawBandwidthGbps: null,
      });
      expect(port.videoReference?.transport).toMatch(/HBR3/i);
      expect(port.maxPayloadGbps).toBeNull();
    }
  });

  it.each(['rtx4090', 'rtx5080'] as const)(
    '%s retains HDMI reference information and its provenance through export/import',
    (id) => {
      const setup = hdmiSetup(id);
      expect(parseSetup(exportSetup(setup))).toEqual(setup);
      const restored = parseSetup(exportSetup(setup));
      expect(
        restored.devices[0].ports.find((port) => port.id === 'hdmi-1')?.videoReference,
      ).toEqual(setup.devices[0].ports.find((port) => port.id === 'hdmi-1')?.videoReference);
      expect(analyzeSetup(restored)).toEqual(analyzeSetup(setup));
    },
  );

  it.each(['asrock-b850-pro-a-wifi', 'msi-mpg-x870e-carbon-wifi'] as MotherboardId[])(
    '%s preserves all video reference declarations in portable snapshots',
    (id) => {
      const setup = createSetup();
      const board = createMotherboard(id);
      setup.devices.push(board);
      expect(parseSetup(exportSetup(setup))).toEqual(setup);
      for (const port of board.ports) {
        expect(port.videoReference?.source.kind).toBe('manufacturer');
        expect(port.videoReference?.source.url).toMatch(/^https:\/\//);
      }
    },
  );

  it('accepts older snapshots which have no video-reference metadata', () => {
    const setup = createSetup('rtx4090');
    setup.devices.push(createMotherboard('msi-mpg-x870e-carbon-wifi'));
    for (const device of setup.devices) {
      for (const port of device.ports) delete port.videoReference;
    }
    expect(parseSetup(exportSetup(setup))).toEqual(setup);
  });

  it('isolates editable notes and sources from catalogue data and other instances', () => {
    const gpuCatalogue = structuredClone(GPU_CATALOG);
    const boardCatalogue = structuredClone(MOTHERBOARD_CATALOG);
    for (const id of ['rtx4090', 'rtx5080'] as GpuId[]) {
      const card = createGpu(id);
      const untouched = createGpu(id);
      const reference = card.ports.find((port) => port.connector === 'hdmi')!.videoReference!;
      reference.notes.push('Déclaration propre à cet exemplaire');
      reference.source.label = 'Référence personnelle';
      reference.rawBandwidthGbps = 1;
      expect(createGpu(id)).toEqual(untouched);
    }
    const board = createMotherboard('msi-mpg-x870e-carbon-wifi');
    const untouched = createMotherboard('msi-mpg-x870e-carbon-wifi');
    board.ports[1].videoReference!.notes.push('Déclaration propre à la première prise');
    board.ports[1].videoReference!.source.label = 'Référence personnelle';
    expect(board.ports[2].videoReference!.notes).not.toContain(
      'Déclaration propre à la première prise',
    );
    expect(createMotherboard('msi-mpg-x870e-carbon-wifi')).toEqual(untouched);
    expect(GPU_CATALOG).toEqual(gpuCatalogue);
    expect(MOTHERBOARD_CATALOG).toEqual(boardCatalogue);
  });

  it('does not turn raw FRL bandwidth into a known end-to-end video capacity', () => {
    const setup = hdmiSetup('rtx4090');
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.bottleneckGbps).toBeNull();
    const capacity = result.diagnostics.find(
      (diagnostic) =>
        diagnostic.code === 'port-capacity-unknown' && diagnostic.componentIds.includes('gpu-1'),
    );
    expect(capacity).toBeDefined();
    expect(capacity?.message).toContain('48');
    expect(capacity?.message).toMatch(/utile|utilisable/i);
    expect(result.dscProfile).toBeNull();
    setup.devices[0].ports.find((port) => port.id === 'hdmi-1')!.videoReference!.rawBandwidthGbps =
      960;
    const changed = analyzeSetup(setup);
    expect(changed.status).toBe(result.status);
    expect(changed.requiredGbps).toBe(result.requiredGbps);
    expect(changed.bottleneckGbps).toBeNull();
    expect(changed.dscProfile).toBeNull();
  });

  it('rejects malformed video-reference values and unsafe evidence URLs on import', () => {
    const setup = hdmiSetup('rtx4090');
    const reference = setup.devices[0].ports.find((port) => port.id === 'hdmi-1')!.videoReference!;
    reference.rawBandwidthGbps = -1;
    expect(SETUP_SCHEMA.safeParse(setup).success).toBe(false);
    reference.rawBandwidthGbps = 48;
    reference.laneCount = 0;
    expect(SETUP_SCHEMA.safeParse(setup).success).toBe(false);
    reference.laneCount = 4;
    reference.source.url = 'javascript:alert(1)';
    expect(SETUP_SCHEMA.safeParse(setup).success).toBe(false);
  });
});
