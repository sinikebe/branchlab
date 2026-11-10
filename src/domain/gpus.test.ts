import { describe, expect, it } from 'vitest';
import {
  analyzeSetup,
  createGpu,
  createSetup,
  createXeneonSetup,
  getGpuId,
  GPU_CATALOG,
  SETUP_SCHEMA,
  USER_SOURCE,
  type GpuId,
} from './index';

const currentIds: GpuId[] = [
  'rtx5090',
  'rtx5080',
  'rtx5070ti',
  'rtx5070',
  'rtx5060ti-16gb',
  'rtx5060ti-8gb',
  'rtx5060',
  'rtx5050',
];

describe('GeForce reference catalogue', () => {
  it('covers the desktop generation and keeps memory variants independently selectable', () => {
    expect(
      GPU_CATALOG.filter((entry) => entry.specs.architecture === 'Blackwell').map(
        (entry) => entry.id,
      ),
    ).toEqual(currentIds);
    const large = createGpu('rtx5060ti-16gb');
    const small = createGpu('rtx5060ti-8gb');
    expect(getGpuId(large)).not.toBe(getGpuId(small));
    expect(large.gpu?.memoryGB).toBe(16);
    expect(small.gpu?.memoryGB).toBe(8);
    expect(large.ports).toEqual(small.ports);
    expect(createGpu('rtx5050').gpu?.memoryType).toBe('GDDR6');
    expect(createGpu('rtx5060').gpu?.memoryType).toBe('GDDR7');
    expect(createGpu('rtx4090').gpu?.architecture).toBe('Ada Lovelace');
  });

  it.each(currentIds)('preserves %s reference specifications and evidence through JSON', (id) => {
    const setup = createSetup(id);
    const restored = SETUP_SCHEMA.parse(JSON.parse(JSON.stringify(setup)));
    expect(restored).toEqual(setup);
    const gpu = restored.devices[0];
    expect(getGpuId(gpu)).toBe(id);
    expect(gpu.source.kind).toBe('manufacturer');
    expect(gpu.source.url).toMatch(/^https:\/\/www\.nvidia\.com\//);
    expect(gpu.gpu?.evidence?.memoryBandwidthGBps.kind).toBe('manufacturer');
    expect(gpu.ports.filter((port) => port.connector === 'displayport')).toHaveLength(3);
    expect(gpu.ports.filter((port) => port.connector === 'hdmi')).toHaveLength(1);
    // Published UHBR20 does not supply HDMI FRL rates or a negotiated DSC profile.
    expect(gpu.ports[0].maxPayloadGbps).toBe(77.37);
    expect(gpu.ports[0].evidence?.maxPayloadGbps.kind).toBe('standard');
    expect(gpu.ports.find((port) => port.connector === 'hdmi')?.maxPayloadGbps).toBeNull();
    expect(gpu.ports.every((port) => port.dscProfiles === undefined)).toBe(true);
    expect(gpu.gpu?.pcieLanes).toBeNull();
  });

  it.each(['rtx4090', 'rtx5080'] as const)(
    'accepts legacy %s snapshots without new metadata',
    (id) => {
      const setup = createSetup(id);
      delete setup.devices[0].gpu;
      delete setup.devices[0].catalogId;
      const restored = SETUP_SCHEMA.parse(JSON.parse(JSON.stringify(setup)));
      expect(restored.devices[0].gpu).toBeUndefined();
      expect(restored.devices[0].catalogId).toBeUndefined();
      expect(getGpuId(restored.devices[0])).toBe(id);
      expect(analyzeSetup(restored)).toEqual(analyzeSetup(setup));
    },
  );

  it('never classifies an imported or unrecognized card by a number inside its name', () => {
    const original = createGpu('rtx5080');
    delete original.catalogId;
    delete original.gpu;
    expect(getGpuId({ ...original, source: USER_SOURCE })).toBeNull();
    expect(getGpuId({ ...original, name: 'Ma carte 5080 personnalisée' })).toBeNull();
    expect(getGpuId({ ...original, catalogId: 'unrecognized-card' })).toBeNull();
    expect(getGpuId({ ...original, name: 'Carte importée' })).toBeNull();
    expect(getGpuId({ ...original, kind: 'other' })).toBeNull();
    const newModel = createGpu('rtx5060');
    delete newModel.catalogId;
    expect(getGpuId(newModel)).toBeNull();
  });

  it('isolates mutable device data from other ports, cards and catalogue declarations', () => {
    const beforeCatalogue = structuredClone(GPU_CATALOG);
    const card = createGpu('rtx5060ti-16gb');
    const untouched = createGpu('rtx5060ti-16gb');
    const siblingPortDepths = [...card.ports[1].supportedColorDepths!];
    card.ports[0].supportedColorDepths!.splice(0, 1);
    card.ports[0].protocols!.push('custom-protocol');
    card.gpu!.powerConnectionNotes.push('Déclaration propre à cet exemplaire');
    card.gpu!.memoryGB = 32;
    card.source.label = 'Exemplaire personnalisé';
    expect(card.ports[1].supportedColorDepths).toEqual(siblingPortDepths);
    expect(GPU_CATALOG).toEqual(beforeCatalogue);
    expect(createGpu('rtx5060ti-16gb')).toEqual(untouched);
    expect(createGpu('rtx5060ti-8gb').gpu?.powerConnectionNotes).not.toContain(
      'Déclaration propre à cet exemplaire',
    );
  });

  it.each(currentIds)('%s needs the whole display chain, not only GPU specifications', (id) => {
    const setup = createXeneonSetup(id);
    setup.goal.modeId = '1080p60';
    expect(analyzeSetup(setup).status).toBe('indeterminate');
    const input = setup.devices[1].ports.find((port) => port.id === 'dp-in')!;
    input.maxPayloadGbps = 25.92;
    input.supportedColorDepths = [8];
    input.dsc = true;
    input.evidence = {
      ...input.evidence,
      maxPayloadGbps: USER_SOURCE,
      supportedColorDepths: USER_SOURCE,
      dsc: USER_SOURCE,
    };
    const standard = analyzeSetup(setup);
    expect(standard.status).toBe('compatible');
    expect(standard.transport).toBe('uncompressed');
    expect(standard.requiredGbps).toBeCloseTo(3.564);
    setup.goal.modeId = 'uwqhd240';
    const native = analyzeSetup(setup);
    expect(native.status).toBe('indeterminate');
    expect(native.dscProfile).toBeNull();
    expect(native.diagnostics.map((entry) => entry.code)).toContain('dsc-required');
  });

  it('does not turn memory, CUDA or power metadata into video-link compatibility rules', () => {
    const setup = createSetup('rtx5050');
    const result = analyzeSetup(setup);
    Object.assign(setup.devices[0].gpu!, {
      memoryGB: 1,
      memoryBandwidthGBps: 1,
      cudaCores: 1,
      totalGraphicsPowerW: 1,
      recommendedSystemPowerW: 1,
      maxDisplays: 1,
    });
    expect(SETUP_SCHEMA.safeParse(setup).success).toBe(true);
    expect(analyzeSetup(setup)).toEqual(result);
  });
});
