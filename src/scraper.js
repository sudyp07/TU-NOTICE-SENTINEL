import { dedupeNotices, parsePage } from "./parser.js";

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchPageWithRetry(
  url,
  page,
  log,
  fetchImpl,
  maximumAttempts = 5,
) {
  let lastError;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      log.info(
        `Fetching TU notices page ${page}, attempt ${attempt}/${maximumAttempts}: ${url}`,
      );

      const response = await fetchImpl(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "User-Agent": "TU-Notice-Sentinel/3.3",
        },
        signal: AbortSignal.timeout(45_000),
      });

      if (response.ok) {
        return response;
      }

      lastError = new Error(`TU website returned HTTP ${response.status}`);

      if (
        !RETRYABLE_STATUS_CODES.has(response.status) ||
        attempt === maximumAttempts
      ) {
        throw lastError;
      }

      const retryAfter = Number(response.headers.get("retry-after"));
      const delay =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : attempt * 10_000;

      log.info(
        `TU website returned HTTP ${response.status}. Retrying in ${delay / 1000} seconds.`,
      );

      await wait(delay);
    } catch (error) {
      lastError = error;

      if (attempt === maximumAttempts) {
        throw error;
      }

      const delay = attempt * 10_000;

      log.info(
        `TU request failed: ${error.message}. Retrying in ${delay / 1000} seconds.`,
      );

      await wait(delay);
    }
  }

  throw lastError;
}

export async function fetchNotices(
  source,
  maxPages = 1,
  log = console,
  fetchImpl = fetch,
) {
  const allNotices = [];
  const visitedPages = new Set();
  const maximumAttempts = Math.max(1, Number(process.env.FETCH_RETRIES || 5));

  let url = source;

  for (
    let page = 1;
    page <= maxPages && url && !visitedPages.has(url);
    page += 1
  ) {
    visitedPages.add(url);

    try {
      const response = await fetchPageWithRetry(
        url,
        page,
        log,
        fetchImpl,
        maximumAttempts,
      );

      const result = parsePage(await response.text(), url);

      log.info(
        `Found ${result.notices.length} notice link(s) on page ${page}.`,
      );

      if (page === 1 && result.notices.length === 0) {
        throw new Error("TU website returned no notice links");
      }

      allNotices.push(...result.notices);
      url = result.nextPage;
    } catch (error) {
      if (page === 1) {
        throw error;
      }

      log.info(
        `Stopping pagination at page ${page}: ${error.message}. Previously collected notices will still be processed.`,
      );

      break;
    }
  }

  return dedupeNotices(allNotices);
}
