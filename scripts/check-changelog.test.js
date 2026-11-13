import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  checkChangelog, validateCurrentRelease, validateEntries, validateEvolution,
} from './check-changelog.js';

const initial = { date: '2026-11-13', changes: ['Retrouvez votre atelier et toutes ses fonctionnalités.'] };
const next = { date: '2026-11-14', changes: ['Retrouvez les sources de votre écran plus facilement.'] };
const legacy = [
  { version: '0.4.1', date: '2026-11-10', changes: ['Consultez les sorties vidéo documentées.'] },
  { version: '0.3.0', date: '2026-11-10', changes: ['Retrouvez les cartes GeForce dans le catalogue.'] },
];
const manifest = { version: '0.0.1' };
const lockfile = { version: '0.0.1', packages: { '': { version: '0.0.1' } } };

function fixture(t, oldEpoch = false) {
  const root = mkdtempSync(join(tmpdir(), 'branchlab-changelog-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  const write = (path, value) => writeFileSync(
    join(root, path),
    typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n',
  );
  mkdirSync(join(root, 'src'));
  write('package.json', oldEpoch ? { version: '0.4.1' } : manifest);
  write('package-lock.json', oldEpoch
    ? { version: '0.4.1', packages: { '': { version: '0.4.1' } } } : lockfile);
  write('src/changelog.json', oldEpoch ? legacy : [initial]);
  write('src/App.tsx', 'export const App = () => "BranchLab";\n');
  git('init', '--initial-branch=dev');
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'Initial history');
  return { root, git, write, base: git('rev-parse', 'HEAD').trim() };
}

function resetEpoch(f) {
  f.write('src/changelog-archive.json', readFileSync(join(f.root, 'src/changelog.json'), 'utf8'));
  f.write('src/changelog.json', [initial]);
  f.write('package.json', manifest);
  f.write('package-lock.json', lockfile);
}

test('active notes are dated and independent of the injected release version', () => {
  assert.doesNotThrow(() => validateCurrentRelease({
    packageJson: manifest, lockfile, entries: [next, initial], archiveEntries: legacy,
  }));
  assert.doesNotThrow(() => validateEntries([{ ...initial, date: '2024-02-29' }]));
  assert.doesNotThrow(() => validateEntries([next, { ...initial, date: next.date }]));
  assert.throws(() => validateEntries([{ ...initial, version: '0.0.1' }]), /invalide/);
});

test('editorial quality, date order and uniqueness remain protected', () => {
  for (const changes of [
    [], [''], [' '], [' padded '], ['line\nbreak'], ['x'.repeat(221)],
    ['same', 'same'], Array(7).fill('note'), null,
  ])
    assert.throws(() => validateEntries([{ ...initial, changes }]));
  for (const date of ['2026-02-29', '2026-13-01', '2026-11-31', 'today'])
    assert.throws(() => validateEntries([{ ...initial, date }]));
  for (const entries of [
    [], null, [null], [initial, initial], [initial, next],
    [{ ...initial, infrastructure: true }],
    [initial, { changes: initial.changes, date: initial.date }],
  ])
    assert.throws(() => validateEntries(entries));
});

test('the archive validates old versions separately from the new epoch', () => {
  assert.doesNotThrow(() => validateEntries(legacy, { versioned: true }));
  assert.throws(() => validateEntries([...legacy].reverse(), { versioned: true }), /versions archivées/);
  assert.throws(() => validateEntries([legacy[0], legacy[0]], { versioned: true }), /dupliquée/);
  for (const version of ['v0.1.0', '0.1', '00.1.0', '0.1.0-dev', '9007199254740992.0.0'])
    assert.throws(() => validateEntries([{ ...legacy[0], version }], { versioned: true }));
});

test('package and lock stay synchronized without tying notes to a CI version', () => {
  for (const value of [
    { packageJson: { version: '0.0.2' }, lockfile },
    { packageJson: manifest, lockfile: { ...lockfile, packages: { '': { version: '0.0.2' } } } },
    { packageJson: { version: 'main' }, lockfile },
  ])
    assert.throws(() => validateCurrentRelease({ ...value, entries: [initial] }));
});

test('functional changes still need notes but never a manual version bump', () => {
  for (const changedPaths of [['src/App.tsx'], ['public/logo.svg'], ['index.html']]) {
    assert.throws(() => validateEvolution({
      entries: [initial], previousEntries: [initial], changedPaths,
    }), /nouvelle note/);
    assert.doesNotThrow(() => validateEvolution({
      entries: [next, initial], previousEntries: [initial], changedPaths,
    }));
  }
  assert.throws(() => validateEvolution({
    entries: [initial], previousEntries: [initial], runtimeDependenciesChanged: true,
  }), /nouvelle note/);
  assert.doesNotThrow(() => validateEvolution({
    entries: [initial], previousEntries: [initial],
    changedPaths: ['docs/hosting.md', 'src/a.test.ts', 'tests/a.spec.ts'],
  }));
});

