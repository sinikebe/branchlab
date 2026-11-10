import { describe, expect, it } from 'vitest';
import { exportSetup, parseSetup } from '../storage';
import {
  analyzeSetup,
  createCable,
  createMotherboard,
  createSetup,
  getMotherboardId,
  MOTHERBOARD_CATALOG,
  SETUP_SCHEMA,
  USER_SOURCE,
  type MotherboardId,
} from './index';

const ids: MotherboardId[] = ['asrock-b850-pro-a-wifi', 'msi-mpg-x870e-carbon-wifi'];

/** Leave the discrete GPU installed, while the HDMI cable actually uses the motherboard. */
function motherboardSetup(id: MotherboardId) {
  const setup = createSetup('rtx5090');
  const board = createMotherboard(id);
  setup.devices.push(board);
  setup.goal.sourceDeviceId = board.id;
  setup.goal.modeId = '1080p60';
  setup.connections[0].from = { deviceId: board.id, portId: 'hdmi-out' };
  setup.connections[0].to.portId = 'hdmi-in';
  setup.cables[0] = createCable('hdmi');
  return setup;
}

describe('AM5 motherboard references', () => {
  it('keeps the ASRock B850 and MSI X870E identities distinct from similar names', () => {
    expect(MOTHERBOARD_CATALOG.map((entry) => entry.id)).toEqual(ids);
    const asrock = createMotherboard(ids[0]);
    const msi = createMotherboard(ids[1]);
    expect(asrock.name).toBe('ASRock B850 Pro-A WiFi');
    expect(msi.name).toBe('MSI MPG X870E CARBON WIFI');
    expect(msi.name).not.toContain('MAX');
    expect(asrock.motherboard?.manufacturer).toBe('ASRock');
    expect(msi.motherboard?.manufacturer).toBe('MSI');
    for (const board of [asrock, msi]) {
      expect(board.kind).toBe('motherboard');
      expect(board.motherboard?.socket).toBe('AM5');
      expect(board.motherboard?.formFactor).toContain('ATX');
      expect(board.motherboard?.memory.slots).toBe(4);
      expect(board.motherboard?.memory.maxCapacityGB).toBe(256);
      expect(getMotherboardId(board)).toBe(board.catalogId);
    }
    expect(asrock.motherboard?.network.join(' ')).toContain('Wi-Fi 6E');
    expect(msi.motherboard?.network.join(' ')).toContain('Wi-Fi 7');
  });

  it('exposes only the two ASRock video sockets and the three MSI video sockets', () => {
    const asrock = createMotherboard(ids[0]);
    const msi = createMotherboard(ids[1]);
    expect(asrock.ports.map((port) => port.connector)).toEqual(['hdmi', 'usb-c']);
    expect(msi.ports.map((port) => port.connector)).toEqual(['hdmi', 'usb-c', 'usb-c']);
    for (const board of [asrock, msi]) {
      expect(new Set(board.ports.map((port) => port.id)).size).toBe(board.ports.length);
      expect(board.ports.some((port) => port.connector === 'displayport')).toBe(false);
      expect(board.ports.every((port) => port.role === 'source')).toBe(true);
      for (const usb of board.ports.filter((port) => port.connector === 'usb-c')) {
        expect(usb.protocols).toEqual(['displayport']);
      }
    }
  });

  it.each(ids)('%s does not invent video bandwidth, color depths, timing lists or DSC', (id) => {
    const board = createMotherboard(id);
    for (const port of board.ports) {
      expect(port.maxPayloadGbps).toBeNull();
      expect(port.dsc).toBeNull();
      expect(port.dscProfiles).toBeNull();
      expect(port.supportedColorDepths).toBeNull();
      expect(port.supportedModeIds).toBeNull();
      expect(port.modeListComplete).toBe(false);
      expect(port.source.kind).toBe('manufacturer');
      expect(port.source.url).toMatch(/^https:\/\//);
    }
    expect(board.routes).toEqual([]);
  });

  it('isolates editable metadata, sources and port declarations from other instances', () => {
    const reference = structuredClone(MOTHERBOARD_CATALOG);
    const board = createMotherboard(ids[1]);
    const untouched = createMotherboard(ids[1]);
    board.ports[1].protocols!.push('user-extension');
    board.ports[1].maxPayloadGbps = 17.28;
    board.ports[1].source.label = 'Source de cet exemplaire';
    board.motherboard!.memory.notes.push('Barrettes personnelles');
    board.motherboard!.internalConnectors.push('Connecteur personnalisé');
    board.motherboard!.network.splice(0, 1);
    board.motherboard!.evidence!.memory.label = 'Référence personnelle';
    expect(board.ports[2].protocols).toEqual(['displayport']);
    expect(board.ports[2].maxPayloadGbps).toBeNull();
    expect(MOTHERBOARD_CATALOG).toEqual(reference);
    expect(createMotherboard(ids[1])).toEqual(untouched);
  });

  it.each(ids)(
    '%s preserves specifications, video sockets and evidence through export/import',
    (id) => {
      const setup = motherboardSetup(id);
      const restored = parseSetup(exportSetup(setup));
      expect(restored).toEqual(setup);
      const board = restored.devices.find((device) => device.kind === 'motherboard')!;
      expect(getMotherboardId(board)).toBe(id);
      expect(board.motherboard?.source.kind).toBe('manufacturer');
      expect(
        Object.values(board.motherboard?.evidence ?? {}).some((source) =>
          source.url?.endsWith('.pdf'),
        ),
      ).toBe(true);
      expect(analyzeSetup(restored)).toEqual(analyzeSetup(setup));
    },
  );

  it('accepts motherboard devices without optional catalogue metadata', () => {
    const setup = motherboardSetup(ids[0]);
    const board = setup.devices.find((device) => device.kind === 'motherboard')!;
    delete board.catalogId;
    delete board.motherboard;
    const restored = SETUP_SCHEMA.parse(JSON.parse(JSON.stringify(setup)));
    expect(restored).toEqual(setup);
    expect(getMotherboardId(board)).toBeNull();
    expect(getMotherboardId({ ...board, catalogId: 'imported-unknown-board' })).toBeNull();
  });

  it('retains older motherboard exports represented as an unverified other device', () => {
    const setup = motherboardSetup(ids[0]);
    const board = setup.devices.find((device) => device.kind === 'motherboard')!;
    board.kind = 'other';
    delete board.catalogId;
    delete board.motherboard;
    const restored = parseSetup(exportSetup(setup));
    expect(restored).toEqual(setup);
    expect(getMotherboardId(restored.devices.at(-1)!)).toBeNull();
    expect(analyzeSetup(restored).diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'source-unverified',
    );
  });

  it.each(ids)('%s leaves the motherboard signal unknown despite an installed RTX 5090', (id) => {
    const result = analyzeSetup(motherboardSetup(id));
    expect(result.status).toBe('indeterminate');
    expect(result.path).toEqual(['motherboard-1', 'cable-1', 'display-1']);
    expect(result.path).not.toContain('gpu-1');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('source-unverified');
    expect(result.dscProfile).toBeNull();
  });

  it('still requires the CPU signal origin after a user documents every HDMI link characteristic', () => {
    const setup = motherboardSetup(ids[1]);
    const board = setup.devices.find((device) => device.kind === 'motherboard')!;
    const output = board.ports.find((port) => port.id === 'hdmi-out')!;
    const input = setup.devices[1].ports.find((port) => port.id === 'hdmi-in')!;
    for (const port of [output, input]) {
      port.maxPayloadGbps = 14.4;
      port.supportedColorDepths = [8];
      port.supportedModeIds = ['1080p60'];
      port.dsc = false;
      port.source = USER_SOURCE;
    }
    setup.cables[0].maxPayloadGbps = 14.4;
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.bottleneckGbps).toBe(14.4);
    expect(
      result.diagnostics
        .filter((diagnostic) => diagnostic.status === 'indeterminate')
        .map((diagnostic) => diagnostic.code),
    ).toEqual(['source-unverified']);
    setup.devices[0].gpu!.memoryGB = 1;
    setup.devices[0].ports[0].maxPayloadGbps = 1;
    expect(analyzeSetup(setup)).toEqual(result);
  });

  it('keeps RAM overclocking, PCIe and USB data-rate metadata out of video compatibility', () => {
    const setup = motherboardSetup(ids[1]);
    const result = analyzeSetup(setup);
    const specs = setup.devices.find((device) => device.kind === 'motherboard')!.motherboard!;
    specs.memory.maxCapacityGB = 1;
    specs.memory.maxOcMtps = 1;
    specs.expansionSlots = ['PCIe 1.0 x1 · déclaration personnelle'];
    specs.storage = ['Aucun stockage déclaré'];
    specs.rearConnectors = ['USB 40 Gb/s · donnée informative'];
    expect(SETUP_SCHEMA.safeParse(setup).success).toBe(true);
    expect(analyzeSetup(setup)).toEqual(result);
  });
});
