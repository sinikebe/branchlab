import { describe, expect, it } from 'vitest';
import { resolveVersion } from './version';

describe('the displayed build version', () => {
  it('uses the shared CI version and keeps a local fallback', () => {
    expect(resolveVersion('1.2.3', '0.0.1')).toBe('1.2.3');
    expect(resolveVersion(undefined, '0.0.1')).toBe('0.0.1');
    expect(resolveVersion(null, '0.0.1')).toBe('0.0.1');
  });

  it('rejects malformed injected versions rather than displaying an untrusted marker', () => {
    for (const value of ['', 'v0.0.1', 'main', '0.01.2', '1.2', '1.2.3-dev']) {
      expect(() => resolveVersion(value, '0.0.1')).toThrow(/major.minor.patch/);
    }
  });
});
