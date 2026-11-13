import packageMetadata from '../package.json' with { type: 'json' };

declare const __SINIVERSE_VERSION__: string | null;

export function resolveVersion(injected: string | null | undefined, fallback: string): string {
  const version = injected ?? fallback;
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('La version doit utiliser le format major.minor.patch sans préfixe v.');
  }
  return version;
}

export const APP_VERSION = resolveVersion(
  typeof __SINIVERSE_VERSION__ === 'undefined' ? undefined : __SINIVERSE_VERSION__,
  packageMetadata.version,
);
