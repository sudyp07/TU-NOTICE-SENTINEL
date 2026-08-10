import { parsePage, dedupeNotices } from "./parser.js";

const DEFAULT_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 5000;
const DEFAULT_TIMEOUT_MS = 30000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url,
  log,
  retries = DEFAULT_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "TU-Notice-Sentinel/3.2",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return response;
      }

      lastError = new Error(`TU website returned HTTP ${response.status}`);

      if (attempt < retries) {
        log.info(
          `TU request failed (${response.status}). ` +
            `Retry ${attempt}/${retries - 1} in ${retryDelayMs / 1000}s...`,
        );

        await sleep(retryDelayMs);
      }
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === "AbortError") {
        lastError = new Error(`TU request timed out after ${timeoutMs}ms`);
      } else {
        lastError = error;
      }

      if (attempt < retries) {
        log.info(
          `TU request failed: ${lastError.message}. ` +
            `Retry ${attempt}/${retries - 1} in ${retryDelayMs / 1000}s...`,
        );

        await sleep(retryDelayMs);
      }
    }
  }

  throw lastError;
}

export async function fetchNotices(source, maxPages = 20, log = console) {
  const all = [];
  let url = source;

  for (let page = 1; page <= maxPages && url; page++) {
    log.info(`Fetching TU notices page ${page}: ${url}`);

    const response = await fetchWithRetry(url, log);

    const html = await response.text();

    const parsed = parsePage(html, url);

    log.info(`Found ${parsed.notices.length} notice link(s) on page ${page}.`);

    all.push(...parsed.notices);

    if (!parsed.nextPage) {
      break;
    }

    url = parsed.nextPage;
  }

  return dedupeNotices(all);
}
