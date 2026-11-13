import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REPOSITORY = 'sinikebe/branchlab';
export const ACCOUNT_ID = 'bbc2341709439fad81d7aebc62efb873';

export function manualPublication(eventName, event) {
  return eventName === 'workflow_dispatch' && [true, 'true'].includes(event.inputs?.deploy);
}

export function publicationTarget({ env, event }) {
  const manual = manualPublication(env.GITHUB_EVENT_NAME, event);
  if (
    env.GITHUB_REPOSITORY !== REPOSITORY ||
    event.repository?.full_name !== REPOSITORY ||
    event.repository?.private !== false ||
    event.repository?.visibility !== 'public'
  ) {
    if (manual) throw new Error('La publication nécessite le dépôt BranchLab public.');
    return null;
  }
  if (env.GITHUB_EVENT_NAME !== 'push' && !manual) return null;
  const branch = { 'refs/heads/main': 'main', 'refs/heads/dev': 'dev' }[env.GITHUB_REF];
  if (!branch) {
    if (manual) throw new Error('Choisir main ou dev pour une publication manuelle.');
    return null;
  }
  if (!/^[a-f0-9]{40}$/i.test(env.GITHUB_SHA ?? '')) {
    throw new Error('La publication nécessite un SHA Git complet.');
  }
  return {
    branch,
    sha: env.GITHUB_SHA,
    url:
      branch === 'main'
        ? 'https://branchlab.siniverse.cc/version.json'
        : 'https://dev.dev.branchlab.siniverse.cc/version.json',
  };
}

export function validateBuild({ target, checkoutSha, artifact, version }) {
  if (
    checkoutSha !== target.sha ||
    artifact.commit !== target.sha ||
    artifact.branch !== target.branch ||
    artifact.version !== version
  ) {
    throw new Error(
      'Le checkout, la branche et les métadonnées de l’artefact ne correspondent pas.',
    );
  }
}

export function credentialsReady({ env, manual }) {
  const missing = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'].filter(
    (key) => !env[key]?.trim(),
  );
  if (missing.length) {
    if (manual)
      throw new Error(`Secrets requis pour la publication demandée : ${missing.join(', ')}.`);
    return {
      ready: false,
      message: `Publication ignorée : secrets absents (${missing.join(', ')}).`,
    };
  }
  if (env.CLOUDFLARE_ACCOUNT_ID !== ACCOUNT_ID) {
    throw new Error('Le compte Cloudflare ne correspond pas au Worker BranchLab existant.');
  }
  return { ready: true, message: 'Secrets disponibles pour le compte attendu.' };
}

function report(values, message) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(values)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(''),
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
  }
  process.stdout.write(`${message}\n`);
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

async function verifyPublished(target) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const response = await fetch(`${target.url}?revision=${target.sha}`, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const artifact = await response.json();
      const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
      validateBuild({ target, checkoutSha: target.sha, artifact, version });
      report({}, `Publication vérifiée : ${target.url}, SHA ${target.sha}.`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 5) await new Promise((done) => setTimeout(done, 5000));
    }
  }
  throw new Error(`La version publiée n’a pas pu être confirmée : ${lastError.message}`);
}

async function main() {
  const env = process.env;
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  const mode = process.argv[2] ?? 'preflight';
  if (mode === 'credentials') {
    const result = credentialsReady({
      env,
      manual: manualPublication(env.GITHUB_EVENT_NAME, event),
    });
    report({ ready: result.ready }, result.message);
    return;
  }
  const target = publicationTarget({ env, event });
  if (mode === 'request') {
    report(
      {},
      target ? `Cible demandée : ${target.branch}.` : 'Validation seule, sans publication.',
    );
    return;
  }
  if (!target) {
    if (mode === 'verify') throw new Error('Aucune cible autorisée à vérifier.');
    report({ publish: false }, 'Aucune publication autorisée pour cet événement.');
    return;
  }
  if (mode === 'verify') return verifyPublished(target);
  if (!['source', 'preflight'].includes(mode)) throw new Error('Mode de publication inconnu.');
  const checkoutSha = git(['rev-parse', 'HEAD']);
  if (checkoutSha !== target.sha) throw new Error('Le checkout ne correspond pas au SHA demandé.');
  if (mode === 'preflight') {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
    validateBuild({
      target,
      checkoutSha,
      artifact: JSON.parse(readFileSync('dist/version.json', 'utf8')),
      version,
    });
  }
  const latest = git(['ls-remote', '--exit-code', 'origin', `refs/heads/${target.branch}`]).split(
    /\s+/,
  )[0];
  if (latest !== target.sha) {
    report(
      { publish: false },
      'Publication ignorée : une révision plus récente existe sur la branche.',
    );
    return;
  }
  report(
    { publish: true, branch: target.branch },
    `Révision validée pour ${target.branch} : ${target.sha}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    report({}, error.message);
    process.exitCode = 1;
  });
}
