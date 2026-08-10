// src/parser.js
import * as cheerio from "cheerio";
import { extractADDate, extractBSDate, normalizeNepaliDigits, isBSDate, extractTUDate } from "./dates.js";

/**
 * Clean whitespace.
 */
function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check whether a hostname belongs to TU's exam website.
 */
function isTUHost(hostname = "") {
  const host = String(hostname).toLowerCase();

  return (
    host === "exam.tu.edu.np" ||
    host === "www.exam.tu.edu.np"
  );
}

/**
 * Check whether a URL is a TU notice URL.
 */
function isTUNoticeUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(String(url));

    if (!isTUHost(parsed.hostname)) {
      return false;
    }

    return /^\/notices\/[^/]+\/?$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Extract notice ID from a TU notice URL.
 *
 * Supports:
 *
 * https://exam.tu.edu.np/notices/14313
 *
 * and Markdown:
 *
 * [https://exam.tu.edu.np/notices/14313](https://exam.tu.edu.np/notices/14313)
 */
export function extractNoticeId(url = "") {
  if (!url) {
    return null;
  }

  let text = String(url).trim();

  const markdownMatch = text.match(
    /^\[([^\]]+)\]\(([^)]+)\)$/
  );

  if (markdownMatch) {
    text = markdownMatch[1].trim();
  }

  try {
    const parsed = new URL(text);

    if (!isTUHost(parsed.hostname)) {
      return null;
    }

    const match = parsed.pathname.match(
      /^\/notices\/([^/]+)\/?$/i
    );

    if (!match) {
      return null;
    }

    return decodeURIComponent(match[1]);
  } catch {
    const match = text.match(
      /\/notices\/([^/?#]+)\/?(?:[?#].*)?$/i
    );

    if (!match) {
      return null;
    }

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
}

/**
 * Convert a relative URL into an absolute URL.
 *
 * Also supports Markdown-formatted URLs used by tests/logs.
 */
export function absoluteUrl(href, base) {
  if (!href || !base) {
    return null;
  }

  let normalizedHref = String(href).trim();
  let normalizedBase = String(base).trim();

  const hrefMarkdown = normalizedHref.match(
    /^\[([^\]]+)\]\(([^)]+)\)$/
  );

  if (hrefMarkdown) {
    normalizedHref = hrefMarkdown[1].trim();
  }

  const baseMarkdown = normalizedBase.match(
    /^\[([^\]]+)\]\(([^)]+)\)$/
  );

  if (baseMarkdown) {
    normalizedBase = baseMarkdown[1].trim();
  }

  try {
    return new URL(
      normalizedHref,
      normalizedBase
    ).href;
  } catch {
    return null;
  }
}

/**
 * Enhanced date extraction from text with direct AD date detection.
 * 
 * This function now handles:
 * - YYYY-MM-DD format (direct detection) but ONLY for AD dates
 * - YYYY/MM/DD format but ONLY for AD dates
 * - Various date formats found on TU website
 * 
 * CRITICAL: Does NOT use Date() constructor to avoid timezone issues
 * CRITICAL: BS dates (2080+) are rejected
 */
