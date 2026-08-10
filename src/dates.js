const NEPALI_DIGITS = "०१२३४५६७८९";

const BS_MONTHS = {
  बैशाख: 1,
  जेठ: 2,
  असार: 3,
  श्रावण: 4,
  साउन: 4,
  भाद्र: 5,
  भदौ: 5,
  आश्विन: 6,
  असोज: 6,
  कार्तिक: 7,
  मंसिर: 8,
  मार्ग: 8,
  पुष: 9,
  पौष: 9,
  माघ: 10,
  फाल्गुण: 11,
  फागुन: 11,
  चैत्र: 12,
};

const AD_MONTHS = {
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

function clean(value = "") {
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNepaliDigits(value = "") {
  return String(value).replace(/[०-९]/g, (digit) => {
    return String(NEPALI_DIGITS.indexOf(digit));
  });
}

export function nepaliDigitsToEnglish(value = "") {
  return normalizeNepaliDigits(value);
}

export function extractBSDate(value = "") {
  const original = clean(value);

  if (!original) return null;

  const text = normalizeNepaliDigits(original);

  // YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
  const yearFirst = text.match(
    /\b(20\d{2}|21\d{2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})\b/,
  );

  if (yearFirst) {
    const year = Number(yearFirst[1]);
    const month = Number(yearFirst[2]);
    const day = Number(yearFirst[3]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 32) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dayFirst = text.match(
    /\b(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(20\d{2}|21\d{2})\b/,
  );

  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    const year = Number(dayFirst[3]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 32) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  // Nepali month names.
  const monthNames = Object.keys(BS_MONTHS)
    .sort((a, b) => b.length - a.length)
    .join("|");

  const named = original.match(
    new RegExp(
      `(20\\d{2}|21\\d{2})\\s*(?:[-/,]?\\s*)(${monthNames})\\s*[-/,]?\\s*(\\d{1,2})`,
      "i",
    ),
  );

  if (named) {
    const year = Number(normalizeNepaliDigits(named[1]));
    const month = BS_MONTHS[named[2]];
    const day = Number(normalizeNepaliDigits(named[3]));

    if (month && day >= 1 && day <= 32) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  return null;
}

export function parseADDate(value = "") {
  const text = normalizeNepaliDigits(clean(value));

  if (!text) return null;

  // YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  const iso = text.match(
    /\b(19\d{2}|20\d{2}|21\d{2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})\b/,
  );

  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  // Month DD, YYYY
  const monthFirst = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+((?:19|20|21)\d{2})\b/i,
  );

  if (monthFirst) {
    const month = AD_MONTHS[monthFirst[1].toLowerCase()];
    const day = Number(monthFirst[2]);
    const year = Number(monthFirst[3]);

    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  // DD Month YYYY
  const dayFirst = text.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+((?:19|20|21)\d{2})\b/i,
  );

  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = AD_MONTHS[dayFirst[2].toLowerCase()];
    const year = Number(dayFirst[3]);

    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  return null;
}

export function extractADDate(value = "") {
  return parseADDate(value);
}
