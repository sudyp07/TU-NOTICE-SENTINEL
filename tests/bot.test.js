import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runBot } from '../src/bot.js';

const notices = Array.from({ length: 12 }, (_, index) => ({
  id: String(100 - index),
  title: `Notice ${index + 1}`,
  url: `https://exam.tu.edu.np/notices/${100 - index}`,
  bsDate: '2083-04-15',
}));

test('first run emails 10 notices, persists all IDs, then prevents duplicates', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'sentinel-bot-'));
  const stateFile = path.join(directory, 'state.json');
  const sent = [];
  const options = {
    env: {
      STATE_FILE: stateFile,
      GMAIL_USER: 'sender@example.com',
      GMAIL_APP_PASSWORD: 'app-password',
      EMAIL_TO: 'recipient@example.com',
      FIRST_RUN_LIMIT: '10',
    },
    fetchNoticesImpl: async () => notices,
    sendEmailImpl: async (message) => { sent.push(message); return { accepted: ['recipient@example.com'] }; },
  };

  const first = await runBot(options);
  assert.equal(first.emailSent, true);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /Latest 10 Notices/);
  let state = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.equal(state.seenIds.length, 12);
  assert.equal(state.notifications.length, 1);

  const second = await runBot(options);
  assert.equal(second.newNotices, 0);
  assert.equal(second.emailSent, false);
  assert.equal(sent.length, 1);
  state = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.equal(state.status.newNotices, 0);
});

test('failed bot run persists failure status', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'sentinel-failure-'));
  const stateFile = path.join(directory, 'state.json');
  await assert.rejects(() => runBot({
    env: { STATE_FILE: stateFile },
    fetchNoticesImpl: async () => { throw new Error('TU website returned HTTP 503'); },
  }), /HTTP 503/);
  const state = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.equal(state.status.bot, 'failed');
  assert.equal(state.status.lastError, 'TU website returned HTTP 503');
  assert.ok(state.status.lastFailedRun);
});
