// src/parser.js

import * as cheerio from "cheerio";
import { extractADDate } from "./dates.js";

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
 *
 * Valid:
 *   https://exam.tu.edu.np/notices/test-notice
 *   https://exam.tu.edu.np/notices/test-notice/
 *   https://exam.tu.edu.np/notices/test-notice?page=2
 *
 * Invalid:
 *   https://example.com/notices/test-notice
 *   https://exam.tu.edu.np/notices
 *   https://exam.tu.edu.np/about
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
 * Example:
 *   https://exam.tu.edu.np/notices/test-notice
 *   -> test-notice
 *
 * Also supports Markdown URLs:
 *   [https://exam.tu.edu.np/notices/test-notice](https://exam.tu.edu.np/notices/test-notice)
 */
export function extractNoticeId(url = "") {
  if (!url) {
    return null;
  }

  let text = String(url).trim();

  /*
   * If a Markdown URL reaches this function, extract the
   * visible URL.
   */
  const markdownMatch = text.match(
    /^\[([^\]]+)\]\(([^)]+)\)$/
  );

  if (markdownMatch) {
    text = markdownMatch[1].trim();
  }

  /*
   * Normal URL parsing.
   */
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
    /*
     * Fallback for relative/simple strings.
     */
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
 * Convert relative URL into absolute URL.
 */
export function absoluteUrl(href, base) {
  if (!href || !base) {
    return null;
  }

  /*
   * The tests may pass Markdown-formatted URLs.
   * Extract the actual URL first.
   */
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
    return new URL(normalizedHref, normalizedBase).href;
  } catch {
    return null;
  }
}

/**
 * Find the date element associated with a notice anchor.
 *
 * IMPORTANT:
 * We deliberately prefer dedicated date elements over the
 * entire notice container.
 *
 * This prevents a BS date such as:
 *
 *   2083-04-15
 *
 * from interfering with an AD date such as:
 *
 *   30 July 2026
 */
function findDateElement($, anchor) {
  const element = $(anchor);

  if (!element.length) {
    return $();
  }

  /*
   * First: direct/common date selectors.
   */
  const directSelectors = [
    ".date",
    ".notice-date",
    ".notice_date",
    ".publish-date",
    ".published-date",
    ".posted-date",
    ".post-date",
    ".date-posted",
    "time",
  ];

  for (const selector of directSelectors) {
    const node = element.closest(
      "article, li, tr, .notice, .notice-item, .news-item, .blog-item, .post-item, .item, .card"
    ).find(selector).first();

    if (node.length) {
      return node;
    }
  }

  /*
   * Second: look at the anchor's immediate parent.
   */
  const parent = element.parent();

  if (parent.length) {
    for (const selector of directSelectors) {
      const node = parent.find(selector).first();

      if (node.length) {
        return node;
      }
    }
  }

  /*
   * Third: inspect nearby siblings for explicit date elements.
   */
  let current = element;

  for (let depth = 0; depth < 5 && current.length; depth++) {
    for (const selector of directSelectors) {
      const sibling = current
        .siblings(selector)
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
 * Find an AD date associated with a notice.
 *
 * Priority:
 *
 * 1. Dedicated date element
 * 2. Notice title
 *
 * We NEVER parse the entire notice container first because
 * a TU notice can contain both AD and BS dates.
 */
function findADDate($, anchor, title) {
  /*
   * ---------------------------------------------------------
   * 1. Dedicated date element
   * ---------------------------------------------------------
   */
  const dateElement = findDateElement($, anchor);

  if (dateElement.length) {
    const dateText = cleanText(dateElement.text());

    if (dateText) {
      const date = extractADDate(dateText);

      if (date) {
        return date;
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * 2. Anchor/title
   * ---------------------------------------------------------
   *
   * This is required for notices such as:
   *
   * TU Exam Notice - 30 July 2026
   */
  const titleDate = extractADDate(title);

  if (titleDate) {
    return titleDate;
  }

  /*
   * ---------------------------------------------------------
   * 3. Small nearby elements only
   * ---------------------------------------------------------
   *
   * We intentionally avoid parsing the entire article text.
   * This prevents BS dates from becoming AD dates.
   */
  const element = $(anchor);

  const nearby = [
    element.prev(),
    element.next(),
  ];

  for (const node of nearby) {
    if (!node || !node.length) {
      continue;
    }

    const text = cleanText(node.text());

    if (!text) {
      continue;
    }

    const date = extractADDate(text);

    if (date) {
      return date;
    }
  }

  return null;
}

/**
 * Find explicit next page.
 */
function findNextPage($, pageUrl) {
  let nextPage = null;

  /*
   * Preferred:
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

    const absolute = absoluteUrl(href, pageUrl);

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

    const text = cleanText($(element).text())
      .toLowerCase();

    if (!nextTexts.has(text)) {
      return;
    }

    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    const absolute = absoluteUrl(href, pageUrl);

    if (absolute) {
      nextPage = absolute;
    }
  });

  return nextPage;
}

/**
 * Parse one TU notice page.
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
 * No bsDate property is created.
 */
export function parsePage(html, pageUrl) {
  const $ = cheerio.load(html);

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
    const url = absoluteUrl(href, pageUrl);

    if (!url) {
      return;
    }

    /*
     * Only accept actual TU notice URLs.
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
     * Extract title from the anchor.
     */
    const title = cleanText($(anchor).text());

    if (!title) {
      return;
    }

    /*
     * Extract AD date.
     *
     * IMPORTANT:
     * This does NOT inspect the complete article text.
     * Therefore:
     *
     *   30 July 2026
     *   2083-04-15
     *
     * correctly produces:
     *
     *   2026-07-30
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
    nextPage: findNextPage($, pageUrl),
  };
}

/**
 * Remove duplicate notices while preserving order.
 */
export function dedupeNotices(notices = []) {
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