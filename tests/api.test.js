import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/api/app.js';

const secret = 'test-api-secret-with-at-least-24-characters';

async function fixture() {
  const calls = [];
  const adapter = {
    github: {
      triggerWorkflow: async () => ({ accepted: true, message: 'Workflow queued.' }),
      latestWorkflowStatus: async () => ({ state: 'success', status: 'completed', conclusion: 'success', runNumber: 7 }),
    },
    getStatus: async () => ({ configured: true, online: true, bot: 'idle', noticesScanned: 1, version: '3.3.0' }),
    listNotices: async () => [{ id: 'n1', title: 'TU notice', url: 'https://exam.tu.edu.np/notices/n1', bsDate: '2083-04-15' }],
    listLogs: async () => [],
    listNotifications: async () => [],
    clearLogs: async () => calls.push('clear'),
    checkNow: async () => ({ accepted: true, message: 'Workflow queued.' }),
    setEnabled: async (enabled) => ({ enabled }),
    runTests: async () => ({ ok: true }),
    recordNotification: async () => calls.push('notification'),
  };
  const app = createApp({ adapter, apiSecret: secret, tokenTtl: 60, env: {} });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}`, calls };
}

async function token(base) {
  const response = await fetch(`${base}/api/auth/token`, { method: 'POST', headers: { 'x-api-key': secret } });
  assert.equal(response.status, 200);
  return (await response.json()).token;
}

test('API protects private routes and matches the Android data contract', async (context) => {
  const { server, base } = await fixture();
  context.after(() => server.close());
  assert.equal((await fetch(`${base}/api/status`)).status, 401);
  const session = await token(base);
  const headers = { authorization: `Bearer ${session}` };
  const statusResponse = await fetch(`${base}/api/status`, { headers });
  const status = await statusResponse.json();
  assert.equal(statusResponse.status, 200);
  assert.equal(status.online, true);
  assert.equal(status.version, '3.3.0');
  const notices = await (await fetch(`${base}/api/notices`, { headers })).json();
  assert.equal(notices.total, 1);
  assert.equal(notices.notices[0].bsDate, '2083-04-15');
});

test('Run Bot endpoint queues the configured workflow', async (context) => {
  const { server, base } = await fixture();
  context.after(() => server.close());
  const session = await token(base);
  const response = await fetch(`${base}/api/check`, { method: 'POST', headers: { authorization: `Bearer ${session}` } });
  const body = await response.json();
  assert.equal(response.status, 202);
  assert.equal(body.accepted, true);
  assert.match(body.message, /queued/i);
});
