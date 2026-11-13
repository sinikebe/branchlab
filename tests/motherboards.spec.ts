import { expect, test, type Page } from '@playwright/test';
import { createMotherboard, createSetup, type Setup } from '../src/domain';

async function snapshot(page: Page): Promise<Setup> {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const stream = await (await event).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString()) as Setup;
}

test('AM5 motherboard references expose their distinct video outputs and preserve sourced metadata', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('.library-sidebar')
    .getByRole('button', { name: /B850 Pro-A WiFi/ })
    .click();
  const specs = page.getByRole('region', { name: 'Caractéristiques de la carte mère' });
  await expect(specs).toContainText('AM5');
  await expect(specs).toContainText('ATX');
  await expect(
    specs.getByRole('link', { name: 'Fiche constructeur', exact: true }),
  ).toHaveAttribute('href', /asrock\.com/i);
  const asrock = await snapshot(page);
  const board = asrock.devices.find((device) => device.kind === 'motherboard')!;
  expect(board.catalogId).toBe('asrock-b850-pro-a-wifi');
  expect(board.ports.map((port) => port.connector).sort()).toEqual(['hdmi', 'usb-c']);
  expect(asrock.devices.some((device) => device.kind === 'gpu')).toBe(true);

  await page.getByLabel('Carte mère', { exact: true }).selectOption('msi-mpg-x870e-carbon-wifi');
  await expect(specs).toContainText('X870E');
  await specs.getByText('Spécifications complètes', { exact: true }).click();
  await expect(specs).toContainText('Wi-Fi 7');
  await expect(specs).toContainText('overclocking');
  await expect(specs).toContainText('processeur');
  const msi = await snapshot(page);
  const carbon = msi.devices.find((device) => device.kind === 'motherboard')!;
  expect(carbon.ports.map((port) => port.connector).sort()).toEqual(['hdmi', 'usb-c', 'usb-c']);
  expect(carbon.ports.some((port) => port.connector === 'displayport')).toBe(false);
  expect(carbon.motherboard?.source.kind).toBe('manufacturer');
  await page.getByRole('button', { name: 'Liaison', exact: true }).click();
  await expect(page.getByLabel('Port de sortie').locator('option')).toHaveCount(3);
  await page.getByLabel('Nom du setup').fill('Mon PC AM5');
  await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();
  const saved = await snapshot(page);
  await page.reload();
  await expect(page.getByLabel('Nom du setup')).toHaveValue('Mon PC AM5');
  expect(await snapshot(page)).toEqual(saved);
  await page.locator('input[type=file]').setInputFiles({
    name: 'am5.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  expect(await snapshot(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Voir les sources' }).click();
  await expect(page.getByRole('dialog').locator('a[href*="msi.com"]').first()).toBeVisible();
});

test('an edited motherboard survives GPU switching without losing the GPU or the connected display input', async ({
  page,
}) => {
  const setup = createSetup('rtx5060ti-16gb');
  const board = createMotherboard('msi-mpg-x870e-carbon-wifi');
  board.name = 'Ma CARBON personnalisée';
  board.ports[0].maxPayloadGbps = 12;
  board.ports[0].evidence = {
    maxPayloadGbps: { kind: 'user', label: 'Mesure personnelle conservée' },
  };
  setup.devices.push(board);
  setup.goal.sourceDeviceId = board.id;
  setup.connections[0].from = { deviceId: board.id, portId: board.ports[0].id };
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'edited-board.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(setup)),
  });
  await page.getByRole('button', { name: 'Inspecter Ma CARBON personnalisée' }).click();
  await expect(
    page.getByRole('region', { name: 'Caractéristiques de la carte mère' }),
  ).toContainText('Profil constructeur · modifié');
  await page.getByLabel('Emplacement de la sortie').selectOption('gpu');
  await expect(page.getByLabel('Carte graphique', { exact: true })).toHaveValue('rtx5060ti-16gb');
  await page.getByLabel('Carte graphique', { exact: true }).selectOption('rtx5090');
  expect((await snapshot(page)).devices.find((device) => device.kind === 'motherboard')).toEqual(
    board,
  );
  await page.getByLabel('Emplacement de la sortie').selectOption('motherboard');
  const restored = await snapshot(page);
  expect(restored.devices.find((device) => device.kind === 'motherboard')).toEqual(board);
  expect(restored.devices.find((device) => device.kind === 'gpu')?.catalogId).toBe('rtx5090');
  expect(restored.connections[0].to).toEqual(setup.connections[0].to);
  expect(restored.cables).toEqual(setup.cables);
  expect(restored.connections[0].from).toEqual(setup.connections[0].from);
});

test('motherboard details remain usable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Équipements', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /MSI MPG X870E CARBON WIFI/ })
    .click();
  const specs = page.getByRole('region', { name: 'Caractéristiques de la carte mère' });
  await expect(specs).toBeVisible();
  await specs.getByText('Spécifications complètes', { exact: true }).click();
  await expect(
    specs.getByRole('heading', { name: 'Connectique arrière', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
