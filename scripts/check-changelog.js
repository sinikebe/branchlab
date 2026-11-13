import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHANGELOG_PATH = 'src/changelog.json';
const ARCHIVE_PATH = 'src/changelog-archive.json';
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function versionParts(value) {
  if (typeof value !== 'string' || !VERSION.test(value))
    throw new Error('Version invalide. Format attendu : X.Y.Z.');
  const parts = value.split('.').map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error('Numéro de version trop grand.');
  return parts;
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Active notes are editorial and dated; only the immutable archive carries old versions. */
export function validateEntries(entries, { versioned = false } = {}) {
  if (!Array.isArray(entries) || entries.length === 0)
    throw new Error('Le changelog doit contenir au moins une entrée.');
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    const allowed = versioned ? ['version', 'date', 'changes'] : ['date', 'changes'];
    if (
      !entry || typeof entry !== 'object' || Array.isArray(entry) ||
      Object.keys(entry).some((key) => !allowed.includes(key))
    )
      throw new Error('Entrée de changelog invalide à la position ' + (index + 1) + '.');
    if (versioned) versionParts(entry.version);
    if (!isDate(entry.date)) throw new Error('Date de changelog invalide.');
    if (!Array.isArray(entry.changes) || entry.changes.length < 1 || entry.changes.length > 6)
      throw new Error('Chaque entrée doit contenir entre une et six nouveautés.');
    for (const change of entry.changes) {
      if (
        typeof change !== 'string' || change !== change.trim() || !change.length ||
        change.length > 220 || /[\r\n]/.test(change)
      )
        throw new Error('Les notes doivent être non vides, sur une ligne et de 220 caractères maximum.');
    }
    if (new Set(entry.changes).size !== entry.changes.length)
      throw new Error('Nouveauté dupliquée.');
    const identity = versioned ? entry.version : JSON.stringify([entry.date, entry.changes]);
    if (seen.has(identity)) throw new Error('Entrée ou version dupliquée.');
    seen.add(identity);
    if (index > 0) {
      const newer = entries[index - 1];
      if (newer.date < entry.date)
        throw new Error('Les dates doivent être triées de la plus récente à la plus ancienne.');
      if (versioned && compareVersions(newer.version, entry.version) <= 0)
        throw new Error('Les versions archivées doivent être triées de la plus récente à la plus ancienne.');
    }
  }
}

export function validateCurrentRelease({ packageJson, lockfile, entries, archiveEntries = null }) {
  validateEntries(entries);
  if (archiveEntries !== null) validateEntries(archiveEntries, { versioned: true });
  versionParts(packageJson?.version);
  if (
    lockfile?.version !== packageJson.version ||
    lockfile?.packages?.['']?.version !== packageJson.version
  )
    throw new Error('Les versions de package-lock.json doivent correspondre à package.json.');
}

function affectsApplication(path) {
  if (
    [CHANGELOG_PATH, ARCHIVE_PATH].includes(path) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path)
  )
    return false;
  return path.startsWith('src/') || path.startsWith('public/') || path === 'index.html';
}

