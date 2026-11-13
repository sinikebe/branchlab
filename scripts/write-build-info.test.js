import assert from 'node:assert/strict';
import test from 'node:test';
import { createBuildInfo } from './write-build-info.js';

const WORKERS_SHA = '0974124ff1af0c9e18bc7018aa49ff438b9d91d5';
const GITHUB_SHA = '68c94eaea85c8112872c0d829e96171a6516951a';
const LOCAL_SHA = 'b4b81cdd91526d8895fc5be69d16df9880db902e';

test('Workers Builds records production and Preview revisions without requiring main', () => {
  for (const branch of ['main', 'dev', 'feature/video']) {
    assert.deepEqual(
      createBuildInfo({
        version: '0.4.1',
        env: {
          WORKERS_CI_COMMIT_SHA: WORKERS_SHA,
          WORKERS_CI_BRANCH: branch,
          GITHUB_SHA,
          GITHUB_REF_NAME: 'other-branch',
        },
        git: () => assert.fail('Workers Builds already supplied its revision'),
      }),
      { version: '0.4.1', commit: WORKERS_SHA, branch },
    );
  }
});

test('GitHub validation records the source branch of pull requests', () => {
  assert.deepEqual(
    createBuildInfo({
      version: '0.4.1',
      env: {
        GITHUB_SHA,
        GITHUB_HEAD_REF: 'feature/video',
        GITHUB_REF_NAME: '12/merge',
      },
      git: () => assert.fail('GitHub already supplied its revision'),
    }),
    { version: '0.4.1', commit: GITHUB_SHA, branch: 'feature/video' },
  );
});

test('local builds use Git when available and keep missing metadata explicit', () => {
  assert.deepEqual(
    createBuildInfo({
      version: '0.4.1',
      env: {},
      git: (args) => (args[0] === 'rev-parse' ? LOCAL_SHA : 'dev'),
    }),
    { version: '0.4.1', commit: LOCAL_SHA, branch: 'dev' },
  );
  assert.deepEqual(createBuildInfo({ version: '0.4.1', env: {}, git: () => null }), {
    version: '0.4.1',
    commit: null,
    branch: null,
  });
});

test('a branch marker from Workers Builds falls back to a real Git revision or null', () => {
  for (const head of [LOCAL_SHA, 'main', null]) {
    assert.deepEqual(
      createBuildInfo({
        version: '0.4.1',
        env: { WORKERS_CI_COMMIT_SHA: 'main', WORKERS_CI_BRANCH: 'main', GITHUB_SHA: 'short-sha' },
        git: (args) => {
          assert.deepEqual(args, ['rev-parse', 'HEAD']);
          return head;
        },
      }),
      { version: '0.4.1', commit: head === LOCAL_SHA ? LOCAL_SHA : null, branch: 'main' },
    );
  }
});

test('an invalid Workers marker can use a valid GitHub SHA without consulting Git', () => {
  assert.deepEqual(
    createBuildInfo({
      version: '0.4.1',
      env: { WORKERS_CI_COMMIT_SHA: 'main', WORKERS_CI_BRANCH: 'main', GITHUB_SHA },
      git: () => assert.fail('GitHub already supplied a valid revision'),
    }),
    { version: '0.4.1', commit: GITHUB_SHA, branch: 'main' },
  );
});
