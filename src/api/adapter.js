import { emptyState, loadState, saveState, normalizeState } from '../state.js';
import { AppError } from './errors.js';
import { sendEmail } from '../mailer.js';
import { buildEmail, maskEmail } from '../email.js';

export class SentinelAdapter {
  constructor({ stateFile = process.env.STATE_FILE, intervalMs = 300000 } = {}) {
    this.stateFile = stateFile || 'data/state.json';
    this.intervalMs = intervalMs;
    this.enabled = process.env.BOT_ENABLED !== 'false';
    this.running = false;
    this.lastReadError = null;
    this.runner = null;
    this.configured = true;
  }

  attachRunner(runner) { this.runner = runner; }
  setRunning(value) { this.running = Boolean(value); }
  invalidate() { this.lastReadError = null; }

  async readState() {
    try {
      return await loadState(this.stateFile);
    } catch (error) {
      this.lastReadError = error.message;
      throw error;
    }
  }

  async writeState(mutator) {
    const current = normalizeState(await loadState(this.stateFile));
    const next = normalizeState((await mutator(current)) ?? current);
    await saveState(this.stateFile, next);
    return next;
  }

  async getStatus() {
    let state;
    try { state = await this.readState(); }
    catch { state = emptyState(); }
    return {
      ...state.status,
      configured: true,
      online: true,
      bot: this.running ? 'running' : (this.enabled ? (state.status.bot === 'failed' ? 'idle' : state.status.bot || 'idle') : 'disabled'),
      github: 'not-used',
      botEnabled: this.enabled,
      scheduler: 'local',
      intervalMs: this.intervalMs,
      state: this.lastReadError ? 'degraded' : (state.status.state || 'ready'),
      lastError: this.lastReadError || state.status.lastError || null,
    };
  }

  async listNotices() { return (await this.readState()).notices; }
  async listLogs() { return (await this.readState()).logs; }
  async listNotifications() { return (await this.readState()).notifications; }

  async clearLogs() {
    await this.writeState((state) => { state.logs = []; return state; });
  }

  async checkNow(mode = 'check') {
    if (mode === 'test-email') {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || !process.env.EMAIL_TO) {
        throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'Gmail environment variables are not configured.');
      }
      await sendEmail({
        user: process.env.GMAIL_USER,
        appPassword: process.env.GMAIL_APP_PASSWORD,
        to: process.env.EMAIL_TO,
        subject: 'TU Notice Sentinel Test Email',
        text: `TU Notice Sentinel test email\n\nSent: ${new Date().toISOString()}`,
      });
      return { accepted: true, queued: false, mode, message: 'Test email sent.' };
    }
    if (mode !== 'check') throw new AppError(400, 'INVALID_CHECK_MODE', `Unsupported mode: ${mode}`);
    if (!this.runner) throw new AppError(503, 'BOT_NOT_READY', 'Bot runner is not ready.');
    const result = await this.runner('manual');
    return { accepted: !result?.skipped, queued: false, mode, result };
  }

  async setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    await this.writeState((state) => {
      state.botEnabled = this.enabled;
      state.status.bot = this.enabled ? (this.running ? 'running' : 'idle') : 'disabled';
      return state;
    });
    return { enabled: this.enabled, control: 'local-scheduler' };
  }

  async runTests() {
    let stateReadable = false;
    let stateError = null;
    try { await this.readState(); stateReadable = true; } catch (e) { stateError = e.message; }
    return { ok: stateReadable, stateReadable, scheduler: 'local', workflowReachable: false, workflowError: null, stateError };
  }

  async recordNotification(notification) {
    await this.writeState((state) => {
      state.notifications.push(notification);
      state.notifications = state.notifications.slice(-200);
      if (notification.status === 'accepted') state.status.emailsSent = Number(state.status.emailsSent || 0) + 1;
      return state;
    });
  }
}
