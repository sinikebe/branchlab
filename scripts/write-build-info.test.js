import assert from 'node:assert/strict';
import test from 'node:test';
import { createBuildInfo } from './write-build-info.js';

test('Workers Builds records production and Preview revisions without requiring main', () => {
  for (const branch of ['main', 'dev', 'feature/video']) {
    assert.deepEqual(
      createBuildInfo({
        version: '0.4.1',
        env: {
          WORKERS_CI_COMMIT_SHA: 'cloudflare-sha',
          WORKERS_CI_BRANCH: branch,
          GITHUB_SHA: 'other-sha',
          GITHUB_REF_NAME: 'other-branch',
        },
        git: () => assert.fail('Workers Builds already supplied its revision'),
      }),
      { version: '0.4.1', commit: 'cloudflare-sha', branch },
    );
  }
});

test('GitHub validation records the source branch of pull requests', () => {
  assert.deepEqual(
    createBuildInfo({
      version: '0.4.1',
      env: {
        GITHUB_SHA: 'merge-sha',
        GITHUB_HEAD_REF: 'feature/video',
        GITHUB_REF_NAME: '12/merge',
      },
      git: () => assert.fail('GitHub already supplied its revision'),
    }),
    { version: '0.4.1', commit: 'merge-sha', branch: 'feature/video' },
  );
});

test('local builds use Git when available and keep missing metadata explicit', () => {
  assert.deepEqual(
    createBuildInfo({
      version: '0.4.1',
      env: {},
      git: (args) => (args[0] === 'rev-parse' ? 'local-sha' : 'dev'),
    }),
    { version: '0.4.1', commit: 'local-sha', branch: 'dev' },
  );
  assert.deepEqual(createBuildInfo({ version: '0.4.1', env: {}, git: () => null }), {
    version: '0.4.1',
    commit: null,
    branch: null,
  });
});
