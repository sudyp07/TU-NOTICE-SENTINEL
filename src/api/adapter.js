import { AppError } from './errors.js';

export class SentinelAdapter {
  constructor(github, cacheTtlMs = 30_000) {
    this.github = github;
    this.cacheTtlMs = cacheTtlMs;
    this.cache = null;
    this.cachedAt = 0;
    this.stale = false;
    this.lastReadError = null;
    this.configured = github.configured;
  }

  async readState(force = false) {
    if (!this.configured) {
      throw new AppError(503, 'GITHUB_NOT_CONFIGURED', 'Configure GitHub on the API server before using the dashboard.');
    }
    if (!force && this.cache && Date.now() - this.cachedAt < this.cacheTtlMs) return structuredClone(this.cache);
    try {
      const { state } = await this.github.readStateFile();
      this.cache = state;
      this.cachedAt = Date.now();
      this.stale = false;
      this.lastReadError = null;
      return structuredClone(state);
    } catch (error) {
      if (this.cache) {
        this.stale = true;
        this.lastReadError = error.message;
        return structuredClone(this.cache);
      }
      throw error;
    }
  }

  invalidate() {
    this.cachedAt = 0;
  }

  async getStatus() {
    const state = await this.readState();
    const [workflowResult, enabledResult] = await Promise.allSettled([
      this.github.latestWorkflowStatus(),
      this.github.getBotEnabled(),
    ]);
    const workflow = workflowResult.status === 'fulfilled'
      ? workflowResult.value
      : { state: 'error', updatedAt: null };
    const enabled = enabledResult.status === 'fulfilled' ? enabledResult.value : state.botEnabled !== false;
    return {
      ...state.status,
      configured: true,
      online: true,
      bot: workflow.state === 'running' ? 'running' : enabled ? state.status.bot : 'disabled',
      github: workflow.state,
      state: this.stale ? 'stale' : state.status.state,
      lastChecked: state.status.lastChecked || workflow.updatedAt,
      lastError: this.stale ? this.lastReadError : state.status.lastError,
      botEnabled: enabled,
    };
  }

  async listNotices() {
    return (await this.readState()).notices;
  }

  async listLogs() {
    return (await this.readState()).logs;
  }

  async listNotifications() {
    return (await this.readState()).notifications;
  }

  async clearLogs() {
    await this.github.updateState((state) => {
      state.logs = [];
      return state;
    }, 'chore: clear Sentinel logs');
    this.invalidate();
  }

  async checkNow() {
    return this.github.triggerWorkflow();
  }

  async setEnabled(enabled) {
    const result = await this.github.setBotEnabled(enabled);
    await this.github.updateState((state) => {
      state.botEnabled = Boolean(enabled);
      state.status.bot = enabled ? 'idle' : 'disabled';
      return state;
    }, `chore: ${enabled ? 'enable' : 'disable'} TU Notice Sentinel`);
    this.invalidate();
    return result;
  }

  async runTests() {
    const [state, workflow] = await Promise.all([this.readState(true), this.github.latestWorkflowStatus()]);
    return { ok: true, stateReadable: Boolean(state), workflowReachable: workflow.state !== undefined };
  }

  async recordNotification(notification) {
    await this.github.updateState((state) => {
      state.notifications.push(notification);
      state.notifications = state.notifications.slice(-200);
      if (notification.status === 'accepted') state.status.emailsSent = Number(state.status.emailsSent || 0) + 1;
      return state;
    }, 'chore: record Sentinel test email');
    this.invalidate();
  }
}
