import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveVersion } from '../src/version.ts';

function readGit(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function validCommit(value) {
  return typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value) ? value : null;
}

export function createBuildInfo({ version, env = process.env, git = readGit }) {
  return {
    version: resolveVersion(env.SINIVERSE_VERSION, version),
    commit:
      validCommit(env.SINIVERSE_SHA) ||
      validCommit(env.WORKERS_CI_COMMIT_SHA) ||
      validCommit(env.GITHUB_SHA) ||
      validCommit(git(['rev-parse', 'HEAD'])),
    branch:
      env.SINIVERSE_SOURCE_BRANCH ||
      env.SINIVERSE_BRANCH ||
      env.WORKERS_CI_BRANCH ||
      env.GITHUB_HEAD_REF ||
      env.GITHUB_REF_NAME ||
      git(['branch', '--show-current']) ||
      null,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  writeFileSync('dist/version.json', `${JSON.stringify(createBuildInfo({ version }))}\n`);
}
