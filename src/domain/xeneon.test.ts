import { describe, expect, it } from 'vitest';
import {
  analyzeSetup,
  CORSAIR_XENEON_GUIDE,
  CORSAIR_XENEON_PRODUCT,
  createCable,
  createDisplay,
  createXeneonSetup,
  SETUP_SCHEMA,
  VIDEO_MODES,
  type GpuId,
} from './index';

const gpuIds: GpuId[] = ['rtx4090', 'rtx5080'];

function screenInput(setup: ReturnType<typeof createXeneonSetup>, id = 'dp-in') {
  return setup.devices
    .find((device) => device.id === setup.goal.displayDeviceId)!
    .ports.find((port) => port.id === id)!;
}

function userCompleted1080p(gpu: GpuId) {
  const setup = createXeneonSetup(gpu);
  setup.goal.modeId = '1080p60';
  const input = screenInput(setup);
  input.maxPayloadGbps = 25.92;
  input.supportedColorDepths = [8];
  input.evidence = {
    maxPayloadGbps: { kind: 'user', label: 'Capacité déclarée par l’utilisateur pour ce scénario' },
    supportedColorDepths: {
      kind: 'user',
      label: 'Profondeur déclarée par l’utilisateur pour ce scénario',
    },
  };
  return setup;
}

describe('CORSAIR XENEON FLEX evidence', () => {
  it('keeps panel facts and input capabilities distinct', () => {
    const display = createDisplay('xeneon-flex');
    expect(display.catalogId).toBe('xeneon-flex');
    expect(display.display).toMatchObject({
      diagonalInches: 45,
      panelTechnology: 'OLED',
      nativeWidth: 3440,
      nativeHeight: 1440,
      maxRefreshHz: 240,
      colorDepthBits: 10,
    });
    expect(display.source).toEqual(CORSAIR_XENEON_PRODUCT);
    expect(display.ports).toHaveLength(11);
    for (const port of display.ports) {
      expect(port.source).toEqual(CORSAIR_XENEON_GUIDE);
      expect(port.maxPayloadGbps).toBeNull();
      expect(port.dsc).toBeNull();
      expect(port.supportedColorDepths).toBeNull();
    }
  });

  it('records HDMI scaling input modes without turning the OLED panel into a 4K display', () => {
    const setup = createXeneonSetup();
    expect(screenInput(setup, 'hdmi-in').supportedModeIds).toContain('4k60');
    expect(screenInput(setup, 'hdmi-2-in').supportedModeIds).toContain('4k120');
    expect(screenInput(setup).supportedModeIds).not.toContain('4k60');
    expect(setup.devices[1].display!.nativeWidth).toBe(3440);
    setup.goal.modeId = '4k60';
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.diagnostics.map((item) => item.code)).toContain('mode-not-documented');
    expect(result.diagnostics.map((item) => item.code)).not.toContain('mode-unsupported');
  });

  it('does not invent native timings or promote generic QHD 60 Hz PIP/PBP to normal mode', () => {
    const display = createDisplay('xeneon-flex');
    const dp = display.ports[0];
    expect(dp.supportedModeIds).toEqual(
      expect.arrayContaining([
        'uwqhd50',
        'uwqhd60',
        'uwqhd100',
        'uwqhd240',
        '1440p120',
        '1440p240',
      ]),
    );
    expect(dp.supportedModeIds).not.toContain('1440p60');
    expect(dp.supportedModeIds).not.toContain('1440p144');
    for (const mode of VIDEO_MODES.filter((mode) => mode.id.startsWith('uwqhd'))) {
      expect(mode.pixelClockMHz).toBeNull();
      expect(mode.source).toEqual(CORSAIR_XENEON_GUIDE);
    }
  });

  it('preserves facts, partial-mode semantics and provenance after schema/JSON round trip', () => {
    const setup = createXeneonSetup('rtx5080');
    const restored = SETUP_SCHEMA.parse(JSON.parse(JSON.stringify(setup)));
    expect(restored).toEqual(setup);
    expect(analyzeSetup(restored)).toEqual(analyzeSetup(setup));
    expect(screenInput(restored).modeListComplete).toBe(false);
  });
});

