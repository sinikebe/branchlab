import { describe, expect, it } from 'vitest';
import {
  analyzeSetup,
  createCable,
  createSetup,
  DEMO_SOURCE,
  SETUP_SCHEMA,
  type Device,
} from './index';

const screenPort = (setup: ReturnType<typeof createSetup>) => setup.devices[1].ports[0];

describe('single display compatibility chain', () => {
  it('establishes a complete valid 4K60 chain, including modeled timings', () => {
    const result = analyzeSetup(createSetup());
    expect(result.status).toBe('compatible');
    expect(result.displayStatus).toBe('compatible');
    expect(result.requiredGbps).toBeCloseTo(14.256);
    expect(result.bottleneckGbps).toBe(25.92);
    expect(result.path).toEqual(['gpu-1', 'cable-1', 'display-1']);
    expect(result.assumptions).toContainEqual(expect.stringContaining('sans HDR'));
  });

  it('rejects a cable whose physical plugs do not fit', () => {
    const setup = createSetup();
    setup.cables[0] = createCable('hdmi');
    expect(analyzeSetup(setup).status).toBe('incompatible');
    expect(analyzeSetup(setup).diagnostics.some((item) => item.code === 'physical-mismatch')).toBe(
      true,
    );
  });

  it('distinguishes protocol mismatch from physical mismatch', () => {
    const setup = createSetup();
    screenPort(setup).protocols = ['usb'];
    const result = analyzeSetup(setup);
    expect(result.status).toBe('incompatible');
    expect(result.diagnostics.map((item) => item.code)).toContain('protocol-mismatch');
    expect(result.diagnostics.map((item) => item.code)).not.toContain('physical-mismatch');
  });

  it('identifies a cable budget that is below the active-pixel lower bound when DSC cannot be used', () => {
    const setup = createSetup('rtx5080');
    setup.cables[0] = createCable('dp-hbr2');
    setup.goal.modeId = '4k144';
    screenPort(setup).dsc = false;
    const result = analyzeSetup(setup);
    expect(result.status).toBe('incompatible');
    expect(result.bottleneckGbps).toBe(17.28);
    expect(result.displayStatus).toBe('compatible');
    expect(result.availableModes.map((mode) => mode.id)).toContain('4k60');
  });

  it('keeps a physically fitting cable with unknown capacity indeterminate', () => {
    const setup = createSetup();
    setup.cables[0] = createCable('dp-unknown');
    expect(analyzeSetup(setup).status).toBe('indeterminate');
    expect(analyzeSetup(setup).displayStatus).toBe('indeterminate');
  });

  it('does not assume an HDMI link rate from the HDMI version', () => {
    const setup = createSetup('rtx5080');
    setup.cables[0] = createCable('hdmi');
    setup.connections[0].from.portId = 'hdmi-1';
    setup.connections[0].to.portId = 'hdmi-in';
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });

  it('can benefit from the 5080 only after upgrading the entire chain', () => {
    const setup = createSetup('rtx5080');
    setup.goal.modeId = '4k144';
    expect(analyzeSetup(setup).status).toBe('indeterminate');
    setup.cables[0] = createCable('dp-uhbr20');
    expect(analyzeSetup(setup).status).toBe('compatible');
    screenPort(setup).maxPayloadGbps = 25.92;
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });

  it('does not turn declared DSC support into proof of a compressed mode', () => {
    const setup = createSetup();
    setup.goal.modeId = '4k144';
    screenPort(setup).dsc = true;
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.diagnostics.some((item) => item.code === 'dsc-required')).toBe(true);
  });

  it('leaves tight blanking/transport budgets unknown rather than rejecting a potentially feasible mode', () => {
    const setup = createSetup();
    setup.goal.modeId = '4k120';
    screenPort(setup).dsc = false;
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.diagnostics.some((item) => item.code === 'timing-budget')).toBe(true);
  });

  it('evaluates the selected monitor input and its own mode table', () => {
    const setup = createSetup();
    screenPort(setup).supportedModeIds = ['1080p60'];
    const result = analyzeSetup(setup);
    expect(result.status).toBe('incompatible');
    expect(result.displayStatus).toBe('compatible');
    expect(result.availableModes.map((mode) => mode.id)).toEqual(['1080p60']);
  });

  it('does not mistake an unmodeled advertised timing for a screen that cannot display anything', () => {
    const setup = createSetup();
    screenPort(setup).supportedModeIds = ['custom-edid-timing'];
    const result = analyzeSetup(setup);
    expect(result.status).toBe('incompatible');
    expect(result.availableModes).toEqual([]);
    expect(result.displayStatus).toBe('indeterminate');
    setup.conditions.displayPowered = false;
    expect(analyzeSetup(setup).displayStatus).toBe('incompatible');
  });

  it('requires the color depth to be accepted by the monitor', () => {
    const setup = createSetup();
    setup.goal.colorDepth = 12;
    const result = analyzeSetup(setup);
    expect(result.status).toBe('incompatible');
    expect(result.availableModes).toEqual([]);
    expect(result.displayStatus).toBe('compatible');
  });

  it('does not give motherboard outputs the discrete NVIDIA GPU capabilities', () => {
    const setup = createSetup('rtx5080');
    const motherboard: Device = {
      id: 'motherboard',
      name: 'Carte mère non documentée',
      kind: 'other',
      routes: [],
      source: DEMO_SOURCE,
      ports: [
        {
          ...setup.devices[0].ports[0],
          id: 'dp-out',
          protocols: null,
          maxPayloadGbps: null,
          dsc: null,
          supportedColorDepths: null,
          source: DEMO_SOURCE,
        },
      ],
    };
    setup.devices.push(motherboard);
    setup.goal.sourceDeviceId = motherboard.id;
    setup.connections[0].from = { deviceId: motherboard.id, portId: 'dp-out' };
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.path).not.toContain('gpu-1');
    expect(result.diagnostics.some((item) => item.code === 'source-unverified')).toBe(true);
  });

  it('makes power/boot assumptions explicit and does not promise an image on an unpowered display', () => {
    const setup = createSetup();
    setup.conditions.displayPowered = false;
    expect(analyzeSetup(setup).displayStatus).toBe('incompatible');
    setup.conditions.displayPowered = null;
    expect(analyzeSetup(setup).displayStatus).toBe('indeterminate');
  });

  it('reports a missing connection as a disconnected chain', () => {
    const setup = createSetup();
    setup.connections = [];
    expect(analyzeSetup(setup).diagnostics[0].code).toBe('no-path');
  });

  it('keeps unimplemented connector types in the graph without assuming support', () => {
    const setup = createSetup();
    setup.devices[0].ports[0].connector = 'vendor-new-connector';
    screenPort(setup).connector = 'vendor-new-connector';
    setup.cables[0].ends = ['vendor-new-connector', 'vendor-new-connector'];
    expect(SETUP_SCHEMA.safeParse(setup).success).toBe(true);
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });

  it('does not evaluate multiple displays as independent unlimited links', () => {
    const setup = createSetup();
    setup.devices.push({ ...structuredClone(setup.devices[1]), id: 'display-2' });
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });
});

