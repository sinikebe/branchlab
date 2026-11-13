import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  checkChangelog,
  validateCurrentRelease,
  validateEntries,
  validateEvolution,
} from './check-changelog.js';

const initial = {
  version: '0.1.0',
  date: '2026-11-09',
  changes: ['Créez et sauvegardez votre installation.'],
};
const next = {
  version: '0.2.0',
  date: '2026-11-10',
  changes: ['Retrouvez les nouveautés depuis le bas de la page.'],
};
const release = (entries = [next, initial]) => ({
  packageJson: { version: entries[0].version },
  lockfile: { version: entries[0].version, packages: { '': { version: entries[0].version } } },
  entries,
});

function fixture(t, withHistory = true) {
  const root = mkdtempSync(join(tmpdir(), 'branchlab-changelog-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const write = (file, value) =>
    writeFileSync(
      join(root, file),
      typeof value === 'string' ? value : `${JSON.stringify(value)}\n`,
    );
  mkdirSync(join(root, 'src'));
  write('package.json', { version: withHistory ? '0.1.0' : '0.1.0-dev' });
  write('package-lock.json', {
    version: withHistory ? '0.1.0' : '0.1.0-dev',
    packages: { '': { version: withHistory ? '0.1.0' : '0.1.0-dev' } },
  });
  write('src/App.tsx', 'export const App = () => "BranchLab";\n');
  if (withHistory) write('src/changelog.json', [initial]);
  git('init', '--initial-branch=dev');
  git('add', '.');
  git(
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.invalid',
    'commit',
    '-m',
    'Initial app',
  );
  return { root, git, write, base: git('rev-parse', 'HEAD').trim() };
}

test('accepts a concise chronological changelog matching both package manifests', () => {
  assert.doesNotThrow(() => validateCurrentRelease(release()));
  assert.doesNotThrow(() => validateEntries([{ ...initial, date: '2024-02-29' }]));
  assert.doesNotThrow(() => validateEntries([{ ...next, date: initial.date }, initial]));
});

test('rejects missing notes, excessive detail and invalid entries', () => {
  for (const changes of [
    [],
    [''],
    [' '],
    [' padded '],
    ['line one\nline two'],
    ['x'.repeat(221)],
    ['same', 'same'],
    Array.from({ length: 7 }, (_, i) => `Nouveauté ${i}`),
    null,
  ]) {
    assert.throws(() => validateEntries([{ ...next, changes }]));
  }
  for (const entries of [[], null, [null], [{ ...next, infrastructure: 'hidden field' }]]) {
    assert.throws(() => validateEntries(entries));
  }
});

test('rejects invalid calendar dates, duplicate versions and chronological mistakes', () => {
  for (const date of ['2026-02-29', '2026-11-31', '2026-13-01', '2026-1-01', 'tomorrow']) {
    assert.throws(() => validateEntries([{ ...next, date }]));
  }
  assert.throws(() => validateEntries([next, next]), /dupliquée/);
  assert.throws(() => validateEntries([initial, next]), /versions.*triées/);
  assert.throws(() => validateEntries([{ ...next, date: '2026-11-08' }, initial]), /dates.*triées/);
});

test('compares versions numerically and rejects unsupported version syntax', () => {
  assert.doesNotThrow(() =>
    validateEntries([
      { ...next, version: '0.10.0' },
      { ...initial, version: '0.9.9' },
    ]),
  );
  for (const version of [
    'v0.2.0',
    '0.2',
    '00.2.0',
    '0.2.0-dev',
    '0.2.0+build',
    '9007199254740992.1.0',
    null,
  ]) {
    assert.throws(() => validateEntries([{ ...next, version }]));
  }
});

test('rejects drift between the app version, changelog and either lockfile version', () => {
  const cases = [
    { ...release(), packageJson: { version: '0.3.0' } },
    { ...release(), lockfile: { version: '0.1.0', packages: { '': { version: '0.2.0' } } } },
    { ...release(), lockfile: { version: '0.2.0', packages: { '': { version: '0.1.0' } } } },
    { ...release(), lockfile: {} },
  ];
  for (const value of cases) assert.throws(() => validateCurrentRelease(value));
});

test('requires a new version for application changes but not tests or infrastructure', () => {
  const unchanged = { entries: [initial], previousEntries: [initial] };
  for (const file of [
    'src/App.tsx',
    'src/domain/engine.ts',
    'src/styles.css',
    'public/logo.svg',
    'index.html',
  ]) {
    assert.throws(
      () => validateEvolution({ ...unchanged, changedPaths: [file] }),
      /nouvelle version/,
    );
  }
  assert.doesNotThrow(() =>
    validateEvolution({
      ...unchanged,
      changedPaths: [
        'docs/hosting.md',
        '.github/workflows/ci.yml',
        'src/domain/engine.test.ts',
        'tests/setup.spec.ts',
        'src/changelog.json',
      ],
    }),
  );
  assert.throws(
    () => validateEvolution({ ...unchanged, changedPaths: [], runtimeDependenciesChanged: true }),
    /nouvelle version/,
  );
  assert.doesNotThrow(() =>
    validateEvolution({
      entries: [next, initial],
      previousEntries: [initial],
      changedPaths: ['src/App.tsx'],
    }),
  );
});

test('preserves every historical entry while allowing multiple new versions before publication', () => {
  const patch = {
    version: '0.2.1',
    date: '2026-11-11',
    changes: ['Retrouvez votre écran après réouverture du projet.'],
  };
  assert.doesNotThrow(() =>
    validateEvolution({
      entries: [patch, next, initial],
      previousEntries: [initial],
      changedPaths: ['src/App.tsx'],
    }),
  );
  for (const entries of [
    [next],
    [next, { ...initial, changes: ['Réécriture de l’historique.'] }],
    [next, { ...initial, date: '2026-11-08' }],
    [next, initial, { ...initial, version: '0.0.1' }],
  ]) {
    assert.throws(
      () => validateEvolution({ entries, previousEntries: [initial], changedPaths: [] }),
      /conserv/i,
    );
  }
});

test('supports the first introduction of version history and validates without Git by default', (t) => {
  const { root, write, base } = fixture(t, false);
  const value = release();
  write('src/changelog.json', value.entries);
  write('package.json', value.packageJson);
  write('package-lock.json', value.lockfile);
  assert.deepEqual(checkChangelog({ root, base }), { version: '0.2.0', count: 2 });
  rmSync(join(root, '.git'), { recursive: true, force: true });
  assert.deepEqual(checkChangelog({ root }), { version: '0.2.0', count: 2 });
});

test('compares a real Git baseline, including an untracked source file', (t) => {
  const { root, write, base } = fixture(t);
  assert.deepEqual(checkChangelog({ root, base }), { version: '0.1.0', count: 1 });
  write('src/NewFeature.tsx', 'export const NewFeature = () => "New feature";\n');
  assert.throws(() => checkChangelog({ root, base }), /nouvelle version/);
  const value = release();
  write('src/changelog.json', value.entries);
  write('package.json', value.packageJson);
  write('package-lock.json', value.lockfile);
  assert.deepEqual(checkChangelog({ root, base }), { version: '0.2.0', count: 2 });
});

test('the CLI uses the shared CI baseline unless an explicit base is provided', (t) => {
  const { root, write, base } = fixture(t);
  const cli = fileURLToPath(new URL('./check-changelog.js', import.meta.url));
  const run = (env, args = []) =>
    execFileSync(process.execPath, [cli, ...args], {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  assert.match(run({ SINIVERSE_BASE_SHA: base }), /Changelog valide/);
  assert.match(
    run({ SINIVERSE_BASE_SHA: 'missing-reference' }, ['--base', base]),
    /Changelog valide/,
  );
  write('src/App.tsx', 'export const App = () => "Unversioned change";\n');
  assert.throws(
    () => run({ SINIVERSE_BASE_SHA: base }),
    (error) => /nouvelle version/.test(error.stderr),
  );
});

test('detects runtime dependency changes without demanding a release for development tools', (t) => {
  const { root, write, base } = fixture(t);
  write('package.json', { version: '0.1.0', devDependencies: { vite: '^8.0.0' } });
  assert.doesNotThrow(() => checkChangelog({ root, base }));
  write('package.json', { version: '0.1.0', dependencies: { react: '^19.0.0' } });
  assert.throws(() => checkChangelog({ root, base }), /nouvelle version/);
});

test('treats a source file moved outside the app as an application change', (t) => {
  const { root, git, base } = fixture(t);
  git('mv', 'src/App.tsx', 'saved-example.tsx');
  assert.throws(() => checkChangelog({ root, base }), /nouvelle version/);
});

test('rejects missing baseline commits and malformed current files', (t) => {
  const { root, write } = fixture(t);
  assert.throws(() => checkChangelog({ root, base: 'does-not-exist' }), /référence Git/);
  assert.throws(() => checkChangelog({ root, base: '--output=other-file' }), /référence Git/);
  write('src/changelog.json', '{invalid');
  assert.throws(() => checkChangelog({ root }), /fichier JSON/);
});
