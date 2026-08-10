import path from 'node:path';
import { buildEmail, maskEmail } from './email.js';
import { sendEmail } from './mailer.js';
import { fetchNotices } from './scraper.js';
import {
  appendLog,
  buildState,
  detectNewNotices,
  loadState,
  normalizeState,
  saveState,
} from './state.js';

const hasGmailConfig = (env) => Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD && env.EMAIL_TO);

export async function runBot({
  env = process.env,
  fetchNoticesImpl = fetchNotices,
  sendEmailImpl = sendEmail,
  now = () => new Date(),
} = {}) {
  const source = env.SOURCE_URL || 'https://exam.tu.edu.np/notices';
  const dryRun = env.DRY_RUN === 'true';
  const stateFile = env.STATE_FILE || path.resolve('data/state.json');
  const startedAt = now().toISOString();
  let previous = await loadState(stateFile);
  const pendingLogs = [];

  const log = (level, message) => {
    const line = `[${now().toISOString()}] [${level}] ${message}`;
    if (level === 'ERROR') console.error(line);
    else console.log(line);
    pendingLogs.push({ level, message, timestamp: now().toISOString() });
  };
  const logger = { info: (message) => log('INFO', message), success: (message) => log('INFO', message), error: (message) => log('ERROR', message) };

  try {
    log('INFO', 'Starting TU Notice Sentinel');
    log('INFO', `Source: ${source}`);
    log('INFO', `Dry run: ${dryRun}`);

    const current = await fetchNoticesImpl(source, Number(env.MAX_PAGES || 20), logger);
    log('INFO', `Current unique notices collected: ${current.length}`);
    log('INFO', `Previously stored notices: ${previous.seenIds.length}`);

    const firstRun = previous.seenIds.length === 0;
    let fresh = detectNewNotices(current, previous);
    if (firstRun) {
      fresh = current.slice(0, Number(env.FIRST_RUN_LIMIT || 10));
      log('INFO', `First run: ${fresh.length} latest notice(s) selected.`);
    } else {
      log('INFO', `New notices detected: ${fresh.length}`);
    }

    if (dryRun) {
      for (const [index, notice] of fresh.entries()) {
        console.log(`${index + 1}. ${notice.bsDate || notice.adDate || 'Date unavailable'} | ${notice.title}\n   ${notice.url}`);
      }
      log('INFO', 'DRY RUN: no email or state changes.');
      return { ok: true, dryRun: true, firstRun, noticesScanned: current.length, newNotices: fresh.length };
    }

    let emailSent = false;
    if (fresh.length > 0) {
      await sendEmailImpl({
        user: env.GMAIL_USER,
        appPassword: env.GMAIL_APP_PASSWORD,
        to: env.EMAIL_TO,
        ...buildEmail(fresh, firstRun),
      });
      emailSent = true;
      log('INFO', `Email sent with ${fresh.length} notice(s).`);
    } else {
      log('INFO', 'No new notices. No email sent.');
    }

    const finishedAt = now().toISOString();
    const next = buildState(previous, current, Number(env.STATE_CAP || 1000), finishedAt);
    for (const entry of pendingLogs) appendLog(next, entry.level, entry.message, entry.timestamp);
    if (emailSent) {
      next.notifications.push({
        id: `email-${Date.now()}`,
        type: 'email',
        noticeCount: fresh.length,
        timestamp: finishedAt,
        recipient: maskEmail(env.EMAIL_TO),
        status: 'accepted',
        summary: firstRun ? 'Initial notice digest' : `${fresh.length} new TU notice${fresh.length === 1 ? '' : 's'}`,
      });
      next.notifications = next.notifications.slice(-200);
    }
    next.status = {
      ...next.status,
      configured: true,
      online: true,
      bot: 'idle',
      website: 'online',
      scraper: 'success',
      state: 'saved',
      gmail: hasGmailConfig(env) ? (emailSent ? 'sent' : 'configured') : 'not-configured',
      github: env.GITHUB_ACTIONS === 'true' ? 'connected' : next.status.github,
      lastChecked: finishedAt,
      lastSuccessfulRun: finishedAt,
      lastError: null,
      noticesScanned: current.length,
      storedNotices: next.notices.length,
      newNotices: fresh.length,
      emailsSent: Number(next.status.emailsSent || 0) + (emailSent ? 1 : 0),
      version: '3.3.0',
    };
    await saveState(stateFile, next);
    log('INFO', 'State saved. Bot finished successfully.');
    return { ok: true, dryRun: false, firstRun, noticesScanned: current.length, newNotices: fresh.length, emailSent };
  } catch (error) {
    log('ERROR', error.message);
    if (!dryRun) {
      try {
        const failedAt = now().toISOString();
        previous = normalizeState(previous);
        for (const entry of pendingLogs) appendLog(previous, entry.level, entry.message, entry.timestamp);
        previous.updatedAt = failedAt;
        previous.status = {
          ...previous.status,
          configured: true,
          online: false,
          bot: 'failed',
          website: /HTTP|fetch|website/i.test(error.message) ? 'error' : previous.status.website,
          scraper: 'failed',
          state: 'error',
          gmail: hasGmailConfig(env) ? previous.status.gmail : 'not-configured',
          github: env.GITHUB_ACTIONS === 'true' ? 'connected' : previous.status.github,
          lastChecked: startedAt,
          lastFailedRun: failedAt,
          lastError: error.message,
          version: '3.3.0',
        };
        await saveState(stateFile, previous);
      } catch (stateError) {
        console.error(`[${now().toISOString()}] [ERROR] Could not save failed-run state: ${stateError.message}`);
      }
    }
    throw error;
  }
}