function extractDateFromText(text) {
  const cleaned = cleanText(text);

  if (!cleaned) {
    return null;
  }

  // DIRECT DETECTION: Check for YYYY-MM-DD format
  const adDateMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (adDateMatch) {
    const year = parseInt(adDateMatch[1]);
    const month = parseInt(adDateMatch[2]);
    const day = parseInt(adDateMatch[3]);
    
    // CRITICAL: Reject BS dates (years >= 2080)
    if (year >= 2080) {
      return null; // This is a BS date, reject it
    }
    if (year < 1900) {
      return null; // Too old to be valid
    }
    
    // Validate month and day ranges
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    
    // Return the date as-is, no Date object conversion
    return adDateMatch[0];
  }

  // DIRECT DETECTION: Check for YYYY/MM/DD format
  const adSlashMatch = cleaned.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (adSlashMatch) {
    const year = parseInt(adSlashMatch[1]);
    const month = parseInt(adSlashMatch[2]);
    const day = parseInt(adSlashMatch[3]);
    
    // CRITICAL: Reject BS dates (years >= 2080)
    if (year >= 2080) {
      return null;
    }
    if (year < 1900) {
      return null;
    }
    
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    
    return `${adSlashMatch[1]}-${adSlashMatch[2]}-${adSlashMatch[3]}`;
  }

  // Check for DD-MM-YYYY or DD/MM/YYYY format
  const dayMonthYearMatch = cleaned.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (dayMonthYearMatch) {
    const day = parseInt(dayMonthYearMatch[1]);
    const month = parseInt(dayMonthYearMatch[2]);
    const year = parseInt(dayMonthYearMatch[3]);
    
    // CRITICAL: Reject BS dates (years >= 2080)
    if (year >= 2080) {
      return null;
    }
    if (year < 1900) {
      return null;
    }
    
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Fallback: Use extractADDate (which also avoids Date object)
  return extractADDate(cleaned);
}

/**
 * Find a likely notice container around an anchor.
 *
 * We search several common structures because TU's HTML may
 * change between deployments.
 */
function findNoticeContainer($, anchor) {
  const element = $(anchor);

  if (!element.length) {
    return $();
  }

  const selectors = [
    "article",
    "li",
    "tr",
    ".notice",
    ".notice-item",
    ".notice-list-item",
    ".news-item",
    ".news-list-item",
    ".blog-item",
    ".post-item",
    ".item",
    ".card",
    ".media",
    ".list-group-item",
  ];

  for (const selector of selectors) {
    const closest = element.closest(selector);

    if (closest.length) {
      return closest.first();
    }
  }

  /*
   * If no semantic container exists, use a few parent levels.
   */
  let current = element.parent();

  for (let depth = 0; depth < 4 && current.length; depth += 1) {
    const text = cleanText(current.text());

    /*
     * Avoid jumping all the way to body/html.
     */
    if (
      text &&
      text.length <= 2000
    ) {
      return current;
    }

    current = current.parent();
  }

  return element.parent();
}

/**
 * Find a dedicated date element.
 *
 * This is the safest source because it prevents a BS date
 * elsewhere in the notice from interfering.
 * 
 * UPDATED: Added .nep_date selector for TU's specific date format
 */
function findDateElement($, anchor) {
  const element = $(anchor);

  if (!element.length) {
    return $();
  }

  // IMPORTANT: Added .nep_date to support TU's specific date format
  const dateSelectors = [
    ".date",
    ".nep_date",           // ← CRITICAL FIX: TU uses this class for dates
    ".notice-date",
    ".notice_date",
    ".publish-date",
    ".published-date",
    ".posted-date",
    ".post-date",
    ".date-posted",
    ".publication-date",
    ".published",
    ".posting-date",
    ".entry-date",
    ".news-date",
    "[class*='date']",
    "[class*='Date']",
    "time",
  ];

  const container = findNoticeContainer($, anchor);

  if (container.length) {
    for (const selector of dateSelectors) {
      const node = container
        .find(selector)
        .filter((_, element) => {
          const text = cleanText($(element).text());

          return Boolean(
            extractDateFromText(text)
          );
        })
        .first();

      if (node.length) {
        return node;
      }
    }
  }

  /*
   * Search direct parent.
   */
  const parent = element.parent();

  if (parent.length) {
    for (const selector of dateSelectors) {
      const node = parent
        .find(selector)
        .filter((_, element) => {
          const text = cleanText($(element).text());

          return Boolean(
            extractDateFromText(text)
          );
        })
        .first();

      if (node.length) {
        return node;
      }
    }
  }

  /*
   * Search siblings.
   */
  let current = element;

  for (
    let depth = 0;
    depth < 4 && current.length;
    depth += 1
  ) {
    for (const selector of dateSelectors) {
      const sibling = current
        .siblings(selector)
        .filter((_, element) => {
          const text = cleanText($(element).text());

          return Boolean(
            extractDateFromText(text)
          );
        })
        .first();

      if (sibling.length) {
        return sibling;
      }
    }

    current = current.parent();
  }

  return $();
}

/**
 * Extract an AD date associated with a notice.
 *
 * Priority:
 *
 * 1. Dedicated date element (now includes .nep_date)
 * 2. Notice title
 * 3. Anchor attributes
 * 4. Nearby siblings
 * 5. Notice container
 *
 * BS dates are never converted.
 */
function findADDate($, anchor, title) {
  /*
   * ---------------------------------------------------------
   * 1. Dedicated date element (UPDATED with .nep_date support)
   * ---------------------------------------------------------
   */
  const dateElement = findDateElement($, anchor);

  if (dateElement.length) {
    const dateText = cleanText(
      dateElement.text()
    );

    const date = extractDateFromText(dateText);

    if (date) {
      return date;
    }
  }

  /*
   * ---------------------------------------------------------
   * 2. Notice title
   * ---------------------------------------------------------
   *
   * Example:
   *
   * "TU Exam Notice - 30 July 2026"
   */
  const titleDate = extractDateFromText(title);

  if (titleDate) {
    return titleDate;
  }

  /*
   * ---------------------------------------------------------
   * 3. Check useful HTML attributes
   * ---------------------------------------------------------
   *
   * Some websites store dates in:
   *
   * datetime=""
   * data-date=""
   * data-published=""
   * data-publish-date=""
   * title=""
   */
  const element = $(anchor);

  const attributes = [
    "datetime",
    "data-date",
    "data-datetime",
    "data-published",
    "data-publish-date",
    "data-posted",
    "title",
    "aria-label",
  ];

  for (const attribute of attributes) {
    const value = element.attr(attribute);

    const date = extractDateFromText(value);

    if (date) {
      return date;
    }
  }

  /*
   * ---------------------------------------------------------
   * 4. Nearby siblings
   * ---------------------------------------------------------
   */
  const siblingNodes = [
    element.prev(),
    element.next(),
    element.prev().prev(),
    element.next().next(),
  ];

  for (const node of siblingNodes) {
    if (!node || !node.length) {
      continue;
    }

    const text = cleanText(node.text());

    const date = extractDateFromText(text);

    if (date) {
      return date;
    }
  }

  /*
   * ---------------------------------------------------------
   * 5. Inspect the notice container
   * ---------------------------------------------------------
   *
   * This is intentionally LAST.
   *
   * extractADDate() rejects BS dates, so a container such as:
   *
   * Published: 30 July 2026
   * मिति: 2083-04-15
   *
   * can safely return:
   *
   * 2026-07-30
   */
  const container = findNoticeContainer(
    $,
    anchor
  );

  if (container.length) {
    const containerText = cleanText(
      container.text()
    );

    const date = extractDateFromText(
      containerText
    );

    if (date) {
      return date;
    }
  }

  /*
   * No AD date found.
   */
  return null;
}

/**
 * Find explicit next page.
 */
function findNextPage($, pageUrl) {
  let nextPage = null;

  /*
   * Preferred:
   *
   * <a rel="next" href="...">
   */
  $('a[rel~="next"]').each((_, element) => {
    if (nextPage) {
      return;
    }

    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    const absolute = absoluteUrl(
      href,
      pageUrl
    );

    if (absolute) {
      nextPage = absolute;
    }
  });

  if (nextPage) {
    return nextPage;
  }

  /*
   * Fallback text.
   */
  const nextTexts = new Set([
    "next",
    "next page",
    "older",
    "›",
    "»",
    "अर्को",
    "अर्को पृष्ठ",
  ]);

  $("a[href]").each((_, element) => {
    if (nextPage) {
      return;
    }

    const text = cleanText(
      $(element).text()
    ).toLowerCase();

    if (!nextTexts.has(text)) {
      return;
    }

    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    const absolute = absoluteUrl(
      href,
      pageUrl
    );

    if (absolute) {
      nextPage = absolute;
    }
  });

  return nextPage;
}

/**
 * Parse one TU notice listing page.
 *
 * Returned notice:
 *
 * {
 *   id,
 *   title,
 *   url,
 *   adDate
 * }
 *
 * BS dates are deliberately not stored.
 */
export function parsePage(html, pageUrl) {
  const $ = cheerio.load(
    String(html || "")
  );

  const notices = [];
  const seen = new Set();

  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href");

    if (!href) {
      return;
    }

    /*
     * Resolve relative URL.
     */
    const url = absoluteUrl(
      href,
      pageUrl
    );

    if (!url) {
      return;
    }

    /*
     * Only accept TU notice URLs.
     */
    if (!isTUNoticeUrl(url)) {
      return;
    }

    /*
     * Extract notice ID.
     */
    const id = extractNoticeId(url);

    if (!id || seen.has(id)) {
      return;
    }

    /*
     * Extract title.
     */
    const title = cleanText(
      $(anchor).text()
    );

    if (!title) {
      return;
    }

    /*
     * Extract AD date.
     */
    const adDate = findADDate(
      $,
      anchor,
      title
    );

    notices.push({
      id,
      title,
      url,
      adDate,
    });

    seen.add(id);
  });

  return {
    notices,
    nextPage: findNextPage(
      $,
      pageUrl
    ),
  };
}

