import 'dotenv/config';
import { SentinelAdapter } from './api/adapter.js';
import { createApp } from './api/app.js';
import { runBot } from './bot.js';

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '0.0.0.0';
const intervalMs = Math.max(60_000, Number(process.env.BOT_INTERVAL_MS || 300_000));
const schedulerEnabled = process.env.BOT_SCHEDULER !== 'false';

const adapter = new SentinelAdapter({
  stateFile: process.env.STATE_FILE,
  intervalMs,
});
const app = createApp({ adapter });

let botRunning = false;
let timer = null;

async function executeBot(reason = 'scheduled') {
  if (!schedulerEnabled || !adapter.enabled) return { ok: true, skipped: true, reason: 'disabled' };
  if (botRunning) return { ok: true, skipped: true, reason: 'already-running' };

  botRunning = true;
  adapter.setRunning(true);
  try {
    console.log(`[bot] Starting ${reason} check...`);
    const result = await runBot();
    adapter.setRunning(false);
    adapter.invalidate();
    return result;
  } catch (error) {
    adapter.setRunning(false);
    adapter.invalidate();
    console.error(`[bot] ${reason} check failed: ${error.message}`);
    return { ok: false, error: error.message };
  } finally {
    botRunning = false;
  }
}

adapter.attachRunner(executeBot);

const server = app.listen(port, host, async () => {
  console.log(`TU Notice Sentinel API listening on http://${host}:${port}`);
  console.log(`Bot scheduler: ${schedulerEnabled ? `enabled (${intervalMs}ms)` : 'disabled'}`);

  if (schedulerEnabled) {
    await executeBot('startup');
    timer = setInterval(() => void executeBot('scheduled'), intervalMs);
  }
});

const shutdown = () => {
  if (timer) clearInterval(timer);
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
