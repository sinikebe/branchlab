import { expect, test, type Page } from '@playwright/test';
import { createSetup, type Setup } from '../src/domain';

async function snapshot(page: Page): Promise<Setup> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString()) as Setup;
}

test('memory variants keep their identity, ports and sourced specifications across source changes and storage', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'RTX 5080 NVIDIA' }).click();
  await page.getByLabel('Carte graphique', { exact: true }).selectOption('rtx5060ti-16gb');
  const specs = page.getByRole('region', { name: 'Caractéristiques de la carte graphique' });
  await expect(specs).toContainText('16 Go');
  await expect(specs.getByRole('link', { name: 'Fiche constructeur' })).toHaveAttribute(
    'href',
    /nvidia\.com/,
  );
  await page.getByRole('button', { name: 'Écran', exact: true }).click();
  await page.getByLabel('Modèle d’écran').selectOption('xeneon-flex');
  await page.getByRole('button', { name: 'Liaison', exact: true }).click();
  await page.getByLabel('Port de sortie').selectOption('hdmi-1');
  await page.getByLabel('Câble utilisé').selectOption('hdmi');
  await page.getByLabel('Entrée de l’écran', { exact: true }).selectOption('hdmi-2-in');
  await page.getByRole('button', { name: 'Source', exact: true }).click();
  await page.getByLabel('Carte graphique', { exact: true }).selectOption('rtx5060ti-8gb');
  await expect(specs).toContainText('8 Go');
  const before = await snapshot(page);
  expect(before.connections[0].from.portId).toBe('hdmi-1');
  expect(before.connections[0].to.portId).toBe('hdmi-2-in');
  expect(before.cables[0].ends).toEqual(['hdmi', 'hdmi']);
  const card = before.devices.find((device) => device.kind === 'gpu')!;
  expect(card.catalogId).toBe('rtx5060ti-8gb');
  expect(card.gpu?.memoryGB).toBe(8);
  expect(card.gpu?.source.kind).toBe('manufacturer');
  await page.getByLabel('Emplacement de la sortie').selectOption('motherboard');
  await page.getByLabel('Emplacement de la sortie').selectOption('gpu');
  await expect(page.getByLabel('Carte graphique', { exact: true })).toHaveValue('rtx5060ti-8gb');
  expect((await snapshot(page)).devices.find((device) => device.kind === 'gpu')).toEqual(card);
  expect((await snapshot(page)).connections[0].from.portId).toBe('hdmi-1');

  await page.getByLabel('Nom du setup').fill('Mon setup RTX 5060 Ti 8 Go');
  await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();
  const saved = await snapshot(page);
  await page.reload();
  await expect(page.getByLabel('Nom du setup')).toHaveValue('Mon setup RTX 5060 Ti 8 Go');
  expect(await snapshot(page)).toEqual(saved);
  await page.locator('input[type=file]').setInputFiles({
    name: 'rtx5060ti.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  expect(await snapshot(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Voir les sources' }).click();
  await expect(
    page.getByRole('dialog').locator('a[href*="rtx-5060-family"]').first(),
  ).toBeVisible();
});

test('an imported custom GPU is not relabelled as a catalogue card on a motherboard round trip', async ({
  page,
}) => {
  const setup = createSetup();
  const gpu = setup.devices[0];
  gpu.name = 'Ma carte personnalisée';
  delete gpu.catalogId;
  delete gpu.gpu;
  gpu.source = { kind: 'user', label: 'Profil personnel conservé' };
  gpu.ports[0].maxPayloadGbps = 17.28;
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'custom-gpu.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(setup)),
  });
  await page.getByRole('button', { name: 'Inspecter Ma carte personnalisée' }).click();
  await expect(page.getByLabel('Carte graphique', { exact: true })).toHaveValue('');
  await page.getByLabel('Emplacement de la sortie').selectOption('motherboard');
  await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Éléments', exact: true }).click();
  await page.getByRole('button', { name: 'Source', exact: true }).click();
  await page.getByLabel('Emplacement de la sortie').selectOption('gpu');
  await expect(page.getByLabel('Carte graphique', { exact: true })).toHaveValue('');
  expect((await snapshot(page)).devices.find((device) => device.kind === 'gpu')).toEqual(gpu);
});
