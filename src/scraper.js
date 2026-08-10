// src/scraper.js
import { dedupeNotices, parsePage, parseNoticeDetails } from "./parser.js";

const RETRYABLE_STATUS_CODES = new Set([
  408,
  425,
  429,
  500,
  502,
  503,
  504,
]);

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Fetch a TU page with retry support.
 */
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
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(45_000),
      });

      if (response.ok) {
        return response;
      }

      lastError = new Error(
        `TU website returned HTTP ${response.status}`,
      );

      if (
        !RETRYABLE_STATUS_CODES.has(response.status) ||
        attempt === maximumAttempts
      ) {
        throw lastError;
      }

      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfter = Number(retryAfterHeader);

      const delay =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : attempt * 10_000;

      log.info(
        `TU website returned HTTP ${response.status}. Retrying in ${
          delay / 1000
        } seconds.`,
      );

      await wait(delay);
    } catch (error) {
      lastError = error;

      if (attempt === maximumAttempts) {
        throw error;
      }

      const delay = attempt * 10_000;

      log.info(
        `TU request failed: ${error.message}. Retrying in ${
          delay / 1000
        } seconds.`,
      );

      await wait(delay);
    }
  }

  throw lastError;
}

/**
 * Fetch a single notice page to get its details (especially the AD date)
 */
async function fetchNoticeDetails(notice, log, fetchImpl = fetch) {
  try {
    log.info(`Fetching notice details for ID ${notice.id}: ${notice.url}`);
    
    const response = await fetchImpl(notice.url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      log.warn(`Failed to fetch notice ${notice.id}: HTTP ${response.status}`);
      return notice;
    }

    const html = await response.text();
    const details = await parseNoticeDetails(html, notice.url);
    
    // Debug for notice 14313
    if (notice.id === '14313') {
      console.log(`\n🔍 DEBUG - Notice 14313 details:`);
      console.log(`  Title: ${details.title}`);
      console.log(`  AD Date: ${details.adDate}`);
      console.log(`  BS Date: ${details.bsDate}`);
      console.log(`  URL: ${details.url}\n`);
    }
    
    // Merge the details back into the notice
    const merged = {
      ...notice,
      adDate: details.adDate || notice.adDate || null,
      bsDate: details.bsDate || notice.bsDate || null,
      title: details.title || notice.title,
    };
    
    return merged;
  } catch (error) {
    log.warn(`Error fetching notice ${notice.id}: ${error.message}`);
    return notice;
  }
}

/**
 * Fetch and parse TU notices.
 *
 * @param {string} source
 * @param {number} maxPages
 * @param {object} log
 * @param {Function} fetchImpl
 * @returns {Promise<Array>}
 */
export async function fetchNotices(
  source,
  maxPages = 1,
  log = console,
  fetchImpl = fetch,
) {
  const allNotices = [];
  const visitedPages = new Set();

  const maximumAttempts = Math.max(
    1,
    Number(process.env.FETCH_RETRIES || 5),
  );

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

      const html = await response.text();

      const result = parsePage(html, url);

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

  // Deduplicate notices first
  const dedupedNotices = dedupeNotices(allNotices);
  log.info(`Deduplicated to ${dedupedNotices.length} unique notices`);

  // Now fetch details for each notice to get the AD date
  log.info(`Fetching details for ${dedupedNotices.length} notices...`);
  
  const noticesWithDetails = [];
  let processed = 0;
  
  for (const notice of dedupedNotices) {
    processed++;
    if (processed % 10 === 0) {
      log.info(`Processed ${processed}/${dedupedNotices.length} notices`);
    }
    
    // If the notice already has an AD date from the listing page, we can skip
    if (notice.adDate) {
      noticesWithDetails.push(notice);
      continue;
    }
    
    // Otherwise fetch the details
    const detailedNotice = await fetchNoticeDetails(notice, log, fetchImpl);
    noticesWithDetails.push(detailedNotice);
    
    // Add a small delay to avoid overwhelming the server
    await wait(500);
  }

  log.info(`Completed fetching details for ${noticesWithDetails.length} notices`);
  
  // Debug: Check if notice 14313 has a date
  const notice14313 = noticesWithDetails.find(n => n.id === '14313');
  if (notice14313) {
    console.log(`\n📋 Final check - Notice 14313:`);
    console.log(`  ID: ${notice14313.id}`);
    console.log(`  AD Date: ${notice14313.adDate}`);
    console.log(`  BS Date: ${notice14313.bsDate}`);
    console.log(`  Title: ${notice14313.title}\n`);
  }
  
  return dedupeNotices(noticesWithDetails);
}

// Also export as default for compatibility
export default fetchNotices;