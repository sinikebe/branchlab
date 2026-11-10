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

async function snapshot(page: Page): Promise<Setup> {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString()) as Setup;
}

for (const gpu of ['4090', '5080'] as const) {
  test(`a user-declared DSC profile validates the RTX ${gpu} chain and remains distinct from manufacturer data`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: `RTX ${gpu} NVIDIA` }).click();
    await page.getByRole('button', { name: 'Écran', exact: true }).click();
    await page.getByLabel('Modèle d’écran').selectOption('xeneon-flex');
    await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
    await page.getByLabel('Résolution & fréquence').selectOption('uwqhd240');
    const depth = gpu === '5080' ? '10' : '8';
    await page.getByLabel('Profondeur des couleurs').selectOption(depth);
    await expect(page.locator('.result-card')).toHaveClass(/indeterminate/);
    await page.getByText('Paramètres DSC avancés', { exact: true }).click();
    await expect(page.getByLabel('Bits par pixel après compression')).toHaveValue('');
    await expect(page.getByLabel('Tranches par ligne')).toHaveValue('');

    // Deliberately supplemental user data: these are not claimed Corsair/NVIDIA specifications.
    await page.getByLabel('Bits par pixel après compression').fill('12');
    await page.getByLabel('Tranches par ligne').selectOption('4');
    await page.getByLabel('Hauteur de tranche').fill('16');
    await page.getByLabel('Voies DisplayPort utilisées').selectOption('4');
    await page
      .getByLabel('Origine du profil DSC')
      .fill('Profil synthétique du test, déclaré par l’utilisateur');
    await page.getByLabel('Je déclare ce profil accepté par les deux ports, FEC compris.').check();
    await page.getByRole('button', { name: 'Enregistrer le profil DSC', exact: true }).click();
    await expect(page.locator('.result-card')).toHaveClass(/indeterminate/);

    // DSC must not silently fill the unrelated unknown input budget or color capability.
    let project = await snapshot(page);
    let display = project.devices.find((item) => item.id === project.goal.displayDeviceId)!;
    expect(display.ports.find((port) => port.id === 'dp-in')!.maxPayloadGbps).toBeNull();
    await page.getByRole('button', { name: 'Éléments', exact: true }).click();
    await page.getByRole('button', { name: 'Écran', exact: true }).click();
    await page.getByLabel('Capacité utile de l’entrée').selectOption('25.92');
    await page
      .getByLabel('Profondeurs de couleur acceptées')
      .selectOption(depth === '10' ? '8,10' : '8');
    await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
    await expect(page.locator('.result-card')).toHaveClass(/(?<!in)compatible/);
    await expect(page.locator('.bandwidth-card')).toContainText('Avec DSC, FEC et marge');
    await expect(page.locator('.bandwidth-card')).toContainText('Sans compression');
    await expect(page.locator('.bandwidth-card')).toContainText('Déclaration utilisateur');

    await page.getByLabel('Compression DSC', { exact: true }).selectOption('off');
    await expect(page.locator('.result-card')).toHaveClass(/incompatible/);
    await page.getByLabel('Compression DSC', { exact: true }).selectOption('auto');
    await expect(page.locator('.result-card')).toHaveClass(/(?<!in)compatible/);

    project = await snapshot(page);
    display = project.devices.find((item) => item.id === project.goal.displayDeviceId)!;
    const input = display.ports.find((port) => port.id === 'dp-in')!;
    const source = project.devices.find((item) => item.id === project.goal.sourceDeviceId)!;
    expect(source.ports.find((port) => port.id === 'dp-1')!.evidence?.dsc.kind).toBe(
      'manufacturer',
    );
    expect(input.dscProfiles).toEqual(source.ports.find((port) => port.id === 'dp-1')!.dscProfiles);
    expect(input.dscProfiles?.[0]).toMatchObject({
      modeId: 'uwqhd240',
      colorDepth: Number(depth),
      source: { kind: 'user' },
    });
    expect(display.source.kind).toBe('manufacturer');
    expect(input.evidence?.supportedModeIds.kind).toBe('manufacturer');

    await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();
    await page.reload();
    await expect(page.locator('.result-card')).toHaveClass(/(?<!in)compatible/);
    expect(await snapshot(page)).toEqual(project);
    await page.locator('input[type=file]').setInputFiles({
      name: 'dsc.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project)),
    });
    expect(await snapshot(page)).toEqual(project);

    await page.getByText('Paramètres DSC avancés', { exact: true }).click();
    await page.getByRole('button', { name: 'Retirer le profil DSC utilisateur' }).click();
    await expect(page.locator('.result-card')).toHaveClass(/indeterminate/);
    await page.locator('input[type=file]').setInputFiles({
      name: 'restore-dsc.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project)),
    });
    await expect(page.locator('.result-card')).toHaveClass(/(?<!in)compatible/);

    // Selecting another physical GPU cannot transfer the old encoder's declared DSC profile.
    await page
      .getByRole('button', { name: `RTX ${gpu === '4090' ? '5080' : '4090'} NVIDIA` })
      .click();
    await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
    await expect(page.locator('.result-card')).toHaveClass(/indeterminate/);
  });
}
