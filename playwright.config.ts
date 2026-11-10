import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.BRANCHLAB_E2E_PORT ?? 5175);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('BRANCHLAB_E2E_PORT doit être un numéro de port entre 1 et 65535.');
}
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    // Every run must test its own checkout, including the deployment updater.
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } },
    },
  ],
});
