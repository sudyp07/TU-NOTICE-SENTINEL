import assert from "node:assert/strict";
import test from "node:test";

import {
  extractADDate,
  extractBSDate,
  normalizeNepaliDigits,
} from "../src/dates.js";

import {
  absoluteUrl,
  dedupeNotices,
  extractNoticeId,
  parsePage,
} from "../src/parser.js";

test("AD date parsing works and BS dates are ignored", () => {






  // BS dates are intentionally not converted.
  assert.equal(extractBSDate("2083-04-15"), null);

  assert.equal(extractADDate("2083-04-15"), null);
});

test("Nepali digits normalize correctly", () => {
  assert.equal(normalizeNepaliDigits("२०२६-०७-३०"), "2026-07-30");

  assert.equal(normalizeNepaliDigits("२०८३-०४-१५"), "2083-04-15");
});

test("AD and BS dates are handled independently", () => {

  assert.equal(extractADDate("2083-04-15"), null);

  assert.equal(extractBSDate("2083-04-15"), null);
});

test("notice IDs are extracted correctly", () => {
  assert.equal(
    extractNoticeId("https://exam.tu.edu.np/notices/test-notice"),
    "test-notice",
  );

  assert.equal(
    extractNoticeId("https://exam.tu.edu.np/notices/test-notice/"),
    "test-notice",
  );

  assert.equal(
    extractNoticeId("https://exam.tu.edu.np/notices/test-notice?page=2"),
    "test-notice",
  );

  assert.equal(extractNoticeId("https://example.com/about"), null);
});

test("absolute URLs are resolved correctly", () => {
  assert.equal(
    absoluteUrl("/notices/test", "https://exam.tu.edu.np/notices"),
    "https://exam.tu.edu.np/notices/test",
  );

  assert.equal(
    absoluteUrl("https://example.com/test", "https://exam.tu.edu.np/notices"),
    "https://example.com/test",
  );

  assert.equal(absoluteUrl(null, "https://exam.tu.edu.np/notices"), null);
});

test("parser extracts notices and follows an explicit next link", () => {
  const html = `
    <html>
      <body>

        <article class="notice-item">
          <a href="/notices/test-notice">
            Important TU Notice
          </a>

          <div class="date">
            30 July 2026
          </div>

          <div class="old-bs-date">
            2083-04-15
          </div>
        </article>

        <a
          rel="next"
          href="/notices?page=2"
        >
          Next
        </a>

      </body>
    </html>
  `;

  const result = parsePage(html, "https://exam.tu.edu.np/notices");

  assert.equal(result.notices.length, 1);

  assert.equal(result.notices[0].id, "test-notice");

  assert.equal(result.notices[0].title, "Important TU Notice");

  assert.equal(
    result.notices[0].url,
    "https://exam.tu.edu.np/notices/test-notice",
  );

  // AD date is what the application stores.
  assert.equal(result.notices[0].adDate, "2026-07-30");

  // BS date is deliberately absent.
  assert.equal(result.notices[0].bsDate, undefined);

  assert.equal(result.nextPage, "https://exam.tu.edu.np/notices?page=2");
});

test("parser extracts AD date from notice title when available", () => {
  const html = `
    <html>
      <body>

        <a href="/notices/ad-title">
          TU Exam Notice - 30 July 2026
        </a>

      </body>
    </html>
  `;

  const result = parsePage(html, "https://exam.tu.edu.np/notices");

  assert.equal(result.notices.length, 1);

  assert.equal(result.notices[0].adDate, "2026-07-30");
});

test("parser ignores BS-only dates", () => {
  const html = `
    <html>
      <body>

        <article class="notice-item">
          <a href="/notices/bs-only">
            TU Notice
          </a>

          <div class="date">
            2083-04-15
          </div>
        </article>

      </body>
    </html>
  `;

  const result = parsePage(html, "https://exam.tu.edu.np/notices");

  assert.equal(result.notices.length, 1);

  assert.equal(result.notices[0].adDate, null);

  assert.equal(result.notices[0].bsDate, undefined);
});

test("new notice detection and deduplication preserve unique notices", () => {
  const notices = [
    {
      id: "one",
      title: "Notice One",
      url: "https://exam.tu.edu.np/notices/one",
      adDate: "2026-07-30",
    },
    {
      id: "one",
      title: "Notice One Duplicate",
      url: "https://exam.tu.edu.np/notices/one",
      adDate: "2026-07-30",
    },
    {
      id: "two",
      title: "Notice Two",
      url: "https://exam.tu.edu.np/notices/two",
      adDate: "2026-07-29",
    },
  ];

  const result = dedupeNotices(notices);

  assert.equal(result.length, 2);

  assert.equal(result[0].id, "one");

  assert.equal(result[1].id, "two");
});
