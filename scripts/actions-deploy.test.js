import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACCOUNT_ID,
  credentialsReady,
  manualPublication,
  publicationTarget,
  validateBuild,
} from './actions-deploy.js';

const sha = '5cbc765fcdf21c578e5c143a6ca1d5b85d5eae8c';
const context = () => ({
  env: {
    GITHUB_REPOSITORY: 'sinikebe/branchlab',
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: sha,
  },
  event: { repository: { full_name: 'sinikebe/branchlab', private: false, visibility: 'public' } },
});

test('publication is closed for private, unknown and foreign repositories', () => {
  for (const repository of [
    {},
    { full_name: 'sinikebe/branchlab', private: true, visibility: 'private' },
    { full_name: 'other/branchlab', private: false, visibility: 'public' },
  ]) {
    const value = context();
    value.event.repository = repository;
    assert.equal(publicationTarget(value), null);
  }
});

test('only pushes to main and dev choose the existing production or Preview URL', () => {
  assert.equal(publicationTarget(context()).url, 'https://branchlab.siniverse.cc/version.json');
  const value = context();
  value.env.GITHUB_REF = 'refs/heads/dev';
  assert.equal(publicationTarget(value).url, 'https://dev.dev.branchlab.siniverse.cc/version.json');
  for (const ref of ['refs/heads/feature/x', 'refs/tags/main', 'refs/pull/1/merge']) {
    value.env.GITHUB_REF = ref;
    assert.equal(publicationTarget(value), null);
  }
});

test('pull requests, including internal ones, never authorize publication', () => {
  const value = context();
  value.env.GITHUB_EVENT_NAME = 'pull_request';
  assert.equal(publicationTarget(value), null);
});

test('manual publication is opt-in and rejects unsupported branches or missing public status', () => {
  const value = context();
  value.env.GITHUB_EVENT_NAME = 'workflow_dispatch';
  for (const deploy of [undefined, false, 'false']) {
    value.event.inputs = { deploy };
    assert.equal(publicationTarget(value), null);
  }
  value.event.inputs = { deploy: true };
  assert.equal(publicationTarget(value).sha, sha);
  assert.equal(manualPublication('workflow_dispatch', { inputs: { deploy: 'true' } }), true);
  value.env.GITHUB_REF = 'refs/heads/feature/x';
  assert.throws(() => publicationTarget(value), /main ou dev/);
  value.env.GITHUB_REF = 'refs/heads/main';
  value.event.repository.private = true;
  assert.throws(() => publicationTarget(value), /public/);
});

test('branch names cannot stand in for commit identifiers', () => {
  const value = context();
  value.env.GITHUB_SHA = 'main';
  assert.throws(() => publicationTarget(value), /SHA Git complet/);
});

test('a deployment rejects a build from another SHA, branch or application version', () => {
  const target = publicationTarget(context());
  const valid = {
    target,
    checkoutSha: sha,
    artifact: { commit: sha, branch: 'main', version: '0.3.0' },
    version: '0.3.0',
  };
  assert.doesNotThrow(() => validateBuild(valid));
  for (const invalid of [
    { ...valid, checkoutSha: 'other' },
    { ...valid, artifact: { ...valid.artifact, branch: 'dev' } },
    { ...valid, artifact: { ...valid.artifact, commit: 'other' } },
    { ...valid, artifact: { ...valid.artifact, version: '0.4.1' } },
  ]) {
    assert.throws(() => validateBuild(invalid), /ne correspondent pas/);
  }
});

test('missing secrets skip automatic pushes but fail explicit manual publication', () => {
  assert.equal(credentialsReady({ env: {}, manual: false }).ready, false);
  assert.throws(() => credentialsReady({ env: {}, manual: true }), /Secrets requis/);
  assert.throws(
    () =>
      credentialsReady({
        env: { CLOUDFLARE_API_TOKEN: 'fixture-token', CLOUDFLARE_ACCOUNT_ID: 'other-account' },
        manual: false,
      }),
    /compte Cloudflare/,
  );
  assert.equal(
    credentialsReady({
      env: { CLOUDFLARE_API_TOKEN: 'fixture-token', CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID },
      manual: true,
    }).ready,
    true,
  );
});

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'branchlab-actions-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repository = join(root, 'checkout');
  const remote = join(root, 'remote.git');
  const runGit = (args, cwd = repository) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  runGit(['init', '--bare', remote], root);
  runGit(['init', '--initial-branch=main', repository], root);
  runGit(['config', 'user.name', 'Codex']);
  runGit(['config', 'user.email', 'codex@openai.com']);
  writeFileSync(join(repository, 'source.txt'), 'first revision\n');
  runGit(['add', '.']);
  runGit(['commit', '-m', 'first revision']);
  runGit(['remote', 'add', 'origin', remote]);
  runGit(['push', 'origin', 'main']);
  const commit = runGit(['rev-parse', 'HEAD']);
  runGit(['checkout', '--detach', commit]);
  const eventPath = join(root, 'event.json');
  const output = join(root, 'output');
  writeFileSync(eventPath, JSON.stringify(context().event));
  const runGuard = () =>
    execFileSync(
      process.execPath,
      [fileURLToPath(new URL('./actions-deploy.js', import.meta.url)), 'source'],
      {
        cwd: repository,
        encoding: 'utf8',
        env: {
          ...process.env,
          ...context().env,
          GITHUB_SHA: commit,
          GITHUB_EVENT_PATH: eventPath,
          GITHUB_OUTPUT: output,
          GITHUB_STEP_SUMMARY: join(root, 'summary'),
        },
      },
    );
  return { repository, runGit, output, commit, runGuard };
}

test('the source guard accepts an immutable checkout without any build artifact', (t) => {
  const value = fixture(t);
  value.runGuard();
  assert.match(readFileSync(value.output, 'utf8'), /publish=true/);
});

test('a queued old revision is skipped after the remote branch advances', (t) => {
  const value = fixture(t);
  writeFileSync(join(value.repository, 'source.txt'), 'new revision\n');
  value.runGit(['add', '.']);
  value.runGit(['commit', '-m', 'new revision']);
  value.runGit(['push', 'origin', 'HEAD:main']);
  value.runGit(['checkout', '--detach', value.commit]);
  value.runGuard();
  assert.match(readFileSync(value.output, 'utf8'), /publish=false/);
  assert.doesNotMatch(readFileSync(value.output, 'utf8'), /publish=true/);
});
