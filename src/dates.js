// src/dates.js

/**
 * Convert Nepali digits to normal ASCII digits.
 *
 * २०२६-०७-३० -> 2026-07-30
 */
export function normalizeNepaliDigits(value = "") {
  return String(value).replace(/[०-९]/g, (digit) => {
    return String("०१२३४५६७८९".indexOf(digit));
  });
}

/**
 * Format and validate a Gregorian date.
 */
function formatDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return null;
  }

  if (y < 1 || m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }

  const date = new Date(Date.UTC(y, m - 1, d));

  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }

  return `${String(y).padStart(4, "0")}-${String(m).padStart(
    2,
    "0",
  )}-${String(d).padStart(2, "0")}`;
}

/**
 * Extract an AD/Gregorian date.
 *
 * Supported:
 *
 * 2026-07-30
 * 2026/07/30
 * 2026.07.30
 * 2026-7-30
 * 30-07-2026
 * 30/07/2026
 * 30 July 2026
 * July 30, 2026
 * २०२६-०७-३०
 *
 * BS dates such as 2083-04-15 are ignored.
 */
export function extractADDate(value = "") {
  let text = normalizeNepaliDigits(value);

  /*
   * Remove Markdown link formatting:
   *
   * [text](url)
   *
   * so dates inside titles/URLs don't confuse parsing.
   */
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  /*
   * ---------------------------------------------------------
   * 1. YYYY-MM-DD
   * ---------------------------------------------------------
   *
   * Only accept AD-style years up to 2069.
   * 2070+ is treated as possible BS and ignored.
   */
  let match = text.match(
    /\b(19\d{2}|20[0-6]\d)[-/.](\d{1,2})[-/.](\d{1,2})\b/,
  );

  if (match) {
    const result = formatDate(match[1], match[2], match[3]);

    if (result) {
      return result;
    }
  }

  /*
   * ---------------------------------------------------------
   * 2. DD-MM-YYYY
   * ---------------------------------------------------------
   */
  match = text.match(
    /\b(\d{1,2})[-/.](\d{1,2})[-/.](19\d{2}|20[0-6]\d)\b/,
  );

  if (match) {
    const result = formatDate(match[3], match[2], match[1]);

    if (result) {
      return result;
    }
  }

  /*
   * ---------------------------------------------------------
   * 3. DD Month YYYY
   * ---------------------------------------------------------
   */
  const months = {
    january: 1,
    jan: 1,
    february: 2,
    feb: 2,
    march: 3,
    mar: 3,
    april: 4,
    apr: 4,
    may: 5,
    june: 6,
    jun: 6,
    july: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    sept: 9,
    october: 10,
    oct: 10,
    november: 11,
    nov: 11,
    december: 12,
    dec: 12,
  };

  match = text.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(19\d{2}|20[0-6]\d)\b/i,
  );

  if (match) {
    const month = months[match[2].toLowerCase()];

    const result = formatDate(match[3], month, match[1]);

    if (result) {
      return result;
    }
  }

  /*
   * ---------------------------------------------------------
   * 4. Month DD, YYYY
   * ---------------------------------------------------------
   */
  match = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(19\d{2}|20[0-6]\d)\b/i,
  );

  if (match) {
    const month = months[match[1].toLowerCase()];

    const result = formatDate(match[3], month, match[2]);

    if (result) {
      return result;
    }
  }

  /*
   * ---------------------------------------------------------
   * 5. Explicit AD date
   * ---------------------------------------------------------
   *
   * AD 2083-04-15
   * A.D. 2083-04-15
   * 2083-04-15 AD
   *
   * Explicit AD is allowed even though 2083 normally looks
   * like a BS year.
   */
  match = text.match(
    /\b(?:A\.?\s*D\.?|AD)\s*[:.-]?\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/i,
  );

  if (match) {
    return formatDate(match[1], match[2], match[3]);
  }

  match = text.match(
    /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s*(?:A\.?\s*D\.?|AD)\b/i,
  );

  if (match) {
    return formatDate(match[1], match[2], match[3]);
  }

  return null;
}

/**
 * Extract BS date.
 *
 * The application does NOT convert BS dates.
 *
 * This function intentionally returns null because the current
 * application only stores AD dates.
 */
export function extractBSDate(_value = "") {
  return null;
}

/**
 * Backward-compatible function.
 */
export function parseADDate(value = "") {
  return extractADDate(value);
}

/**
 * Backward-compatible function.
 */
export function toISODate(value = "") {
  return extractADDate(value);
}