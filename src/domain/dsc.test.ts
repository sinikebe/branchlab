import { describe, expect, it } from 'vitest';
import { createCable, createSetup, DEMO_SOURCE, VIDEO_MODES } from './catalog';
import { dscLinkPayloadGbps, dscPayloadGbps, dscProfileMatchesMode } from './dsc';
import { analyzeSetup } from './engine';
import { SETUP_SCHEMA } from './schema';
import type { DscProfile, Setup, VideoMode } from './types';

const profile = (overrides: Partial<DscProfile> = {}): DscProfile => ({
  modeId: '4k144',
  colorDepth: 8,
  version: '1.2',
  bitsPerPixelX16: 192,
  sliceCount: 4,
  sliceHeight: 8,
  link: { encoding: '8b10b', laneCount: 4, fec: true },
  source: DEMO_SOURCE,
  ...overrides,
});

function setProfiles(setup: Setup, profiles: DscProfile[]) {
  for (const device of setup.devices.slice(0, 2)) {
    device.ports[0].dsc = true;
    device.ports[0].dscProfiles = structuredClone(profiles);
  }
}

function compressedSetup(): Setup {
  const setup = createSetup();
  setup.goal.modeId = '4k144';
  setProfiles(setup, [profile()]);
  return setup;
}

const syntheticTiming: VideoMode = {
  id: 'test-3440',
  label: 'Timing fictif de test',
  width: 3440,
  height: 1440,
  refreshHz: 240,
  pixelClockMHz: 1200,
  source: DEMO_SOURCE,
};

describe('DisplayPort DSC transport allocation', () => {
  it('includes slice rounding, end markers, FEC and clock margin', () => {
    const dsc = profile({ modeId: syntheticTiming.id });
    // Independently calculated: 1296 cycles, 1,034,807 ppm, 14.4 Gbit/s before overhead.
    expect(dscPayloadGbps(syntheticTiming, dsc)).toBeCloseTo(14.9012208, 9);
    expect(dscPayloadGbps(syntheticTiming, { ...dsc, bitsPerPixelX16: 128 })).toBeCloseTo(
      9.9341472,
      9,
    );
    expect(dscLinkPayloadGbps(dsc)).toBe(25.92);
  });

  it('does not approximate overhead by a fixed compression ratio or fixed percentage', () => {
    const mode = { ...syntheticTiming, width: 1024 };
    const dsc = profile({ modeId: mode.id, bitsPerPixelX16: 128, sliceCount: 2 });
    // 258 cycles versus 256 before padding/end markers; factor 1,038,063 ppm.
    expect(dscPayloadGbps(mode, dsc)).toBeCloseTo(9.9654048, 9);
    expect(dscPayloadGbps(mode, { ...dsc, sliceCount: 4 })).toBeGreaterThan(
      dscPayloadGbps(mode, dsc)!,
    );
  });

  it('requires a known clock and equal slices covering the image', () => {
    const dsc = profile({ modeId: syntheticTiming.id });
    expect(dscPayloadGbps({ ...syntheticTiming, pixelClockMHz: null }, dsc)).toBeNull();
    expect(dscProfileMatchesMode({ ...dsc, sliceCount: 6 }, syntheticTiming, 8)).toBe(false);
    expect(dscProfileMatchesMode({ ...dsc, sliceHeight: 7 }, syntheticTiming, 8)).toBe(false);
    expect(dscPayloadGbps(syntheticTiming, { ...dsc, sliceHeight: 7 })).toBeNull();
  });
});