describe.each(gpuIds)('%s to XENEON FLEX complete chain', (gpu) => {
  it('declares the native endpoint mode but does not manufacture proof for the entire chain', () => {
    const result = analyzeSetup(createXeneonSetup(gpu));
    expect(result.status).toBe('indeterminate');
    expect(result.displayStatus).toBe('indeterminate');
    expect(result.requiredGbps).toBeNull();
    expect(result.bottleneckGbps).toBeNull();
    expect(result.availableModes).toEqual([]);
    expect(result.path).toEqual(['gpu-1', 'cable-1', 'display-1']);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'mode-declared', status: 'compatible' }),
    );
    expect(result.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining(['timing-unknown', 'port-capacity-unknown', 'color-depth-unknown']),
    );
  });

  it('can establish 1080p60 only after explicitly completing the missing input characteristics', () => {
    const setup = userCompleted1080p(gpu);
    const result = analyzeSetup(setup);
    expect(result.status).toBe('compatible');
    expect(result.displayStatus).toBe('compatible');
    expect(result.requiredGbps).toBeCloseTo(3.564);
    expect(result.bottleneckGbps).toBe(25.92);
    expect(result.requestedMode!.source.kind).toBe('standard');
    expect(result.requestedMode!.source.url).toContain('torvalds/linux');
    expect(screenInput(setup).evidence!.maxPayloadGbps.kind).toBe('user');
  });

  it('does not bypass a weak cable or the screen with the newer GPU', () => {
    const setup = userCompleted1080p(gpu);
    setup.cables[0].maxPayloadGbps = 1;
    screenInput(setup).dsc = false;
    const result = analyzeSetup(setup);
    expect(result.status).toBe('incompatible');
    expect(result.bottleneckGbps).toBe(1);
    expect(result.diagnostics.map((item) => item.code)).toContain('bandwidth-limit');
    setup.cables[0] = createCable('dp-unknown');
    expect(analyzeSetup(setup).status).toBe('indeterminate');
    expect(analyzeSetup(setup).bottleneckGbps).toBeNull();
  });

  it('keeps native 240 Hz indeterminate even with a declared high-rate cable', () => {
    const setup = createXeneonSetup(gpu);
    setup.goal.modeId = 'uwqhd240';
    setup.cables[0] = createCable('dp-uhbr20');
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.requiredGbps).toBeNull();
    // Supplying a source's/cable's rate does not fill the monitor's unknown data.
    expect(result.bottleneckGbps).toBeNull();
    expect(screenInput(setup).maxPayloadGbps).toBeNull();
    expect(screenInput(setup).dsc).toBeNull();
  });

  it('does not confuse a video input with the second data-only USB-C connector', () => {
    const setup = createXeneonSetup(gpu);
    setup.connections[0].to.portId = 'usb-c-upstream';
    setup.cables[0].ends = ['displayport', 'usb-c'];
    const result = analyzeSetup(setup);
    expect(result.status).toBe('incompatible');
    expect(result.displayStatus).toBe('incompatible');
    expect(result.diagnostics.map((item) => item.code)).toContain('protocol-mismatch');
    expect(result.diagnostics.map((item) => item.code)).not.toContain('physical-mismatch');
  });

  it('continues to explain an incompatible physical cable despite unknown native timings', () => {
    const setup = createXeneonSetup(gpu);
    setup.cables[0] = createCable('hdmi');
    const result = analyzeSetup(setup);
    expect(result.status).toBe('incompatible');
    expect(result.diagnostics.map((item) => item.code)).toContain('physical-mismatch');
  });

  it('evaluates both HDMI inputs as declared by Corsair while retaining unknown transport budgets', () => {
    const setup = createXeneonSetup(gpu);
    setup.goal.modeId = '4k60';
    setup.connections[0].from.portId = 'hdmi-1';
    setup.cables[0] = createCable('hdmi');
    for (const id of ['hdmi-in', 'hdmi-2-in']) {
      setup.connections[0].to.portId = id;
      const result = analyzeSetup(setup);
      expect(result.status).toBe('indeterminate');
      expect(result.diagnostics.map((item) => item.code)).toContain('mode-declared');
      expect(result.diagnostics.map((item) => item.code)).not.toContain('mode-not-documented');
    }
  });
});
