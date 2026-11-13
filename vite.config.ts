import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import packageMetadata from './package.json' with { type: 'json' };
import { resolveVersion } from './src/version.ts';

export default defineConfig({
  define: {
    __SINIVERSE_VERSION__: JSON.stringify(
      resolveVersion(process.env.SINIVERSE_VERSION, packageMetadata.version),
    ),
  },
  plugins: [react()],
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
