import { expect, test } from '@playwright/test';
import packageMetadata from '../package.json' with { type: 'json' };
import releases from '../src/changelog.json' with { type: 'json' };

const { version } = packageMetadata;

test('version notes work offline, keep the setup and return keyboard focus to the footer', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Nom du setup').fill('Mon setup conservé');
  await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();
  const footer = page.locator('.page-footer');
  await expect(footer.getByText(`v${version}`, { exact: true })).toBeVisible();
  const trigger = footer.getByRole('button', { name: `Nouveautés de la version ${version}` });
  await trigger.scrollIntoViewIfNeeded();
  await footer.screenshot({ path: testInfo.outputPath('footer-desktop.png') });
  await trigger.focus();
  await context.setOffline(true);
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Les nouveautés de BranchLab' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: `Version ${version}`, exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText('Version actuelle', { exact: true })).toHaveCount(1);
  await expect(dialog.getByText(releases[0].changes[0], { exact: true })).toBeVisible();
  const previous = releases[1];
  if (previous) {
    await expect(
      dialog.getByRole('heading', { name: `Version ${previous.version}`, exact: true }),
    ).toBeVisible();
  }
  const close = dialog.getByRole('button', { name: 'Fermer', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('changelog-desktop.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel('Nom du setup')).toHaveValue('Mon setup conservé');

  await trigger.click();
  await close.click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test.describe('mobile changelog', () => {
  test.use({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Los_Angeles' });

  test('the version stays visible and dates do not shift across time zones', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    const footer = page.locator('.page-footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByText(`v${version}`, { exact: true })).toBeVisible();
    await footer.screenshot({ path: testInfo.outputPath('footer-mobile.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await footer.getByRole('button', { name: `Nouveautés de la version ${version}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Les nouveautés de BranchLab' });
    await expect(dialog).toBeVisible();
    const expectedDate = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${releases[0].date}T00:00:00Z`));
    await expect(dialog.locator('time').first()).toHaveText(expectedDate);
    await expect(dialog.locator('time').first()).toHaveAttribute('datetime', releases[0].date);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const bounds = await dialog.boundingBox();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: testInfo.outputPath('changelog-mobile.png'), fullPage: true });
    // The backdrop remains a way to close on touch screens.
    await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(dialog).toHaveCount(0);
  });
});