describe('internal graph routes', () => {
  it('checks capacity inside an adapter, not only the visible cables', () => {
    const setup = createSetup('rtx5080');
    const input = {
      ...structuredClone(screenPort(setup)),
      id: 'in',
      supportedModeIds: null,
      dsc: false,
    };
    const output = { ...structuredClone(setup.devices[0].ports[0]), id: 'out', dsc: false };
    setup.devices.push({
      id: 'adapter',
      kind: 'adapter',
      name: 'Adaptateur fictif',
      source: DEMO_SOURCE,
      ports: [input, output],
      routes: [
        {
          fromPortId: 'in',
          toPortId: 'out',
          supported: true,
          maxPayloadGbps: 1,
          source: DEMO_SOURCE,
        },
      ],
    });
    setup.cables.push(createCable('dp-uhbr20', 'cable-2'));
    setup.connections[0].to = { deviceId: 'adapter', portId: 'in' };
    setup.connections.push({
      id: 'connection-2',
      from: { deviceId: 'adapter', portId: 'out' },
      to: { deviceId: 'display-1', portId: 'dp-in' },
      cableId: 'cable-2',
    });
    screenPort(setup).dsc = false;
    setup.devices[0].ports[0].dsc = false;
    const result = analyzeSetup(setup);
    expect(result.status).toBe('incompatible');
    expect(result.bottleneckGbps).toBe(1);
    expect(result.path).toContain('adapter');
  });
});

describe('bounded graph exploration', () => {
  it('returns unknown rather than an incomplete negative result when paths explode', () => {
    const setup = createSetup();
    const ports = Array.from({ length: 30 }, (_, index) => ({
      ...structuredClone(screenPort(setup)),
      id: `p-${index}`,
      role: 'bidirectional' as const,
    }));
    const routes = [];
    for (let from = 0; from < 29; from++)
      for (let to = from + 1; to < Math.min(from + 6, 30); to++)
        routes.push({
          fromPortId: `p-${from}`,
          toPortId: `p-${to}`,
          supported: true,
          maxPayloadGbps: 77.37,
          source: DEMO_SOURCE,
        });
    setup.devices.push({
      id: 'dense',
      name: 'Dense',
      kind: 'adapter',
      source: DEMO_SOURCE,
      ports,
      routes,
    });
    setup.connections[0].to = { deviceId: 'dense', portId: 'p-0' };
    setup.cables.push(createCable('dp-hbr3', 'cable-2'));
    setup.connections.push({
      id: 'connection-2',
      from: { deviceId: 'dense', portId: 'p-29' },
      to: { deviceId: 'display-1', portId: 'dp-in' },
      cableId: 'cable-2',
    });
    expect(analyzeSetup(setup).diagnostics[0].code).toBe('path-search-limit');
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });
});

describe('schema and reproducibility', () => {
  it('does not throw when a referenced cable is missing', () => {
    const setup = createSetup();
    setup.connections[0].cableId = 'missing';
    expect(SETUP_SCHEMA.safeParse(setup).success).toBe(false);
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });

  it('rejects multiply occupied physical ports', () => {
    const setup = createSetup();
    setup.cables.push(createCable('dp-hbr3', 'cable-2'));
    setup.connections.push({
      ...structuredClone(setup.connections[0]),
      id: 'connection-2',
      cableId: 'cable-2',
    });
    expect(SETUP_SCHEMA.safeParse(setup).success).toBe(false);
  });

  it('is stable under a JSON round trip', () => {
    const setup = createSetup();
    expect(analyzeSetup(JSON.parse(JSON.stringify(setup)))).toEqual(analyzeSetup(setup));
  });
});
