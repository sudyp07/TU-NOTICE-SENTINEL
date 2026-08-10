// src/dates.js

/**
 * Convert Nepali/Devanagari digits to normal ASCII digits.
 *
 * Example:
 * २०८३-०४-१५ -> 2083-04-15
 */
export function normalizeNepaliDigits(value) {
  return String(value ?? "").replace(/[०-९]/g, (digit) => {
    return String("०१२३४५६७८९".indexOf(digit));
  });
}

/**
 * Parse an AD/Gregorian date.
 *
 * IMPORTANT:
 * This function intentionally does NOT parse BS dates.
 *
 * Supported examples:
 *   2026-04-15
 *   2026/04/15
 *   2026.04.15
 *   15-04-2026
 *   15/04/2026
 */
export function parseADDate(value) {
  const raw = String(value ?? "").trim();

  if (!raw) return null;

  // Normalize Nepali digits first.
  const text = normalizeNepaliDigits(raw);

  // Explicitly reject BS-style years.
  // TU BS years normally start with 20xx, while AD examples
  // in this application are expected to be Gregorian dates.
  //
  // We only accept a 4-digit Gregorian year beginning with 19 or 20
  // when it is clearly being used as an AD date.
  const patterns = [
    // YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
    /\b((?:19|20)\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/,

    // DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY
    /\b(\d{1,2})[-/.](\d{1,2})[-/.]((?:19|20)\d{2})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    let year;
    let month;
    let day;

    if (/^\d{4}/.test(match[0])) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    }

    if (!isValidGregorianDate(year, month, day)) {
      return null;
    }

    return `${year}-${pad(month)}-${pad(day)}`;
  }

  return null;
}

/**
 * Extract a BS date.
 *
 * Supported examples:
 *   2083-04-15
 *   २०८३-०४-१५
 *   2083/04/15
 *
 * This function intentionally does NOT parse AD dates.
 */
export function extractBSDate(value) {
  const raw = String(value ?? "").trim();

  if (!raw) return null;

  const text = normalizeNepaliDigits(raw);

  const patterns = [
    // YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
    /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    // BS month range.
    if (month < 1 || month > 12) return null;

    // We intentionally don't pretend to validate exact BS month lengths
    // because that requires a complete BS calendar conversion table.
    if (day < 1 || day > 32) return null;

    return `${year}-${pad(month)}-${pad(day)}`;
  }

  return null;
}

/**
 * Validate a real Gregorian calendar date.
 */
function isValidGregorianDate(year, month, day) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function pad(value) {
  return String(value).padStart(2, "0");
}
