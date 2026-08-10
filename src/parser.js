import * as cheerio from 'cheerio';
import { extractBSDate, parseADDate, toISODate } from './dates.js';

export function extractNoticeId(url = '') {
  const match = String(url).match(/\/notices\/([^/?#]+)/i);
  return match ? match[1] : null;
}

export function absoluteUrl(href, base) {
  try {
    const url = new URL(href, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function nextPageUrl($, pageUrl) {
  const candidates = $('a[href]').toArray();
  for (const anchor of candidates) {
    const element = $(anchor);
    const rel = String(element.attr('rel') ?? '').toLowerCase();
    const label = String(element.attr('aria-label') ?? '').toLowerCase();
    const text = element.text().replace(/\s+/g, ' ').trim().toLowerCase();
    const isNext = rel.split(/\s+/).includes('next')
      || /\bnext\b/.test(label)
      || /^(next|older|›|»|→)$/.test(text);
    if (!isNext) continue;
    const resolved = absoluteUrl(element.attr('href'), pageUrl);
    if (resolved && resolved !== pageUrl) return resolved;
  }
  return null;
}

export function parsePage(html, pageUrl) {
  const $ = cheerio.load(html);
  const notices = [];
  const seen = new Set();

  $('a[href]').each((_, anchor) => {
    const element = $(anchor);
    const url = absoluteUrl(element.attr('href'), pageUrl);
    const id = extractNoticeId(url);
    if (!url || !id || seen.has(id)) return;

    const title = (element.text() || element.attr('title') || element.find('img').attr('alt') || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title) return;

    const block = element.closest('article, li, tr, .notice, .card, div').text().replace(/\s+/g, ' ').trim();
    const bsDate = extractBSDate(block) || extractBSDate(title);
    const adDate = toISODate(parseADDate(block) || parseADDate(title));
    notices.push({
      id,
      title,
      url,
      bsDate,
      adDate,
      originalDate: bsDate || adDate,
    });
    seen.add(id);
  });

  return { notices, nextPage: nextPageUrl($, pageUrl) };
}

export function dedupeNotices(notices) {
  const unique = new Map();
  for (const notice of notices) {
    if (notice.id && !unique.has(notice.id)) unique.set(notice.id, notice);
  }
  return [...unique.values()];
}
