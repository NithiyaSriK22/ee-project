export class CanonicalParser {
  private static TAMIL_DIGITS: Record<string, string> = {
    '௦': '0',
    '௧': '1',
    '௨': '2',
    '௩': '3',
    '௪': '4',
    '௫': '5',
    '௬': '6',
    '௭': '7',
    '௮': '8',
    '௯': '9',
  };

  private static DEVANAGARI_DIGITS: Record<string, string> = {
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9',
  };

  /**
   * Normalizes any string containing Indic/Eastern digits to standard ASCII Arabic numerals ('0'-'9').
   */
  public static normalizeDigits(input: string): string {
    if (!input) return '';
    let result = '';
    for (const char of input) {
      if (this.TAMIL_DIGITS[char] !== undefined) {
        result += this.TAMIL_DIGITS[char];
      } else if (this.DEVANAGARI_DIGITS[char] !== undefined) {
        result += this.DEVANAGARI_DIGITS[char];
      } else {
        result += char;
      }
    }
    return result;
  }

  /**
   * Parses a numeric answer from raw voice or touch input across languages into a canonical number.
   */
  public static parseNumeric(input: string | number): number | null {
    if (typeof input === 'number') {
      return isNaN(input) ? null : input;
    }
    if (!input || typeof input !== 'string') return null;

    const normalized = this.normalizeDigits(input.trim());
    const match = normalized.match(/-?\d+(\.\d+)?/);
    if (!match) return null;

    const num = Number(match[0]);
    return isNaN(num) ? null : num;
  }

  /**
   * Parses localized date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, or Indic digit strings)
   * into canonical ISO date string format 'YYYY-MM-DD'.
   */
  public static parseDate(input: string): string | null {
    if (!input || typeof input !== 'string') return null;

    const normalized = this.normalizeDigits(input.trim());

    // 1. Check YYYY-MM-DD (ISO)
    const isoMatch = normalized.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      if (this.isValidDate(Number(year), Number(month), Number(day))) {
        return `${year}-${month}-${day}`;
      }
    }

    // 2. Check DD/MM/YYYY or DD-MM-YYYY (Common Indian standard)
    const dmyMatch = normalized.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      if (this.isValidDate(Number(year), Number(month), Number(day))) {
        return `${year}-${month}-${day}`;
      }
    }

    // 3. Fallback: JS Date parse if valid
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return null;
  }

  /**
   * Parses duration strings across English, Tamil, and Hindi into structured canonical duration
   * or standard option codes.
   */
  public static parseDuration(input: string): { count: number; unit: string } | string | null {
    if (!input || typeof input !== 'string') return null;

    const trimmed = input.trim().toLowerCase();
    const normalized = this.normalizeDigits(trimmed);

    // Check predefined duration codes directly
    if (['DURATION_LT_24H', 'DURATION_1_3D', 'DURATION_4_7D', 'DURATION_1_4W', 'DURATION_GT_1M'].includes(input)) {
      return input;
    }

    // Match numbers and units
    const numMatch = normalized.match(/(\d+)/);
    const count = numMatch ? Number(numMatch[1]) : 1;

    if (normalized.includes('நாள்') || normalized.includes('day') || normalized.includes('दिन')) {
      return { count, unit: 'days' };
    }
    if (normalized.includes('வாரம்') || normalized.includes('week') || normalized.includes('हफ्ते') || normalized.includes('सप्ताह')) {
      return { count, unit: 'weeks' };
    }
    if (normalized.includes('மாதம்') || normalized.includes('month') || normalized.includes('महीने')) {
      return { count, unit: 'months' };
    }
    if (normalized.includes('மணி') || normalized.includes('hour') || normalized.includes('घंटे')) {
      return { count, unit: 'hours' };
    }

    return { count, unit: 'days' };
  }

  private static isValidDate(year: number, month: number, day: number): boolean {
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  }
}