export function validateEvolution({
  entries,
  previousEntries,
  archiveEntries = null,
  previousArchiveEntries = null,
  changedPaths = [],
  runtimeDependenciesChanged = false,
}) {
  validateEntries(entries);
  if (previousEntries === null) return;
  const legacy = previousEntries.some((entry) => entry && Object.hasOwn(entry, 'version'));
  validateEntries(previousEntries, { versioned: legacy });
  if (legacy) {
    // Older LAN releases can be a suffix of the complete, published 0.4.1 archive.
    const suffix = archiveEntries?.slice(-previousEntries.length);
    if (
      previousArchiveEntries !== null ||
      archiveEntries?.[0]?.version !== '0.4.1' ||
      JSON.stringify(suffix) !== JSON.stringify(previousEntries)
    )
      throw new Error('Le changement de numérotation doit archiver exactement tout le changelog précédent.');
    return;
  }
  if (JSON.stringify(archiveEntries) !== JSON.stringify(previousArchiveEntries))
    throw new Error('Conserver l’archive de la numérotation précédente sans modification.');
  const oldStart = entries.length - previousEntries.length;
  if (oldStart < 0 || JSON.stringify(entries.slice(oldStart)) !== JSON.stringify(previousEntries))
    throw new Error('Conserver toutes les anciennes notes et ajouter les nouvelles en tête.');
  if ((changedPaths.some(affectsApplication) || runtimeDependenciesChanged) && oldStart === 0)
    throw new Error('Une modification fonctionnelle exige une nouvelle note utilisateur.');
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error('Impossible de lire le fichier JSON : ' + path + '.');
  }
}

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function checkChangelog({ root = process.cwd(), base } = {}) {
  const entries = readJson(resolve(root, CHANGELOG_PATH));
  const packageJson = readJson(resolve(root, 'package.json'));
  const archivePath = resolve(root, ARCHIVE_PATH);
  const archiveEntries = existsSync(archivePath) ? readJson(archivePath) : null;
  validateCurrentRelease({
    packageJson,
    lockfile: readJson(resolve(root, 'package-lock.json')),
    entries,
    archiveEntries,
  });
  if (base !== undefined) {
    let commit;
    try {
      commit = git(root, ['rev-parse', '--verify', '--end-of-options', base + '^{commit}']).trim();
    } catch {
      throw new Error('La référence Git de comparaison est introuvable. Récupérer son historique.');
    }
    const atBase = (path) =>
      git(root, ['ls-tree', '-z', commit, '--', path]).length
        ? git(root, ['show', commit + ':' + path]) : null;
    const previousText = atBase(CHANGELOG_PATH);
    const previousArchiveText = atBase(ARCHIVE_PATH);
    const previousEntries = previousText === null ? null : JSON.parse(previousText);
    const previousPackageText = atBase('package.json');
    const previousPackage = previousPackageText === null ? null : JSON.parse(previousPackageText);
    const dependencies = (pkg) => JSON.stringify(
      ['dependencies', 'optionalDependencies'].map((field) =>
        Object.entries(pkg?.[field] ?? {}).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
    const changedPaths = [
      ...git(root, [
        'diff', '--no-renames', '--name-only', '-z', commit,
        '--', 'src', 'public', 'index.html',
      ]).split('\0'),
      ...git(root, [
        'ls-files', '--others', '--exclude-standard', '-z',
        '--', 'src', 'public', 'index.html',
      ]).split('\0'),
    ].filter(Boolean);
    validateEvolution({
      entries,
      previousEntries,
      archiveEntries,
      previousArchiveEntries: previousArchiveText === null ? null : JSON.parse(previousArchiveText),
      changedPaths,
      runtimeDependenciesChanged: dependencies(packageJson) !== dependencies(previousPackage),
    });
    const expectedArchive = previousArchiveText ??
      (JSON.stringify(archiveEntries) === JSON.stringify(previousEntries) ? previousText : null);
    if (expectedArchive !== null) {
      const actual = readFileSync(archivePath, 'utf8').replace(/\r\n/g, '\n');
      if (actual !== expectedArchive.replace(/\r\n/g, '\n'))
        throw new Error('L’archive doit conserver exactement le fichier précédemment publié.');
    }
    if (
      previousEntries?.some((entry) => Object.hasOwn(entry, 'version')) &&
      packageJson.version !== '0.0.1'
    )
      throw new Error('La nouvelle numérotation doit démarrer à 0.0.1.');
  }
  return { version: packageJson.version, count: entries.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 0 && !(args.length === 2 && args[0] === '--base' && args[1]))
      throw new Error('Usage : node scripts/check-changelog.js [--base <référence Git>]');
    const result = checkChangelog({
      base: args.length ? args[1] : process.env.SINIVERSE_BASE_SHA || undefined,
    });
    process.stdout.write(
      'Changelog valide : ' + result.count + ' entrées, version locale v' + result.version + '.\n',
    );
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
