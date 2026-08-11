import test from 'node:test';
import assert from 'node:assert/strict';
import { SentinelAdapter } from '../src/api/adapter.js';

test('status remains online when workflow works but state file returns 404', async () => {
  const missing = Object.assign(new Error('Not Found'), { status: 404 });
  const github = {
    configured: true,
    readStateFile: async () => { throw missing; },
    latestWorkflowStatus: async () => ({ state: 'running', updatedAt: '2026-08-11T00:00:00Z' }),
    getBotEnabled: async () => true,
  };
  const status = await new SentinelAdapter(github).getStatus();
  assert.equal(status.online, true);
  assert.equal(status.bot, 'running');
  assert.equal(status.state, 'degraded');
  assert.equal(status.lastError, 'Not Found');
});

test('run tests reports state diagnostics without converting them to HTTP 404', async () => {
  const missing = Object.assign(new Error('Not Found'), { status: 404 });
  const github = {
    configured: true,
    readStateFile: async () => { throw missing; },
    latestWorkflowStatus: async () => ({ state: 'success' }),
  };
  const result = await new SentinelAdapter(github).runTests();
  assert.equal(result.ok, true);
  assert.equal(result.stateReadable, false);
  assert.equal(result.workflowReachable, true);
});
