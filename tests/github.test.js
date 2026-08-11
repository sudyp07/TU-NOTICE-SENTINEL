import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubService } from '../src/api/github.js';

const env = {
  GITHUB_TOKEN: 'test-token',
  GITHUB_OWNER: 'owner',
  GITHUB_REPO: 'repo',
  GITHUB_WORKFLOW: 'bot.yml',
  GITHUB_REF: 'main',
  GITHUB_STATE_PATH: 'data/state.json',
};

test('GitHub service reads canonical state and dispatches the workflow', async () => {
  const calls = [];
  const state = { seenIds: ['1'], notices: [{ id: '1', title: 'Notice', url: 'https://x/notices/1' }] };
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET' });
    if (url.includes('/contents/data/state.json')) {
      return new Response(JSON.stringify({ encoding: 'base64', content: Buffer.from(JSON.stringify(state)).toString('base64'), sha: 'abc' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('/dispatches')) return new Response(null, { status: 204 });
    throw new Error(`Unexpected request: ${url}`);
  };
  const github = new GitHubService(env, fetchImpl);
  const loaded = await github.readStateFile();
  assert.deepEqual(loaded.state.seenIds, ['1']);
  const result = await github.triggerWorkflow();
  assert.equal(result.accepted, true);
  assert.ok(calls.some((call) => call.url.includes('/dispatches') && call.method === 'POST'));
});

test('GitHub service reports invalid state JSON safely', async () => {
  const github = new GitHubService(env, async () => new Response(JSON.stringify({
    encoding: 'base64',
    content: Buffer.from('{not-json').toString('base64'),
    sha: 'abc',
  }), { status: 200, headers: { 'content-type': 'application/json' } }));
  await assert.rejects(() => github.readStateFile(), (error) => error.code === 'INVALID_STATE_FILE');
});

test('GitHub service falls back to workflow control when Variables returns 404', async () => {
  const calls = [];
  const github = new GitHubService(env, async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET' });
    if (url.endsWith('/actions/variables/BOT_ENABLED')) {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/actions/variables')) {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/actions/workflows/bot.yml/disable')) {
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const result = await github.setBotEnabled(false);
  assert.equal(result.enabled, false);
  assert.equal(result.control, 'workflow');
  assert.ok(calls.some((call) => call.url.endsWith('/disable') && call.method === 'PUT'));
});
