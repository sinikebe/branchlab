import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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

export function createBuildInfo({ version, env = process.env, git = readGit }) {
  return {
    version,
    commit: env.WORKERS_CI_COMMIT_SHA || env.GITHUB_SHA || git(['rev-parse', 'HEAD']) || null,
    branch:
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
