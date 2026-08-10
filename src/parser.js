import * as cheerio from "cheerio";
import {
  extractBSDate,
  extractADDate,
} from "./dates.js";

export function extractNoticeId(url = "") {
  const match = String(url).match(/\/notices\/([^/?#]+)/i);
  return match ? match[1] : null;
}

export function absoluteUrl(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function normalizeText(value = "") {
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDateFromElement($, element) {
  const candidates = [];

  // Element text
  candidates.push($(element).text());

  // Common date attributes
  for (const attribute of [
    "datetime",
    "date",
    "data-date",
    "data-bs-date",
    "data-date-bs",
    "title",
  ]) {
    const value = $(element).attr(attribute);

    if (value) {
      candidates.push(value);
    }
  }

  // Common date-related child elements
  $(element)
    .find(
      "time, .date, .notice-date, .published, .published-date, [datetime], [data-date]"
    )
    .each((_, child) => {
      candidates.push($(child).text());

      for (const attribute of [
        "datetime",
        "date",
        "data-date",
        "data-bs-date",
        "title",
      ]) {
        const value = $(child).attr(attribute);

        if (value) {
          candidates.push(value);
        }
      }
    });

  for (const candidate of candidates) {
    const text = normalizeText(candidate);

    if (!text) {
      continue;
    }

    // IMPORTANT:
    // Check BS first because TU notice dates are primarily BS dates.
    const bsDate = extractBSDate(text);

    if (bsDate) {
      return {
        bsDate,
        adDate: null,
      };
    }

    const adDate = extractADDate(text);

    if (adDate) {
      return {
        bsDate: null,
        adDate,
      };
    }
  }

  return {
    bsDate: null,
    adDate: null,
  };
}

function getNoticeContext($, anchor) {
  const contexts = [];

  // Anchor itself
  contexts.push(anchor);

  // Walk up several parent levels.
  let current = anchor;

  for (let i = 0; i < 5; i++) {
    current = $(current).parent();

    if (!current || !current.length) {
      break;
    }

    contexts.push(current);
  }

  // Prefer semantic notice containers.
  const semantic = $(anchor).closest(
    "article, li, tr, td, section, " +
      ".notice, .notice-item, .notice-list-item, .card"
  );

  if (semantic.length) {
    contexts.unshift(semantic);
  }

  return contexts;
}

export function parsePage(html, pageUrl) {
  const $ = cheerio.load(html);

  const notices = [];
  const seen = new Set();

  $("a[href]").each((_, anchor) => {
    const rawHref = $(anchor).attr("href");

    const url = absoluteUrl(rawHref, pageUrl);
    const id = extractNoticeId(url);

    if (
      !url ||
      !id ||
      seen.has(id) ||
      !/\/notices\//i.test(url)
    ) {
      return;
    }

    const title = normalizeText($(anchor).text());

    if (!title) {
      return;
    }

    let bsDate = null;
    let adDate = null;

    const contexts = getNoticeContext($, anchor);

    // Search surrounding notice containers.
    for (const context of contexts) {
      const result = extractDateFromElement($, context);

      if (result.bsDate || result.adDate) {
        bsDate = result.bsDate;

        // If BS exists, AD must remain null.
        adDate = result.bsDate ? null : result.adDate;

        break;
      }
    }

    // Final fallback: search title itself.
    if (!bsDate && !adDate) {
      bsDate = extractBSDate(title);

      if (bsDate) {
        adDate = null;
      } else {
        adDate = extractADDate(title);
      }
    }

    notices.push({
      id,
      title,
      url,
      bsDate,
      adDate,
    });

    seen.add(id);
  });

  return {
    notices,
    nextPage: null,
  };
}

export function dedupeNotices(notices) {
  const map = new Map();

  for (const notice of notices) {
    if (notice.id && !map.has(notice.id)) {
      map.set(notice.id, notice);
    }
  }

  return [...map.values()];
}