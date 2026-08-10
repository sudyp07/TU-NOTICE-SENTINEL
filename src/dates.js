// src/dates.js

/**
 * Extract AD date from text
 * This function should return dates in YYYY-MM-DD format
 * Rejects BS dates (years >= 2080)
 * CRITICAL: Does NOT use Date() constructor to avoid timezone issues
 */
export function extractADDate(text) {
  if (!text) return null;
  
  const cleaned = String(text).trim();
  if (!cleaned) return null;
  
  // Look for YYYY-MM-DD format first (most reliable)
  const match = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1]);
    // Reject BS dates (years >= 2080)
    if (year >= 2080) return null;
    if (year < 1900) return null;
    // Return as-is, no conversion
    return match[0];
  }
  
  // Look for YYYY/MM/DD format
  const slashMatch = cleaned.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (slashMatch) {
    const year = parseInt(slashMatch[1]);
    if (year >= 2080) return null;
    if (year < 1900) return null;
    // Convert to YYYY-MM-DD
    return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
  }
  
  // Look for DD-MM-YYYY or DD/MM/YYYY
  const dmMatch = cleaned.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1]);
    const month = parseInt(dmMatch[2]);
    const year = parseInt(dmMatch[3]);
    if (year >= 2080) return null;
    if (year < 1900) return null;
    // Format as YYYY-MM-DD
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  // Look for "DD Month YYYY" format (e.g., "10 August 2026")
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const monthRegex = new RegExp(
    `(\\d{1,2})\\s+(${monthNames.join('|')})\\s+(\\d{4})`,
    'i'
  );
  const monthMatch = cleaned.match(monthRegex);
  if (monthMatch) {
    const day = parseInt(monthMatch[1]);
    const month = monthNames.indexOf(monthMatch[2].toLowerCase()) + 1;
    const year = parseInt(monthMatch[3]);
    if (year >= 2080) return null;
    if (year < 1900) return null;
    if (month > 0 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  // Look for "Month DD, YYYY" format (e.g., "August 10, 2026")
  const monthNamesWithComma = monthNames.map(m => m);
  const monthCommaRegex = new RegExp(
    `(${monthNamesWithComma.join('|')})\\s+(\\d{1,2}),?\\s+(\\d{4})`,
    'i'
  );
  const monthCommaMatch = cleaned.match(monthCommaRegex);
  if (monthCommaMatch) {
    const month = monthNames.indexOf(monthCommaMatch[1].toLowerCase()) + 1;
    const day = parseInt(monthCommaMatch[2]);
    const year = parseInt(monthCommaMatch[3]);
    if (year >= 2080) return null;
    if (year < 1900) return null;
    if (month > 0 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  return null;
}

/**
 * Extract BS date from text
 */
export function extractBSDate(text) {
  if (!text) return null;
  
  const cleaned = String(text).trim();
  if (!cleaned) return null;
  
  const bsPatterns = [
    /BS\s*[:：]\s*([\d\-/]+)/i,
    /B\.?S\.?\s*[:：]\s*([\d\-/]+)/i,
    /वि\.\s*सं\.?\s*[:：]\s*([\d\-/]+)/i,
    /विक्रम\s*संवत्\s*[:：]\s*([\d\-/]+)/i,
    /मिति\s*[:：]\s*([\d\-/]+)/i,
  ];
  
  for (const pattern of bsPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Normalize Nepali digits to English digits
 */
export function normalizeNepaliDigits(str) {
  if (!str) return str;
  
  const nepaliDigits = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  
  return String(str).replace(/[०-९]/g, digit => nepaliDigits[digit] || digit);
}

/**
 * Check if a date string is a BS date (year >= 2080)
 */
export function isBSDate(dateStr) {
  if (!dateStr) return false;
  const match = String(dateStr).match(/(\d{4})/);
  if (!match) return false;
  const year = parseInt(match[1]);
  return year >= 2080;
}

/**
 * Extract AD date and reject BS dates
 * This is the main function to use for extracting dates from TU notices
 */
export function extractTUDate(text) {
  if (!text) return null;
  
  const cleaned = String(text).trim();
  if (!cleaned) return null;
  
  // First try direct YYYY-MM-DD extraction
  const directMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (directMatch) {
    const year = parseInt(directMatch[1]);
    // Reject BS dates (years >= 2080)
    if (year >= 2080) return null;
    if (year < 1900) return null;
    return directMatch[0];
  }
  
  // Then try extractADDate
  return extractADDate(cleaned);
}