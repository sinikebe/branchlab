import { expect, test, type Page } from '@playwright/test';
import { createSetup, type Setup } from '../src/domain';

async function snapshot(page: Page): Promise<Setup> {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const stream = await (await event).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString()) as Setup;
}

for (const model of ['4090', '5080'] as const) {
  test(`RTX ${model} HDMI references distinguish published facts from an unknown video budget`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: `RTX ${model} NVIDIA` }).click();
    const specs = page.getByRole('region', { name: 'Caractéristiques de la carte graphique' });
    await specs.getByText('Spécifications complètes', { exact: true }).click();
    const reference = specs.getByRole('region', { name: /^Documentation vidéo : HDMI/ });
    await expect(reference).toHaveCount(1);
    await expect(reference).toContainText(model === '4090' ? 'HDMI 2.1a' : 'HDMI 2.1b');
    await expect(reference).toContainText(model === '4090' ? '48 Gbit/s' : '4K 480 Hz');
    await expect(reference).toContainText(model === '4090' ? '4K 240 Hz' : 'débit FRL');
    await expect(reference).toContainText(model === '4090' ? 'budget vidéo' : 'non documenté');
    await expect(reference.locator('a[href*="nvidia.com"]').first()).toBeVisible();

    const project = await snapshot(page);
    const hdmi = project.devices[0].ports.find((port) => port.connector === 'hdmi')!;
    expect(hdmi.videoReference?.rawBandwidthGbps).toBe(model === '4090' ? 48 : null);
    expect(hdmi.maxPayloadGbps).toBeNull();
    expect(project.devices[0].ports.filter((port) => port.videoReference)).toHaveLength(1);
    await page.getByRole('button', { name: 'Liaison', exact: true }).click();
    await page.getByLabel('Port de sortie').selectOption('hdmi-1');
    await page.getByLabel('Câble utilisé').selectOption('hdmi');
    await page.getByLabel('Entrée de l’écran', { exact: true }).selectOption('hdmi-in');
    await expect(page.locator('.diagnostic-explanations')).toContainText(
      'débit utile non documenté',
    );

    if (model === '4090') {
      await page.getByLabel('Nom du setup').fill('HDMI documenté, budget à vérifier');
      await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();
      const saved = await snapshot(page);
      await page.reload();
      await expect(page.getByLabel('Nom du setup')).toHaveValue(saved.name);
      expect(await snapshot(page)).toEqual(saved);
      await page.locator('input[type=file]').setInputFiles({
        name: 'hdmi-reference.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(saved)),
      });
      expect(await snapshot(page)).toEqual(saved);
    }

    await page.getByRole('button', { name: 'Éléments', exact: true }).click();
    await page.getByRole('button', { name: 'Source', exact: true }).click();
    await page.getByLabel('Carte graphique', { exact: true }).selectOption('rtx5090');
    await expect(specs.getByRole('region', { name: /^Documentation vidéo/ })).toHaveCount(0);
  });
}

test('each documented AM5 video socket exposes its own reference and CPU conditions', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('.library-sidebar')
    .getByRole('button', { name: /B850 Pro-A WiFi/ })
    .click();
  const specs = page.getByRole('region', { name: 'Caractéristiques de la carte mère' });
  await specs.getByText('Spécifications complètes', { exact: true }).click();
  const references = specs.getByRole('region', { name: /^Documentation vidéo/ });
  await expect(references).toHaveCount(2);
  for (const reference of await references.all()) {
    await expect(reference).toContainText(/CPU|processeur/);
    await expect(reference.locator('a[href*="asrock.com"]').first()).toBeVisible();
  }
  await expect(references.filter({ hasText: 'HBR3' })).toHaveCount(1);
  await expect(references.filter({ hasText: 'FRL' })).toHaveCount(1);

  await page.getByLabel('Carte mère', { exact: true }).selectOption('msi-mpg-x870e-carbon-wifi');
  if (!(await specs.locator('details').evaluate((details: HTMLDetailsElement) => details.open)))
    await specs.getByText('Spécifications complètes', { exact: true }).click();
  await expect(references).toHaveCount(3);
  for (const reference of await references.all()) {
    await expect(reference).toContainText(/CPU|processeur/);
    await expect(reference.locator('a[href*="msi.com"]').first()).toBeVisible();
  }
  await expect(references.filter({ hasText: 'HBR3' })).toHaveCount(2);
  const project = await snapshot(page);
  const board = project.devices.find((device) => device.kind === 'motherboard')!;
  expect(board.ports.every((port) => port.videoReference?.source.kind === 'manufacturer')).toBe(
    true,
  );
  expect(board.ports.every((port) => port.maxPayloadGbps === null)).toBe(true);
});

test('a saved GPU without port references is preserved rather than silently enriched', async ({
  page,
}) => {
  const legacy = createSetup('rtx4090');
  for (const port of legacy.devices[0].ports) delete port.videoReference;
  legacy.devices[0].gpu!.notes = ['Ancien profil conservé.'];
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'legacy-hdmi.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await page.getByRole('button', { name: 'Inspecter NVIDIA GeForce RTX 4090' }).click();
  const specs = page.getByRole('region', { name: 'Caractéristiques de la carte graphique' });
  await specs.getByText('Spécifications complètes', { exact: true }).click();
  await expect(specs.getByRole('region', { name: /^Documentation vidéo/ })).toHaveCount(0);
  expect(await snapshot(page)).toEqual(legacy);
});
