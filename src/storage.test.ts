import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createSetup } from './domain';
import { exportSetup, loadSetup, parseSetup, saveSetup } from './storage';

describe('project portability and validation', () => {
  it('round-trips a setup, including its evidence and unknown connector types', () => {
    const setup = createSetup();
    setup.devices[0].ports[0].connector = 'future-custom-connector';
    expect(parseSetup(exportSetup(setup))).toEqual(setup);
  });

  it('rejects malformed JSON, unsupported versions and broken references', () => {
    expect(() => parseSetup('{')).toThrow(/JSON valide/);
    expect(() => parseSetup(JSON.stringify({ ...createSetup(), schemaVersion: 99 }))).toThrow(
      /version/,
    );
    const broken = createSetup();
    broken.connections[0].from.deviceId = 'missing-device';
    expect(() => parseSetup(JSON.stringify(broken))).toThrow(/invalide/);
  });

  it('rejects large inputs including multi-byte payloads', () => {
    expect(() => parseSetup(' '.repeat(2 * 1024 * 1024 + 1))).toThrow(/2 Mo/);
    expect(() => parseSetup(`"${'é'.repeat(1024 * 1024)}"`)).toThrow(/2 Mo/);
  });

  it('persists the working copy and retains it after an invalid replacement', async () => {
    const setup = createSetup('rtx5080');
    setup.name = 'Mon installation sauvegardée';
    await saveSetup(setup);
    expect(await loadSetup()).toEqual(setup);

    const invalid = { ...setup, schemaVersion: 42 } as unknown as typeof setup;
    await expect(saveSetup(invalid)).rejects.toThrow(/invalide/);
    expect(await loadSetup()).toEqual(setup);
  });
});