/**
 * Parse a single notice page for its details (especially the AD date and correct title)
 * 
 * This function is exported and used by scraper.js to fetch individual
 * notice pages and extract the AD date from the full page HTML.
 * 
 * CRITICAL: Does NOT use Date() constructor to avoid timezone issues
 * CRITICAL: Extracts the correct notice title, not the page title
 */
export async function parseNoticeDetails(html, url) {
  const $ = cheerio.load(String(html || ""));
  
  // Extract title from the page - PRIORITY: Look for the actual notice title
  let title = null;
  
  // METHOD 1: Look for the notice title in the page content
  // TU often puts the notice title in a heading or paragraph with the notice content
  const possibleTitleSelectors = [
    '.notice-title',
    '.notice-heading',
    '.news-title',
    '.post-title',
    '.entry-title',
    'h1.entry-title',
    'h1.post-title',
    'h2.entry-title',
    'h2.post-title',
    '.page-header h1',
    '.content h1',
    '.content h2',
    '.main-content h1',
    '.main-content h2',
    'article h1',
    'article h2',
    '.container h1',
    '.container h2',
    // TU specific: look for the main heading in the content area
    '.main-content .page-header h1',
    '.container .page-header h1',
    '.row .col-md-8 h1',
    '.row .col-md-8 h2',
    // Look for any heading that contains the notice text
    'h1:not(:has(img))',
    'h2:not(:has(img))',
    'h3:not(:has(img))',
    // Look for the first paragraph that might contain the title
    '.content p:first-child',
    '.main-content p:first-child',
  ];
  
  for (const selector of possibleTitleSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      const text = cleanText(element.first().text());
      // Skip if it's too short or looks like a generic label
      if (text && text.length > 10 && !/^(office|controller|examination|notice|home|dashboard|login|register)/i.test(text)) {
        title = text;
        break;
      }
    }
  }
  
  // METHOD 2: Look for the notice title in the main content area
  if (!title) {
    // Find the main content area
    const mainContent = $('.main-content, .content, .container .row, article, .post, .entry');
    if (mainContent.length > 0) {
      // Look for the first heading that's not the page title
      const headings = mainContent.find('h1, h2, h3');
      for (let i = 0; i < headings.length; i++) {
        const text = cleanText($(headings[i]).text());
        if (text && text.length > 10 && !/^(office|controller|examination|notice|home|dashboard)/i.test(text)) {
          title = text;
          break;
        }
      }
    }
  }
  
  // METHOD 3: Look for the title in the URL if it's a number
  if (!title || /^notice\s+\d+$/i.test(title)) {
    const urlMatch = url.match(/\/notices\/(\d+)/);
    if (urlMatch) {
      // Try to find the title from the listing page by checking the link text
      // But since we don't have that here, use a placeholder
      title = `Notice ${urlMatch[1]}`;
    }
  }
  
  // METHOD 4: Fallback to the page title only if we have nothing better
  if (!title || /^notice\s+\d+$/i.test(title) || /^office of the controller/i.test(title)) {
    const pageTitle = $('title').first().text().trim();
    // If the page title contains "Office of the Controller", skip it
    if (!/office of the controller/i.test(pageTitle) && !/controller of examinations/i.test(pageTitle)) {
      title = pageTitle;
    }
  }
  
  // Final fallback
  if (!title || /^office of the controller/i.test(title)) {
    const urlMatch = url.match(/\/notices\/(\d+)/);
    title = urlMatch ? `Notice ${urlMatch[1]}` : 'TU Notice';
  }
  
  // Clean up the title - remove any extra text
  if (title) {
    // Remove common prefixes
    title = title.replace(/^(notice|news|post|article)\s*[:：]\s*/i, '');
    // Remove trailing separators
    title = title.replace(/[||-]\s*$/, '');
    // Remove extra whitespace
    title = cleanText(title);
  }
  
  // Look for AD date in the page - DIRECT APPROACH
  let adDate = null;
  let bsDate = null;
  
  // Get the page text once
  const pageText = $('body').text();
  
  // METHOD 1: Look for .nep_date class (TU's primary date format)
  const nepDateElements = $('.nep_date');
  if (nepDateElements.length > 0) {
    const dateText = cleanText(nepDateElements.first().text());
    
    // Extract date directly without any conversion
    const dateMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const year = parseInt(dateMatch[1]);
      // Reject BS dates (years >= 2080)
      if (year < 2080 && year >= 1900) {
        // Use the exact date as-is, no conversion
        adDate = dateMatch[0];
      }
    }
  }
  
  // METHOD 2: Look for any date in .date or other classes
  if (!adDate) {
    const dateElements = $('.date, [class*="date"]');
    dateElements.each((_, element) => {
      const text = cleanText($(element).text());
      const dateMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1]);
        if (year < 2080 && year >= 1900) {
          adDate = dateMatch[0];
          return false; // break loop
        }
      }
    });
  }
  
  // METHOD 3: Search the entire page for any AD date
  if (!adDate) {
    const allDates = pageText.match(/(\d{4})-(\d{2})-(\d{2})/g);
    if (allDates) {
      // Find the first AD date (year < 2080)
      for (const dateStr of allDates) {
        const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          const year = parseInt(match[1]);
          if (year < 2080 && year >= 1900) {
            adDate = dateStr;
            break;
          }
        }
      }
    }
  }
  
  // METHOD 4: Try extractADDate as fallback (which also avoids Date object)
  if (!adDate) {
    // Look for YYYY-MM-DD pattern specifically
    const directMatch = pageText.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (directMatch) {
      const year = parseInt(directMatch[1]);
      if (year < 2080 && year >= 1900) {
        adDate = directMatch[0];
      }
    }
  }
  
  // Extract BS date if present
  const bsPatterns = [
    /BS\s*[:：]\s*([\d\-/]+)/i,
    /B\.?S\.?\s*[:：]\s*([\d\-/]+)/i,
    /वि\.\s*सं\.?\s*[:：]\s*([\d\-/]+)/i,
    /विक्रम\s*संवत्\s*[:：]\s*([\d\-/]+)/i,
    /मिति\s*[:：]\s*([\d\-/]+)/i,
  ];
  
  for (const pattern of bsPatterns) {
    const match = pageText.match(pattern);
    if (match) {
      bsDate = match[1].trim();
      break;
    }
  }
  
  return {
    title,
    adDate,
    bsDate,
    url,
  };
}

/**
 * Remove duplicate notices while preserving order.
 */
export function dedupeNotices(
  notices = []
) {
  const result = [];
  const seen = new Set();

  for (const notice of notices) {
    if (!notice || !notice.id) {
      continue;
    }

    if (seen.has(notice.id)) {
      continue;
    }

    seen.add(notice.id);
    result.push(notice);
  }

  return result;
}