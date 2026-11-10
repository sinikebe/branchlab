import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHANGELOG_PATH = 'src/changelog.json';
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function versionParts(value) {
  if (typeof value !== 'string' || !VERSION.test(value))
    throw new Error(`Version invalide : ${String(value)}. Format attendu : X.Y.Z.`);
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
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Check editorial structure, without pretending to judge the meaning of prose. */
export function validateEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0)
    throw new Error('Le changelog doit contenir au moins une version.');
  const versions = new Set();
  for (const [index, entry] of entries.entries()) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry) ||
      Object.keys(entry).some((key) => !['version', 'date', 'changes'].includes(key))
    )
      throw new Error(`Entrée de changelog invalide à la position ${index + 1}.`);
    versionParts(entry.version);
    if (versions.has(entry.version)) throw new Error(`Version dupliquée : ${entry.version}.`);
    versions.add(entry.version);
    if (!isDate(entry.date)) throw new Error(`Date invalide pour la version ${entry.version}.`);
    if (!Array.isArray(entry.changes) || entry.changes.length < 1 || entry.changes.length > 6)
      throw new Error(`La version ${entry.version} doit contenir entre 1 et 6 nouveautés.`);
    for (const change of entry.changes) {
      if (
        typeof change !== 'string' ||
        change !== change.trim() ||
        change.length === 0 ||
        change.length > 220 ||
        /[\r\n]/.test(change)
      )
        throw new Error(
          `La version ${entry.version} doit avoir des notes non vides de 220 caractères maximum, sur une ligne.`,
        );
    }
    if (new Set(entry.changes).size !== entry.changes.length)
      throw new Error(`Nouveauté dupliquée dans la version ${entry.version}.`);
    if (index > 0) {
      const newer = entries[index - 1];
      if (compareVersions(newer.version, entry.version) <= 0)
        throw new Error(
          'Les versions du changelog doivent être triées de la plus récente à la plus ancienne.',
        );
      if (newer.date < entry.date)
        throw new Error(
          'Les dates du changelog doivent être triées de la plus récente à la plus ancienne.',
        );
    }
  }
}

export function validateCurrentRelease({ packageJson, lockfile, entries }) {
  validateEntries(entries);
  versionParts(packageJson?.version);
  const version = packageJson.version;
  if (entries[0].version !== version)
    throw new Error(
      'La dernière entrée du changelog doit correspondre à la version de package.json.',
    );
  if (lockfile?.version !== version || lockfile?.packages?.['']?.version !== version)
    throw new Error('Les versions de package-lock.json doivent correspondre à package.json.');
}

function affectsApplication(path) {
  if (path === CHANGELOG_PATH || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path)) return false;
  return path.startsWith('src/') || path.startsWith('public/') || path === 'index.html';
}

export function validateEvolution({
  entries,
  previousEntries,
  changedPaths,
  runtimeDependenciesChanged = false,
}) {
  // The first introduction of a changelog has no older history to preserve.
  if (previousEntries === null) return;
  validateEntries(previousEntries);
  const previousVersion = previousEntries[0].version;
  const oldStart = entries.findIndex((entry) => entry.version === previousVersion);
  if (oldStart < 0 || entries.length - oldStart !== previousEntries.length)
    throw new Error(
      'Conserver toutes les anciennes versions et ajouter les nouvelles en tête du changelog.',
    );
  for (const [index, entry] of previousEntries.entries()) {
    const current = entries[oldStart + index];
    if (
      current.version !== entry.version ||
      current.date !== entry.date ||
      JSON.stringify(current.changes) !== JSON.stringify(entry.changes)
    )
      throw new Error(`L’entrée existante ${entry.version} doit être conservée sans modification.`);
  }
  if (
    (changedPaths.some(affectsApplication) || runtimeDependenciesChanged) &&
    compareVersions(entries[0].version, previousVersion) <= 0
  )
    throw new Error(
      'Une modification de l’application exige une nouvelle version et une nouvelle entrée de changelog.',
    );
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error(`Impossible de lire le fichier JSON : ${path}.`);
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
  validateCurrentRelease({
    packageJson,
    lockfile: readJson(resolve(root, 'package-lock.json')),
    entries,
  });
  if (base !== undefined) {
    let commit;
    try {
      commit = git(root, ['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]).trim();
    } catch {
      throw new Error(
        'La référence Git de comparaison est introuvable. Récupérer son historique avant de vérifier le changelog.',
      );
    }
    const exists = git(root, ['ls-tree', '-z', commit, '--', CHANGELOG_PATH]).length > 0;
    const previousEntries = exists
      ? JSON.parse(git(root, ['show', `${commit}:${CHANGELOG_PATH}`]))
      : null;
    const previousPackage = exists
      ? JSON.parse(git(root, ['show', `${commit}:package.json`]))
      : null;
    const dependencies = (pkg) =>
      JSON.stringify(
        ['dependencies', 'optionalDependencies'].map((field) =>
          Object.entries(pkg?.[field] ?? {}).sort(([a], [b]) => a.localeCompare(b)),
        ),
      );
    const changedPaths = [
      ...git(root, [
        'diff',
        '--no-renames',
        '--name-only',
        '-z',
        commit,
        '--',
        'src',
        'public',
        'index.html',
      ]).split('\0'),
      ...git(root, [
        'ls-files',
        '--others',
        '--exclude-standard',
        '-z',
        '--',
        'src',
        'public',
        'index.html',
      ]).split('\0'),
    ].filter(Boolean);
    validateEvolution({
      entries,
      previousEntries,
      changedPaths,
      runtimeDependenciesChanged: dependencies(packageJson) !== dependencies(previousPackage),
    });
  }
  return { version: entries[0].version, count: entries.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 0 && !(args.length === 2 && args[0] === '--base' && args[1]))
      throw new Error('Usage : node scripts/check-changelog.js [--base <référence Git>]');
    const result = checkChangelog({ base: args.length ? args[1] : undefined });
    process.stdout.write(`Changelog valide : v${result.version} (${result.count} versions).\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
