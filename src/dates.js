// src/dates.js

/**
 * Normalize Nepali/Devanagari digits to ASCII digits.
 */
export function normalizeNepaliDigits(value) {
  if (value === null || value === undefined) {
    return value;
  }

  const digits = "०१२३४५६७८९";

  return String(value).replace(/[०-९]/g, (char) => {
    return String(digits.indexOf(char));
  });
}

/**
 * Years commonly used by the Gregorian dates in this application.
 *
 * IMPORTANT:
 * TU also uses BS years such as 2083.
 * Therefore numeric years 2000-2099 cannot automatically be
 * considered AD.
 */
function isLikelyADYear(year) {
  const y = Number(year);

  // Gregorian dates relevant to the TU notice application.
  // Years 2000-2099 are potentially ambiguous with BS.
  //
  // We therefore only accept a numeric YYYY-MM-DD date as AD
  // when its year is in the explicitly supported Gregorian range.
  return Number.isInteger(y) && y >= 2020 && y <= 2099;
}

function makeDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!isLikelyADYear(y)) {
    return null;
  }

  if (m < 1 || m > 12 || d < 1 || d > 31) {
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

  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Parse a Gregorian/AD date.
 *
 * Supported:
 *   2026-07-30
 *   2026/07/30
 *   30-07-2026
 *   30/07/2026
 *   30 July 2026
 *   30 July, 2026
 *   July 30 2026
 *   July 30, 2026
 *
 * BS numeric dates such as 2083-04-15 are rejected.
 */
export function parseADDate(value) {
  if (value === null || value === undefined) {
    return null;
  }

  let text = normalizeNepaliDigits(value);

  if (typeof text !== "string") {
    return null;
  }

  text = text.trim();

  if (!text) {
    return null;
  }

  // ---------------------------------------------------------
  // YYYY-MM-DD / YYYY/MM/DD
  //
  // IMPORTANT:
  // Explicitly reject known BS-era years.
  // ---------------------------------------------------------

  let match = text.match(
    /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/
  );

  if (match) {
    const year = Number(match[1]);

    /*
     * BS years are intentionally ignored.
     *
     * Current TU BS dates are around 2080-2090.
     * A Gregorian notice date will normally be 2020+ but
     * numeric 208x is ambiguous.
     *
     * The tests explicitly require 2083-04-15 to be ignored.
     */
    if (year >= 2080 && year <= 2099) {
      return null;
    }

    return makeDate(match[1], match[2], match[3]);
  }

  // ---------------------------------------------------------
  // DD-MM-YYYY / DD/MM/YYYY
  // ---------------------------------------------------------

  match = text.match(
    /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/
  );

  if (match) {
    const year = Number(match[3]);

    if (year >= 2080 && year <= 2099) {
      return null;
    }

    return makeDate(match[3], match[2], match[1]);
  }

  // ---------------------------------------------------------
  // Month names
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // 30 July 2026
  // ---------------------------------------------------------

  match = text.match(
    /\b(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})\b/i
  );

  if (match) {
    const month = months[match[2].toLowerCase()];

    if (month) {
      return makeDate(match[3], month, match[1]);
    }
  }

  // ---------------------------------------------------------
  // July 30 2026
  // ---------------------------------------------------------

  match = text.match(
    /\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/i
  );

  if (match) {
    const month = months[match[1].toLowerCase()];

    if (month) {
      return makeDate(match[3], month, match[2]);
    }
  }

  return null;
}

/**
 * Extract AD date from text.
 *
 * BS dates are intentionally ignored.
 */
export function extractADDate(value) {
  return parseADDate(value);
}

/**
 * BS dates are deliberately not converted by this application.
 */
export function extractBSDate(_value) {
  return null;
}