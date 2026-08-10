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
 * Find an AD date inside text.
 *
 * We intentionally use extractADDate() so BS dates such as
 * 2083-04-15 are rejected.
 */
function extractDateFromText(text) {
  const cleaned = cleanText(text);

  if (!cleaned) {
    return null;
  }

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
 */
function findDateElement($, anchor) {
  const element = $(anchor);

  if (!element.length) {
    return $();
  }

  const dateSelectors = [
    ".date",
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
 * 1. Dedicated date element
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
   * 1. Dedicated date element
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