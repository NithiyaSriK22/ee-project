export class ValueNormalizer {
  /**
   * Normalizes raw drug / medical text:
   * trims, cleans excess whitespace, strips non-alphanumeric punctuation while preserving dosage numbers
   */
  public static normalizeDrugName(rawText: string): string {
    if (!rawText) return '';
    return rawText
      .trim()
      .replace(/[^\w\s-]/gi, ' ') // replace special chars except hyphens with space
      .replace(/\s+/g, ' ')       // collapse spaces
      .toLowerCase();
  }

  /**
   * Normalizes dosage frequency notations:
   * standardizes variations like "1 - 0 - 1", "1/0/1", "1 0 1" to "1-0-1"
   */
  public static normalizeDosagePattern(rawText: string): string {
    if (!rawText) return '';
    const cleaned = rawText.trim().toUpperCase();

    // 1. Matches numeric schedule like 1-0-1, 1 0 1, 1/0/1, 1-1-1-1
    const scheduleMatch = cleaned.match(/^(\d)\s*[-/,\s]\s*(\d)\s*[-/,\s]\s*(\d)(?:\s*[-/,\s]\s*(\d))?$/);
    if (scheduleMatch && scheduleMatch[1] && scheduleMatch[2] && scheduleMatch[3]) {
      const parts = [scheduleMatch[1], scheduleMatch[2], scheduleMatch[3]];
      if (scheduleMatch[4]) parts.push(scheduleMatch[4]);
      return parts.join('-');
    }

    // 2. Standard Latin abbreviation normalization
    const latinMap: Record<string, string> = {
      OD: 'OD (Once Daily)',
      'ONCE DAILY': 'OD (Once Daily)',
      '1 TIME DAILY': 'OD (Once Daily)',
      BD: 'BD (Twice Daily)',
      BID: 'BD (Twice Daily)',
      'TWICE DAILY': 'BD (Twice Daily)',
      '2 TIMES DAILY': 'BD (Twice Daily)',
      TID: 'TID (Thrice Daily)',
      TDS: 'TID (Thrice Daily)',
      'THRICE DAILY': 'TID (Thrice Daily)',
      '3 TIMES DAILY': 'TID (Thrice Daily)',
      QID: 'QID (Four Times Daily)',
      '4 TIMES DAILY': 'QID (Four Times Daily)',
      SOS: 'SOS (As Needed / PRN)',
      PRN: 'PRN (As Needed / SOS)',
      HS: 'HS (At Bedtime)',
      STAT: 'STAT (Immediately)',
    };

    const trimmedUpper = cleaned.replace(/[.]/g, '').trim();
    if (latinMap[trimmedUpper]) {
      return latinMap[trimmedUpper];
    }

    return cleaned;
  }

  /**
   * Normalizes dates to ISO YYYY-MM-DD format if valid, or returns null if ambiguous/invalid
   */
  public static normalizeDate(rawText: string): { isoDate: string | null; formatted: string | null; isValid: boolean } {
    if (!rawText) return { isoDate: null, formatted: null, isValid: false };

    const cleaned = rawText.trim().replace(/[./]/g, '-');

    // Match DD-MM-YYYY or YYYY-MM-DD
    const ddmmyyyy = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    const yyyymmdd = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    let day = 0;
    let month = 0;
    let year = 0;

    if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
      day = parseInt(ddmmyyyy[1], 10);
      month = parseInt(ddmmyyyy[2], 10);
      year = parseInt(ddmmyyyy[3], 10);
    } else if (yyyymmdd && yyyymmdd[1] && yyyymmdd[2] && yyyymmdd[3]) {
      year = parseInt(yyyymmdd[1], 10);
      month = parseInt(yyyymmdd[2], 10);
      day = parseInt(yyyymmdd[3], 10);
    } else {
      // Try native parse
      const parsed = new Date(rawText);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getUTCFullYear();
        const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const d = String(parsed.getUTCDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;
        return { isoDate: iso, formatted: `${d}/${m}/${y}`, isValid: true };
      }
      return { isoDate: null, formatted: null, isValid: false };
    }

    // Strict boundary checks
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      return { isoDate: null, formatted: null, isValid: false };
    }

    // Days in month check
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      return { isoDate: null, formatted: null, isValid: false };
    }

    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const isoDate = `${year}-${mStr}-${dStr}`;
    const formatted = `${dStr}/${mStr}/${year}`;

    return { isoDate, formatted, isValid: true };
  }

  /**
   * Safe decimal numeric extraction for lab values
   */
  public static normalizeNumeric(rawText: string): { value: number | null; unit: string | null; isValid: boolean } {
    if (!rawText) return { value: null, unit: null, isValid: false };

    // Matches numbers with optional decimals and unit (e.g. "140 mg/dL", "5.8 %", "12.4")
    const match = rawText.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*([a-zA-Z/%^μu]+(?:\/[a-zA-Z]+)?)?$/);
    if (!match || !match[1]) return { value: null, unit: null, isValid: false };

    const num = parseFloat(match[1]);
    if (isNaN(num)) return { value: null, unit: null, isValid: false };

    return {
      value: num,
      unit: match[2] ? match[2].trim() : null,
      isValid: true,
    };
  }
}
