import { normalizeState } from '../state.js';
import { AppError } from './errors.js';

export class GitHubService {
  constructor(env = process.env, fetchImpl = fetch) {
    this.fetch = fetchImpl;
    this.token = env.GITHUB_TOKEN;
    this.owner = env.GITHUB_OWNER;
    this.repo = env.GITHUB_REPO;
    this.workflow = env.GITHUB_WORKFLOW || 'bot.yml';
    this.ref = env.GITHUB_REF || 'main';
    this.statePath = env.GITHUB_STATE_PATH || 'data/state.json';
  }

  get configured() {
    return Boolean(this.token && this.owner && this.repo && this.workflow && this.ref);
  }

  requireConfig() {
    if (!this.configured) {
      throw new AppError(503, 'GITHUB_NOT_CONFIGURED', 'GitHub Actions control is not configured on the server.');
    }
  }

  async request(path, init = {}, allowNotFound = false) {
    this.requireConfig();
    const response = await this.fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'tu-notice-sentinel-api/3.3',
        ...init.headers,
      },
    });
    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new AppError(response.status, 'GITHUB_API_ERROR', body.message || `GitHub returned ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
  }

  repositoryPath(suffix) {
    return `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}${suffix}`;
  }

  async triggerWorkflow() {
    await this.request(this.repositoryPath(`/actions/workflows/${encodeURIComponent(this.workflow)}/dispatches`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: this.ref }),
    });
    return { accepted: true, message: `Workflow ${this.workflow} was queued.` };
  }

  async latestWorkflowStatus() {
    const data = await this.request(this.repositoryPath(`/actions/workflows/${encodeURIComponent(this.workflow)}/runs?per_page=1`));
    const run = data.workflow_runs?.[0];
    if (!run) return { state: 'unknown', status: null, conclusion: null, updatedAt: null, url: null, runNumber: null };
    return {
      state: run.status !== 'completed' ? 'running' : run.conclusion === 'success' ? 'success' : 'failed',
      status: run.status,
      conclusion: run.conclusion,
      updatedAt: run.updated_at,
      url: run.html_url,
      runNumber: run.run_number,
    };
  }

  async readStateFile() {
    const file = await this.request(this.repositoryPath(`/contents/${this.statePath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(this.ref)}`));
    if (!file?.content || file.encoding !== 'base64') {
      throw new AppError(502, 'INVALID_STATE_FILE', 'GitHub did not return a valid bot state file.');
    }
    try {
      const json = Buffer.from(file.content.replace(/\s+/g, ''), 'base64').toString('utf8');
      return { state: normalizeState(JSON.parse(json)), sha: file.sha };
    } catch {
      throw new AppError(502, 'INVALID_STATE_FILE', 'The bot state file contains invalid JSON.');
    }
  }

  async updateState(mutator, message) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const current = await this.readStateFile();
      const next = normalizeState(await mutator(normalizeState(current.state)) ?? current.state);
      try {
        await this.request(this.repositoryPath(`/contents/${this.statePath.split('/').map(encodeURIComponent).join('/')}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            content: Buffer.from(`${JSON.stringify(next, null, 2)}\n`).toString('base64'),
            sha: current.sha,
            branch: this.ref,
          }),
        });
        return next;
      } catch (error) {
        if (![409, 422].includes(error.status) || attempt === 3) throw error;
      }
    }
    throw new AppError(409, 'STATE_UPDATE_CONFLICT', 'The bot state changed while it was being updated.');
  }

  async getBotEnabled() {
    const variable = await this.request(this.repositoryPath('/actions/variables/BOT_ENABLED'), {}, true);
    return variable ? variable.value !== 'false' : true;
  }

  async setBotEnabled(enabled) {
    const endpoint = this.repositoryPath('/actions/variables/BOT_ENABLED');
    const existing = await this.request(endpoint, {}, true);
    if (existing) {
      await this.request(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'BOT_ENABLED', value: String(Boolean(enabled)) }),
      });
    } else {
      await this.request(this.repositoryPath('/actions/variables'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'BOT_ENABLED', value: String(Boolean(enabled)) }),
      });
    }
    return { enabled: Boolean(enabled) };
  }
}