test('preserves active notes and the immutable archive after the reset', () => {
  const value = {
    entries: [next, initial], previousEntries: [initial],
    archiveEntries: legacy, previousArchiveEntries: legacy,
  };
  assert.doesNotThrow(() => validateEvolution(value));
  assert.throws(() => validateEvolution({ ...value, entries: [next] }), /anciennes notes/);
  assert.throws(() => validateEvolution({ ...value, archiveEntries: legacy.slice(1) }), /archive/);
});

test('the one-time epoch change archives all old notes and rejects loss or another reset', () => {
  const value = { entries: [initial], previousEntries: legacy, archiveEntries: legacy };
  assert.doesNotThrow(() => validateEvolution(value));
  assert.throws(() => validateEvolution({ ...value, archiveEntries: null }), /archiver exactement/);
  assert.throws(() => validateEvolution({ ...value, archiveEntries: legacy.slice(1) }), /archiver exactement/);
  assert.throws(() => validateEvolution({ ...value, previousArchiveEntries: legacy }), /archiver exactement/);
});

test('checks a real reset against Git and keeps the archived file byte-exact', (t) => {
  const f = fixture(t, true);
  resetEpoch(f);
  assert.deepEqual(checkChangelog({ root: f.root, base: f.base }), { version: '0.0.1', count: 1 });
  f.write('src/changelog-archive.json', JSON.stringify(legacy) + '\n');
  assert.throws(() => checkChangelog({ root: f.root, base: f.base }), /exactement le fichier/);
  f.write('src/changelog-archive.json', JSON.stringify(legacy, null, 2) + '\n');
  f.write('package.json', { version: '0.0.2' });
  f.write('package-lock.json', { version: '0.0.2', packages: { '': { version: '0.0.2' } } });
  assert.throws(() => checkChangelog({ root: f.root, base: f.base }), /démarrer à 0.0.1/);
});

test('detects untracked functional changes and runtime dependencies against Git', (t) => {
  const f = fixture(t);
  f.write('src/New.tsx', 'export const New = () => "New";\n');
  assert.throws(() => checkChangelog({ root: f.root, base: f.base }), /nouvelle note/);
  f.write('src/changelog.json', [next, initial]);
  assert.deepEqual(checkChangelog({ root: f.root, base: f.base }), { version: '0.0.1', count: 2 });
  rmSync(join(f.root, 'src/New.tsx'));
  f.write('src/changelog.json', [initial]);
  f.write('package.json', { ...manifest, dependencies: { react: '^19.0.0' } });
  assert.throws(() => checkChangelog({ root: f.root, base: f.base }), /nouvelle note/);
});

test('a LAN checkout from an older release keeps all its notes inside the complete archive', (t) => {
  const f = fixture(t, true);
  f.write('src/changelog.json', legacy.slice(1));
  f.git('add', '.');
  f.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'Older release');
  const base = f.git('rev-parse', 'HEAD').trim();
  f.write('src/changelog-archive.json', legacy);
  f.write('src/changelog.json', [initial]);
  f.write('package.json', manifest);
  f.write('package-lock.json', lockfile);
  assert.deepEqual(checkChangelog({ root: f.root, base }), { version: '0.0.1', count: 1 });
});

test('CLI uses the shared baseline and permits an explicit base override', (t) => {
  const f = fixture(t);
  const cli = fileURLToPath(new URL('./check-changelog.js', import.meta.url));
  const run = (env, args = []) => execFileSync(process.execPath, [cli, ...args], {
    cwd: f.root, env: { ...process.env, ...env }, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.match(run({ SINIVERSE_BASE_SHA: f.base }), /Changelog valide/);
  assert.match(run({ SINIVERSE_BASE_SHA: 'missing' }, ['--base', f.base]), /Changelog valide/);
  f.write('src/App.tsx', 'export const App = () => "Changed";\n');
  assert.throws(() => run({ SINIVERSE_BASE_SHA: f.base }), (error) => /nouvelle note/.test(error.stderr));
});

test('rejects missing bases and malformed notes without silently skipping history', (t) => {
  const f = fixture(t);
  assert.throws(() => checkChangelog({ root: f.root, base: 'missing' }), /référence Git/);
  assert.throws(() => checkChangelog({ root: f.root, base: '--output=other' }), /référence Git/);
  f.write('src/changelog.json', '{invalid');
  assert.throws(() => checkChangelog({ root: f.root }), /fichier JSON/);
});
