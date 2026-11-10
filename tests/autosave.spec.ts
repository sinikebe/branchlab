import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    autosaveProbe: {
      queued: string[];
      committed: string[];
      block: () => number;
      release: (index: number) => void;
    };
  }
}

test('an older IndexedDB write cannot mark newer unsaved changes as saved', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();

  // Hold native write transactions open rather than replacing the storage API.
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('branchlab');
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const holds: { released: boolean }[] = [];
    window.autosaveProbe = {
      queued: [],
      committed: [],
      block: () => {
        const hold = { released: false };
        const index = holds.push(hold) - 1;
        const transaction = database.transaction('projects', 'readwrite');
        const store = transaction.objectStore('projects');
        const keepAlive = () => {
          const request = store.get('current');
          request.onsuccess = () => {
            if (!hold.released) keepAlive();
          };
        };
        keepAlive();
        return index;
      },
      release: (index) => {
        holds[index].released = true;
      },
    };
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      const request = originalPut.call(this, value, key);
      const name = (value as { setup?: { name?: string } })?.setup?.name;
      if (this.name === 'projects' && name) {
        window.autosaveProbe.queued.push(name);
        request.transaction?.addEventListener('complete', () => {
          window.autosaveProbe.committed.push(name);
        });
      }
      return request;
    };
    window.autosaveProbe.block();
  });

  const name = page.getByLabel('Nom du setup');
  await name.fill('Première modification');
  await page.waitForFunction(() => window.autosaveProbe.queued.includes('Première modification'));

  // This second native transaction sits after the first save and before the next.
  // It lets the first save finish while the latest save remains demonstrably pending.
  await page.evaluate(() => window.autosaveProbe.block());
  await name.fill('Dernière modification');
  await page.waitForFunction(() => window.autosaveProbe.queued.includes('Dernière modification'));
  await page.evaluate(() => window.autosaveProbe.release(0));
  await page.waitForFunction(() =>
    window.autosaveProbe.committed.includes('Première modification'),
  );
  // Allow the completed transaction's promise and React rendering to settle.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(await page.evaluate(() => window.autosaveProbe.committed)).not.toContain(
    'Dernière modification',
  );
  await expect(page.getByText('Enregistrement…', { exact: true })).toBeVisible();
  await expect(page.getByText('Enregistré sur cet appareil', { exact: true })).toHaveCount(0);

  await page.evaluate(() => window.autosaveProbe.release(1));
  await expect(page.getByText('Enregistré sur cet appareil', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.autosaveProbe.committed)).toContain(
    'Dernière modification',
  );
  await page.reload();
  await expect(name).toHaveValue('Dernière modification');
});
