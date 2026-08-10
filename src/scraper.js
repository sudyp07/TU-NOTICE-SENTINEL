import { dedupeNotices, parsePage } from './parser.js';

export async function fetchNotices(source, maxPages = 20, log = console, fetchImpl = fetch) {
  const all = [];
  const visited = new Set();
  let url = source;

  for (let page = 1; page <= maxPages && url && !visited.has(url); page += 1) {
    visited.add(url);
    log.info(`Fetching TU notices page ${page}: ${url}`);
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'TU-Notice-Sentinel/3.3',
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`TU website returned HTTP ${response.status}`);

    const pageResult = parsePage(await response.text(), url);
    log.info(`Found ${pageResult.notices.length} notice link(s) on page ${page}.`);
    all.push(...pageResult.notices);
    url = pageResult.nextPage;
  }

  return dedupeNotices(all);
}
