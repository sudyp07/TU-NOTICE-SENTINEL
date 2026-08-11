import fs from 'node:fs/promises';
import path from 'node:path';

export function emptyState() {
  return {
    seenIds: [],
    notices: [],
    updatedAt: null,
    status: {
      configured: true,
      online: false,
      bot: 'unknown',
      website: 'unknown',
      scraper: 'unknown',
      state: 'ready',
      gmail: 'unknown',
      github: 'managed',
      lastChecked: null,
      lastSuccessfulRun: null,
      lastFailedRun: null,
      lastError: null,
      noticesScanned: 0,
      storedNotices: 0,
      newNotices: 0,
      emailsSent: 0,
      version: '3.3.2',
    },
    logs: [],
    notifications: [],
    botEnabled: true,
  };
}

export function normalizeState(value) {
  const base = emptyState();
  const parsed = value && typeof value === 'object' ? value : {};
  return {
    ...base,
    ...parsed,
    seenIds: Array.isArray(parsed.seenIds) ? parsed.seenIds : [],
    notices: Array.isArray(parsed.notices) ? parsed.notices : [],
    logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    status: { ...base.status, ...(parsed.status ?? {}) },
  };
}

export async function loadState(file) {
  try {
    return normalizeState(JSON.parse(await fs.readFile(file, 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return emptyState();
    throw error;
  }
}

export async function saveState(file, state) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(normalizeState(state), null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, file);
}

export function detectNewNotices(current, previous) {
  const seen = new Set(previous?.seenIds ?? []);
  return current.filter((notice) => notice.id && !seen.has(notice.id));
}

export function appendLog(state, level, message, timestamp = new Date().toISOString()) {
  state.logs.push({
    id: `log-${timestamp}-${state.logs.length}`,
    timestamp,
    level: ['INFO', 'WARN', 'ERROR'].includes(level) ? level : 'INFO',
    message: String(message),
  });
  state.logs = state.logs.slice(-500);
}

export function buildState(previous, current, cap = 1000, timestamp = new Date().toISOString()) {
  const state = normalizeState(previous);
  const previousById = new Map(state.notices.filter((notice) => notice.id).map((notice) => [notice.id, notice]));
  const wasSeen = new Set(state.seenIds);
  const merged = new Map();

  for (const notice of current) {
    if (!notice.id || merged.has(notice.id)) continue;
    const old = previousById.get(notice.id);
    merged.set(notice.id, {
      ...old,
      ...notice,
      isNew: !wasSeen.has(notice.id),
      isRead: Boolean(old?.isRead),
      discoveredAt: old?.discoveredAt ?? notice.discoveredAt ?? timestamp,
    });
  }
  for (const notice of state.notices) {
    if (notice.id && !merged.has(notice.id)) merged.set(notice.id, notice);
  }

  state.seenIds = [...new Set([
    ...current.map((notice) => notice.id).filter(Boolean),
    ...state.seenIds,
  ])].slice(0, cap);
  state.notices = [...merged.values()].slice(0, cap);
  state.updatedAt = timestamp;
  return state;
}
