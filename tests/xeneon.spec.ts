import { expect, test, type Page } from '@playwright/test';
import type { Setup } from '../src/domain';

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function selectRealDisplay(page: Page, gpu: '4090' | '5080' = '4090') {
  await page.goto('/');
  await page.getByRole('button', { name: `RTX ${gpu} NVIDIA` }).click();
  await page.getByRole('button', { name: 'Écran', exact: true }).click();
  await page.getByLabel('Modèle d’écran').selectOption('xeneon-flex');
}

async function snapshot(page: Page): Promise<Setup> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString()) as Setup;
}

for (const gpu of ['4090', '5080'] as const) {
  test(`XENEON FLEX keeps the RTX ${gpu} chain honest about the native 240 Hz mode`, async ({
    page,
  }) => {
    await selectRealDisplay(page, gpu);
    await expect(page.getByLabel('Modèle d’écran')).toHaveValue('xeneon-flex');
    const project = await snapshot(page);
    const source = project.devices.find((device) => device.id === project.goal.sourceDeviceId)!;
    const display = project.devices.find((device) => device.id === project.goal.displayDeviceId)!;
    expect(source.name).toContain(gpu);
    expect(display.catalogId).toBe('xeneon-flex');
    expect(display.display).toMatchObject({
      nativeWidth: 3440,
      nativeHeight: 1440,
      maxRefreshHz: 240,
    });
    expect(display.ports.find((port) => port.id === 'dp-in')).toMatchObject({
      source: { kind: 'manufacturer' },
      maxPayloadGbps: null,
      dsc: null,
      supportedColorDepths: null,
    });
    expect(display.ports.find((port) => port.id === 'dp-in')!.supportedModeIds).toEqual(
      expect.arrayContaining(['uwqhd50', 'uwqhd60', 'uwqhd100', 'uwqhd240']),
    );
    expect(project.cables[0].maxPayloadGbps).toBe(25.92);
    await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
    await page.getByLabel('Résolution & fréquence').selectOption('uwqhd240');
    await expect(page.locator('.result-card')).toHaveClass(/indeterminate/);
    await expect(page.locator('.available-modes')).not.toContainText('240 Hz');
    await expect(
      page.getByRole('region', { name: 'Modes annoncés par le constructeur' }),
    ).toContainText('240 Hz');
  });
}

test('Corsair provenance and per-input declarations survive reload and JSON import', async ({
  page,
}) => {
  await selectRealDisplay(page, '5080');
  await page.getByLabel('Nom du setup').fill('Mon XENEON FLEX');
  await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();
  const before = await snapshot(page);
  await page.reload();
  await expect(page.getByLabel('Nom du setup')).toHaveValue('Mon XENEON FLEX');
  const after = await snapshot(page);
  expect(after).toEqual(before);
  await page.locator('input[type=file]').setInputFiles({
    name: 'xeneon.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(before)),
  });
  const imported = await snapshot(page);
  expect(imported).toEqual(before);
  await page.getByRole('button', { name: 'Voir les sources' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const sourceLink = dialog.locator('a[href*="corsair.com"][href*="xeneon-flex-45wqhd240"]');
  await expect(sourceLink.first()).toBeVisible();
  await expect(dialog).toContainText('Constructeur');
});

test('the second HDMI input stays distinct from the non-video USB-C upstream port', async ({
  page,
}) => {
  await selectRealDisplay(page);
  await page.getByRole('button', { name: 'Liaison', exact: true }).click();
  await page.getByLabel('Port de sortie').selectOption('hdmi-1');
  await page.getByLabel('Câble utilisé').selectOption('hdmi');
  await page.getByLabel('Entrée de l’écran', { exact: true }).selectOption('hdmi-2-in');
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await page.getByLabel('Résolution & fréquence').selectOption('4k60');
  await expect(page.locator('.result-card')).toHaveClass(/indeterminate/);
  let project = await snapshot(page);
  expect(project.connections[0].to.portId).toBe('hdmi-2-in');
  await page.getByRole('button', { name: 'RTX 5080 NVIDIA' }).click();
  await page.getByRole('button', { name: 'Liaison', exact: true }).click();
  await expect(page.getByLabel('Port de sortie')).toHaveValue('hdmi-1');
  await expect(page.getByLabel('Entrée de l’écran', { exact: true })).toHaveValue('hdmi-2-in');
  await expect(page.getByLabel('Câble utilisé')).toHaveValue('hdmi');
  await page.getByLabel('Entrée de l’écran', { exact: true }).selectOption('usb-c-upstream');
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await expect(page.locator('.result-card')).toHaveClass(/incompatible/);
  project = await snapshot(page);
  const display = project.devices.find((device) => device.id === project.goal.displayDeviceId)!;
  const upstream = display.ports.find((port) => port.id === 'usb-c-upstream')!;
  expect(upstream.protocols).not.toContain('displayport');
  expect(upstream.protocols).not.toContain('hdmi');
});

test('a user-completed input can validate a standard 1080p60 chain without rewriting the Corsair source', async ({
  page,
}) => {
  await selectRealDisplay(page);
  await page.getByLabel('Capacité utile de l’entrée').selectOption('25.92');
  await page.getByLabel('Profondeurs de couleur acceptées').selectOption('8');
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await page.getByLabel('Résolution & fréquence').selectOption('1080p60');
  await expect(page.locator('.result-card')).toHaveClass(/compatible/);
  const project = await snapshot(page);
  const display = project.devices.find((device) => device.id === project.goal.displayDeviceId)!;
  const input = display.ports.find((port) => port.id === 'dp-in')!;
  expect(display.source.kind).toBe('manufacturer');
  expect(input.evidence?.maxPayloadGbps.kind).toBe('user');
  expect(input.evidence?.supportedColorDepths.kind).toBe('user');
  expect(input.evidence?.supportedModeIds.kind).toBe('manufacturer');
  expect(input.supportedModeIds).toContain('1080p60');
});