describe('documented DSC profiles in the compatibility chain', () => {
  it('validates a common accepted configuration and reports both compressed and raw budgets', () => {
    const setup = compressedSetup();
    setup.devices[1].ports[0].dscProfiles![0].source = {
      kind: 'user',
      label: 'Autre preuve du même profil',
    };
    const result = analyzeSetup(setup);
    expect(result.status).toBe('compatible');
    expect(result.transport).toBe('dsc');
    expect(result.uncompressedGbps).toBeCloseTo(31.32);
    expect(result.requiredGbps).toBeCloseTo(16.17486948, 7);
    expect(result.bottleneckGbps).toBe(25.92);
    expect(result.dscProfile).toEqual(profile());
    expect(result.availableModes.map((mode) => mode.id)).toContain('4k144');
    expect(result.diagnostics.map((item) => item.code)).toContain('dsc-profile-supported');
  });

  it('prefers uncompressed transport when it already fits', () => {
    const setup = compressedSetup();
    setup.goal.modeId = '4k60';
    setProfiles(setup, [profile({ modeId: '4k60' })]);
    const result = analyzeSetup(setup);
    expect(result.status).toBe('compatible');
    expect(result.transport).toBe('uncompressed');
    expect(result.dscProfile).toBeNull();
    expect(result.requiredGbps).toBe(result.uncompressedGbps);
  });

  it('treats legacy JSON without compression settings as automatic', () => {
    const setup = compressedSetup();
    delete setup.goal.compression;
    const legacy = JSON.parse(JSON.stringify(setup));
    expect(SETUP_SCHEMA.safeParse(legacy).success).toBe(true);
    expect(analyzeSetup(legacy)).toEqual(
      analyzeSetup({ ...setup, goal: { ...setup.goal, compression: 'auto' } }),
    );
    const oldSetup = createSetup();
    expect(analyzeSetup(JSON.parse(JSON.stringify(oldSetup))).status).toBe('compatible');
  });

  it('honors DSC disabled even when a common profile fits', () => {
    const setup = compressedSetup();
    setup.goal.compression = 'off';
    const result = analyzeSetup(setup);
    expect(result.status).toBe('incompatible');
    expect(result.transport).toBeNull();
    expect(result.dscProfile).toBeNull();
    expect(result.diagnostics.map((item) => item.code)).toContain('bandwidth-limit');
    setup.goal.modeId = '4k60';
    expect(analyzeSetup(setup).status).toBe('compatible');
  });

  it.each([false, null])('does not override DSC capability %s with a profile', (support) => {
    const setup = compressedSetup();
    setup.devices[1].ports[0].dsc = support;
    const result = analyzeSetup(setup);
    expect(result.status).toBe(support === false ? 'incompatible' : 'indeterminate');
    expect(result.transport).toBeNull();
  });

  it.each(['missing', 'different-bpp', 'different-depth', 'different-mode', 'different-lanes'])(
    'requires a matching profile at both ends: %s',
    (difference) => {
      const setup = compressedSetup();
      const input = setup.devices[1].ports[0];
      const dsc = input.dscProfiles![0];
      if (difference === 'missing') delete input.dscProfiles;
      if (difference === 'different-bpp') dsc.bitsPerPixelX16 = 128;
      if (difference === 'different-depth') dsc.colorDepth = 10;
      if (difference === 'different-mode') dsc.modeId = '4k120';
      if (difference === 'different-lanes') dsc.link.laneCount = 2;
      const result = analyzeSetup(setup);
      expect(result.status).toBe('indeterminate');
      expect(result.transport).toBeNull();
      expect(result.diagnostics.map((item) => item.code)).toContain('dsc-required');
    },
  );

  it('does not carry an accepted configuration into another mode or depth', () => {
    const setup = compressedSetup();
    setup.goal.colorDepth = 10;
    expect(analyzeSetup(setup).status).toBe('indeterminate');
    setup.goal.colorDepth = 8;
    setup.goal.modeId = '4k240';
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });

  it('preserves unknown cable capacity and unrelated physical evidence', () => {
    const setup = compressedSetup();
    setup.cables[0].maxPayloadGbps = null;
    const unknown = analyzeSetup(setup);
    expect(unknown.status).toBe('indeterminate');
    expect(unknown.bottleneckGbps).toBeNull();
    expect(unknown.diagnostics.map((item) => item.code)).toContain('cable-capacity-unknown');
    setup.cables[0] = createCable('hdmi');
    expect(analyzeSetup(setup).status).toBe('incompatible');
    setup.cables[0] = createCable('dp-hbr3');
    setup.conditions.displayPowered = false;
    expect(analyzeSetup(setup).status).toBe('incompatible');
    setup.conditions.displayPowered = true;
    setup.devices[1].ports[0].supportedColorDepths = null;
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });

  it('accepts a fitting candidate after another documented candidate fails', () => {
    const setup = compressedSetup();
    setProfiles(setup, [profile({ bitsPerPixelX16: 368 }), profile({ bitsPerPixelX16: 128 })]);
    const result = analyzeSetup(setup);
    expect(result.status).toBe('compatible');
    expect(result.dscProfile?.bitsPerPixelX16).toBe(128);
    setProfiles(setup, [profile({ bitsPerPixelX16: 368 })]);
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });

  it('does not reuse a UHBR budget for an 8b/10b profile', () => {
    const setup = compressedSetup();
    setup.devices[0].ports[0].maxPayloadGbps = 77.37;
    setup.cables[0] = createCable('dp-uhbr20');
    setup.goal.modeId = '4k240';
    setup.goal.colorDepth = 12;
    setup.devices[1].ports[0].supportedColorDepths = [8, 10, 12];
    setProfiles(setup, [profile({ modeId: '4k240', colorDepth: 12, bitsPerPixelX16: 192 })]);
    // Raw: 85.536 > 77.37; this DSC config also exceeds HBR3, despite the 77.37 path budget.
    expect(analyzeSetup(setup).status).toBe('indeterminate');
    setProfiles(setup, [profile({ modeId: '4k240', colorDepth: 12, bitsPerPixelX16: 128 })]);
    const result = analyzeSetup(setup);
    expect(result.status).toBe('compatible');
    expect(result.bottleneckGbps).toBe(25.92);
  });

  it('preserves two-lane profiles without inferring per-lane transport capacity', () => {
    const setup = compressedSetup();
    const twoLanes = profile({ link: { encoding: '8b10b', laneCount: 2, fec: true } });
    setProfiles(setup, [twoLanes]);
    expect(analyzeSetup(setup).status).toBe('indeterminate');
    setProfiles(setup, [{ ...twoLanes, bitsPerPixelX16: 128 }]);
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.transport).toBeNull();
    expect(result.diagnostics.map((item) => item.code)).toContain('dsc-lanes-unverified');
  });

  it('never validates a two-lane profile against a four-lane HBR2 cable aggregate', () => {
    const setup = compressedSetup();
    setup.cables[0] = createCable('dp-hbr2');
    const dsc = profile({
      bitsPerPixelX16: 128,
      link: { encoding: '8b10b', laneCount: 2, fec: true },
    });
    setProfiles(setup, [dsc]);
    const mode = VIDEO_MODES.find((entry) => entry.id === '4k144')!;
    const budget = dscPayloadGbps(mode, dsc)!;
    // The old min(17.28 aggregate, 12.96 two-lane HBR3 cap) falsely accepted this.
    expect(budget).toBeGreaterThan(8.64);
    expect(budget).toBeLessThan(12.96);
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.transport).toBeNull();
    expect(result.diagnostics.map((item) => item.code)).toContain('dsc-lanes-unverified');
    expect(SETUP_SCHEMA.parse(setup).devices[0].ports[0].dscProfiles![0]).toEqual(dsc);
  });

  it('respects exact computed capacity boundaries', () => {
    const setup = compressedSetup();
    const required = dscPayloadGbps(
      VIDEO_MODES.find((mode) => mode.id === '4k144')!,
      profile(),
    )!;
    setup.cables[0].maxPayloadGbps = required;
    expect(analyzeSetup(setup).status).toBe('compatible');
    setup.cables[0].maxPayloadGbps = required - 0.000001;
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });

  it('does not apply the DisplayPort DSC budget to HDMI', () => {
    const setup = compressedSetup();
    for (const device of setup.devices) {
      device.ports[0].connector = 'hdmi';
      device.ports[0].protocols = ['hdmi'];
    }
    setup.cables[0].ends = ['hdmi', 'hdmi'];
    setup.cables[0].protocols = ['hdmi'];
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.transport).toBeNull();
  });

  it('does not infer DSC transmission through an internal route', () => {
    const setup = compressedSetup();
    const input = { ...structuredClone(setup.devices[1].ports[0]), id: 'in' };
    const output = { ...structuredClone(setup.devices[0].ports[0]), id: 'out' };
    setup.devices.push({
      id: 'adapter',
      name: 'Adaptateur de test',
      kind: 'adapter',
      source: DEMO_SOURCE,
      ports: [input, output],
      routes: [
        {
          fromPortId: 'in',
          toPortId: 'out',
          supported: true,
          maxPayloadGbps: 25.92,
          source: DEMO_SOURCE,
        },
      ],
    });
    setup.connections[0].to = { deviceId: 'adapter', portId: 'in' };
    setup.cables.push(createCable('dp-hbr3', 'cable-2'));
    setup.connections.push({
      id: 'connection-2',
      from: { deviceId: 'adapter', portId: 'out' },
      to: { deviceId: 'display-1', portId: 'dp-in' },
      cableId: 'cable-2',
    });
    const result = analyzeSetup(setup);
    expect(result.status).toBe('indeterminate');
    expect(result.transport).toBeNull();
  });
});

describe('DSC profile import validation', () => {
  it('preserves complete accepted configurations during JSON import', () => {
    const setup = compressedSetup();
    expect(SETUP_SCHEMA.parse(JSON.parse(JSON.stringify(setup)))).toEqual(setup);
  });

  it.each([
    { link: { encoding: '8b10b', laneCount: 4, fec: false } },
    { link: { encoding: '8b10b', laneCount: 3, fec: true } },
    { link: { encoding: '128b132b', laneCount: 4, fec: true } },
    { bitsPerPixelX16: 0 },
    { bitsPerPixelX16: 129.5 },
    { bitsPerPixelX16: 127 },
    { bitsPerPixelX16: 384 },
    { sliceCount: 3 },
    { sliceHeight: 0 },
    { source: undefined },
  ])('rejects an invalid or incomplete configuration: %j', (change) => {
    const setup = compressedSetup();
    Object.assign(setup.devices[1].ports[0].dscProfiles![0], change);
    expect(SETUP_SCHEMA.safeParse(setup).success).toBe(false);
    expect(analyzeSetup(setup).status).toBe('indeterminate');
  });
});
