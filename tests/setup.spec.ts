import { expect, test } from '@playwright/test';

test('source, cable, goal and screen declarations change the complete-chain diagnosis', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByText('Ce mode est disponible avec les caractéristiques renseignées.'),
  ).toBeVisible();
  await page.getByLabel('Résolution & fréquence').selectOption('4k240');
  await expect(page.locator('.result-card')).toHaveClass(/indeterminate/);
  await page.getByRole('button', { name: 'RTX 5080 NVIDIA' }).click();
  await page.getByRole('button', { name: 'Liaison', exact: true }).click();
  await page.getByLabel('Câble utilisé').selectOption('dp-uhbr20');
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await expect(page.locator('.result-card')).toHaveClass(/compatible/);
  await page.getByRole('button', { name: 'Éléments', exact: true }).click();
  await page.getByLabel('Câble utilisé').selectOption('dp-unknown');
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await expect(page.locator('.result-card')).toHaveClass(/indeterminate/);
  await page.getByRole('button', { name: 'Éléments', exact: true }).click();
  await page.getByLabel('Port de sortie').selectOption('hdmi-1');
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await expect(page.locator('.result-card')).toHaveClass(/incompatible/);
  expect(errors).toEqual([]);
});

test('screen modes, motherboard origin and local persistence remain explicit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Inspecter Écran de démonstration 4K' }).click();
  await page.getByLabel('4K · 60 Hz', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await expect(page.locator('.result-card')).toHaveClass(/incompatible/);
  await page.getByRole('button', { name: 'Éléments', exact: true }).click();
  await page.getByRole('button', { name: 'Source', exact: true }).click();
  await page.getByLabel('Emplacement de la sortie').selectOption('motherboard');
  await page.getByLabel('Nom du setup').fill('Mon bureau de test');
  await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nom du setup')).toHaveValue('Mon bureau de test');
  await page.getByRole('button', { name: 'Éléments', exact: true }).click();
  await page.getByRole('button', { name: 'Source', exact: true }).click();
  await expect(page.getByLabel('Emplacement de la sortie')).toHaveValue('motherboard');
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await page.getByLabel('Résolution & fréquence').selectOption('1080p60');
  await expect(page.locator('.result-card')).toHaveClass(/indeterminate/);
});

test('invalid imports keep the project and export produces a portable snapshot', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Nom du setup').fill('À conserver');
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":99}'),
  });
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByLabel('Nom du setup')).toHaveValue('À conserver');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('branchlab-setup.json');
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const snapshot = JSON.parse(Buffer.concat(chunks).toString());
  expect(snapshot.name).toBe('À conserver');
  expect(snapshot.devices).toHaveLength(2);
  expect(snapshot.connections).toHaveLength(1);
});

test('workspace fits desktop and mobile with working source dialog', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.equipment-node')).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Voir les sources' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Votre setup, au clair.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
});

test('unknown screen capabilities can be completed without resetting the project', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Inspecter Écran de démonstration 4K' }).click();
  await page.getByRole('button', { name: 'Marquer les caractéristiques inconnues' }).click();
  await page.getByLabel('Capacité utile de l’entrée').selectOption('25.92');
  await page.getByLabel('Protocole vidéo de l’entrée').selectOption('displayport');
  await page.getByLabel('Profondeurs de couleur acceptées').selectOption('8');
  await page.getByLabel('4K · 60 Hz', { exact: true }).check();
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await expect(page.locator('.result-card')).toHaveClass(/compatible/);
});

test('source selection survives motherboard round trip and disconnected ports can be configured', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'RTX 5080 NVIDIA' }).click();
  await page.getByLabel('Emplacement de la sortie').selectOption('motherboard');
  await page.getByLabel('Emplacement de la sortie').selectOption('gpu');
  await expect(page.getByLabel('Carte graphique', { exact: true })).toHaveValue('rtx5080');
  await page.getByRole('button', { name: 'Liaison', exact: true }).click();
  await page.getByRole('button', { name: 'Débrancher le câble' }).click();
  await page.getByLabel('Port de sortie').selectOption('hdmi-1');
  await page.getByLabel('Entrée de l’écran', { exact: true }).selectOption('hdmi-in');
  await page.getByLabel('Câble utilisé').selectOption('hdmi');
  await page.getByRole('button', { name: 'Relier les ports' }).click();
  await expect(page.getByLabel('Port de sortie')).toHaveValue('hdmi-1');
  await expect(page.getByLabel('Entrée de l’écran', { exact: true })).toHaveValue('hdmi-in');
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await expect(page.locator('.result-card')).toHaveClass(/indeterminate/);
  await expect(page.getByRole('heading', { name: 'Connecteurs incompatibles' })).toHaveCount(0);
});
