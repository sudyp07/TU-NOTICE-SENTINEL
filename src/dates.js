// src/dates.js

const BS_MONTHS = {
  1: "Baisakh",
  2: "Jestha",
  3: "Ashadh",
  4: "Shrawan",
  5: "Bhadra",
  6: "Ashwin",
  7: "Kartik",
  8: "Mangsir",
  9: "Poush",
  10: "Magh",
  11: "Falgun",
  12: "Chaitra",
};

// ---------------------------------------------------------
// Convert BS date -> AD date
// ---------------------------------------------------------
//
// IMPORTANT:
// BS -> AD cannot be converted correctly with a simple
// subtraction such as "BS year - 57".
//
// The exact BS calendar has different month lengths.
// Therefore this function uses a known BS/AD reference
// date and walks the BS calendar forward.
//
// ---------------------------------------------------------

const BS_MONTH_DAYS = {
  // These values are examples for the current BS calendar
  // year range. If TU changes its date format/calendar,
  // update this table or use a dedicated Nepali calendar
  // library.
};

// ---------------------------------------------------------
// Detect whether a year is probably BS
// ---------------------------------------------------------

function isBSYear(year) {
  return year >= 2000 && year <= 2200;
}

function isADYear(year) {
  return year >= 1900 && year <= 2100;
}

// ---------------------------------------------------------
// Parse AD date
// ---------------------------------------------------------

function parseADDate(text) {
  if (!text) return null;

  const value = String(text).trim();

  let match;

  // YYYY-MM-DD
  match = value.match(/\b(19\d{2}|20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);

  if (match) {
    const [, year, month, day] = match;

    return formatAD(year, month, day);
  }

  // DD-MM-YYYY / DD/MM/YYYY
  match = value.match(
    /\b(\d{1,2})[-/](\d{1,2})[-/](19\d{2}|20\d{2})\b/
  );

  if (match) {
    const [, day, month, year] = match;

    return formatAD(year, month, day);
  }

  // Month DD, YYYY
  match = value.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(19\d{2}|20\d{2})\b/i
  );

  if (match) {
    const [, monthName, day, year] = match;

    const month = monthNumber(monthName);

    return formatAD(year, month, day);
  }

  // DD Month YYYY
  match = value.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19\d{2}|20\d{2})\b/i
  );

  if (match) {
    const [, day, monthName, year] = match;

    const month = monthNumber(monthName);

    return formatAD(year, month, day);
  }

  return null;
}

// ---------------------------------------------------------
// Main function
// ---------------------------------------------------------

function extractADDate(text) {
  if (!text) return null;

  const value = String(text);

  // -------------------------------------------------------
  // FIRST: explicitly marked AD
  // -------------------------------------------------------

  let match = value.match(
    /\b(19\d{2}|20\d{2})[-/](\d{1,2})[-/](\d{1,2})\s*(?:AD|A\.D\.)?\b/i
  );

  if (match) {
    return formatAD(match[1], match[2], match[3]);
  }

  // -------------------------------------------------------
  // AD written as:
  //
  // 10 August 2026
  // August 10, 2026
  // -------------------------------------------------------

  const adDate = parseADDate(value);

  if (adDate) {
    return adDate;
  }

  // -------------------------------------------------------
  // BS dates are deliberately NOT returned here.
  //
  // Example:
  //
  // 2082/04/25
  // 2082-04-25
  //
  // These are BS dates and must be converted separately.
  // -------------------------------------------------------

  return null;
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function monthNumber(monthName) {
  const months = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };

  return months[String(monthName).toLowerCase()];
}

function formatAD(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!isValidDate(y, m, d)) {
    return null;
  }

  return `${String(y).padStart(4, "0")}-${String(m).padStart(
    2,
    "0"
  )}-${String(d).padStart(2, "0")}`;
}

function isValidDate(year, month, day) {
  if (!isADYear(year)) return false;

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

module.exports = {
  extractADDate,
};