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
 * Extract notice ID from a TU notice URL.
 *
 * Example:
 *
 * https://exam.tu.edu.np/notices/test-notice
 *
 * -> test-notice
 */
export function extractNoticeId(url = "") {
  if (!url) {
    return null;
  }

  let text = String(url).trim();

  /*
   * If a Markdown URL somehow reaches this function:
   *
   * [https://exam.tu.edu.np/notices/test-notice](...)
   *
   * extract the visible URL first.
   */
  const markdownMatch = text.match(/^\[([^\]]+)\]\([^)]+\)$/);

  if (markdownMatch) {
    text = markdownMatch[1];
  }

  /*
   * Normal URL parsing.
   */
  try {
    const parsed = new URL(text);

    if (
      parsed.hostname !== "exam.tu.edu.np" &&
      parsed.hostname !== "www.exam.tu.edu.np"
    ) {
      return null;
    }

    const match = parsed.pathname.match(
      /^\/notices\/([^/]+)\/?$/i,
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
      /\/notices\/([^/?#]+)\/?(?:[?#].*)?$/i,
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

  try {
    return new URL(String(href), String(base)).href;
  } catch {
    return null;
  }
}

/**
 * Find an AD date near a notice anchor.
 *
 * We deliberately search only for AD dates.
 * BS dates are ignored.
 */
function findADDate($, anchor) {
  const candidates = [];
  const element = $(anchor);

  if (!element.length) {
    return null;
  }

  /*
   * Anchor itself.
   */
  candidates.push(element);

  /*
   * Parent.
   */
  const parent = element.parent();

  if (parent.length) {
    candidates.push(parent);
  }

  /*
   * Closest common notice containers.
   */
  const selectors = [
    "li",
    "article",
    "tr",
    ".notice",
    ".notice-item",
    ".news-item",
    ".blog-item",
    ".post-item",
    ".item",
    ".card",
  ];

  for (const selector of selectors) {
    const node = element.closest(selector);

    if (node.length) {
      candidates.push(node);
    }
  }

  /*
   * Parent hierarchy.
   */
  let current = element.parent();

  for (let i = 0; i < 5 && current.length; i++) {
    candidates.push(current);
    current = current.parent();
  }

  /*
   * Search candidates.
   */
  for (const candidate of candidates) {
    const text = cleanText(candidate.text());

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

    nextPage = absoluteUrl(href, pageUrl);
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

    const text = cleanText($(element).text()).toLowerCase();

    if (!nextTexts.has(text)) {
      return;
    }

    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    nextPage = absoluteUrl(href, pageUrl);
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

    const url = absoluteUrl(href, pageUrl);

    if (!url) {
      return;
    }

    /*
     * Only TU notice URLs.
     */
    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch {
      return;
    }

    if (
      parsedUrl.hostname !== "exam.tu.edu.np" &&
      parsedUrl.hostname !== "www.exam.tu.edu.np"
    ) {
      return;
    }

    if (!/^\/notices\/[^/]+\/?$/i.test(parsedUrl.pathname)) {
      return;
    }

    const id = extractNoticeId(url);

    if (!id || seen.has(id)) {
      return;
    }

    /*
     * Ignore empty links.
     */
    const title = cleanText($(anchor).text());

    if (!title) {
      return;
    }

    const adDate = findADDate($, anchor);

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