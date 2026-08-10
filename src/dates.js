const NEPALI_DIGITS = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

export function normalizeNepaliDigits(value = '') {
  return String(value).replace(/[०-९]/g, (digit) => NEPALI_DIGITS[digit]);
}

export function extractBSDate(value = '') {
  const normalized = normalizeNepaliDigits(value);
  const matches = normalized.matchAll(/(?:BS\s*)?(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2})/gi);
  for (const match of matches) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year >= 2070 && year <= 2199 && month >= 1 && month <= 12 && day >= 1 && day <= 32) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return null;
}

export function parseADDate(value = '') {
  const normalized = normalizeNepaliDigits(value).trim();
  const matches = normalized.matchAll(/(\d{4})[\-/](\d{1,2})[\-/](\d{1,2})/g);
  for (const match of matches) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1900 || year > 2069 || month < 1 || month > 12 || day < 1 || day > 31) continue;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return date;
    }
  }
  return null;
}

export function toISODate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}
