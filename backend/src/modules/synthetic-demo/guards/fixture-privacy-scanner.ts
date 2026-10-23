export interface PrivacyFinding {
  lineIndex: number;
  snippet: string;
  patternType: 'AADHAAR_LIKE' | 'SSN_LIKE' | 'CREDIT_CARD_LIKE' | 'UNFLAGGED_PRODUCTION_HRN' | 'REAL_NAME_UNMASKED';
  riskSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message: string;
}

export interface PrivacyScanResult {
  scannedItemsCount: number;
  findingsCount: number;
  isSafe: boolean;
  findings: PrivacyFinding[];
}

export class FixturePrivacyScanner {
  private static readonly AADHAAR_REGEX = /\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b/;
  private static readonly SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/;
  private static readonly CC_REGEX = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/;
  private static readonly PROD_HRN_REGEX = /\b(MK|HOSP|REG)-\d{4}-\d{5,}\b/;

  /**
   * Scans text content (fixtures, logs, synthetic records) for realistic identifiers that should not be present.
   */
  public static scanTextContent(content: string): PrivacyScanResult {
    const lines = content.split('\n');
    const findings: PrivacyFinding[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;

      // Check Aadhaar
      if (this.AADHAAR_REGEX.test(line)) {
        findings.push({
          lineIndex: i + 1,
          snippet: line.trim().slice(0, 100),
          patternType: 'AADHAAR_LIKE',
          riskSeverity: 'CRITICAL',
          message: 'Found realistic 12-digit Aadhaar-like UID pattern in synthetic fixture.',
        });
      }

      // Check SSN
      if (this.SSN_REGEX.test(line)) {
        findings.push({
          lineIndex: i + 1,
          snippet: line.trim().slice(0, 100),
          patternType: 'SSN_LIKE',
          riskSeverity: 'CRITICAL',
          message: 'Found realistic 9-digit SSN pattern in fixture.',
        });
      }

      // Check Credit Card
      if (this.CC_REGEX.test(line)) {
        findings.push({
          lineIndex: i + 1,
          snippet: line.trim().slice(0, 100),
          patternType: 'CREDIT_CARD_LIKE',
          riskSeverity: 'CRITICAL',
          message: 'Found valid payment card format in fixture.',
        });
      }

      // Check unflagged production HRN
      if (this.PROD_HRN_REGEX.test(line) && !line.includes('SYN-') && !line.includes('SYNTH')) {
        findings.push({
          lineIndex: i + 1,
          snippet: line.trim().slice(0, 100),
          patternType: 'UNFLAGGED_PRODUCTION_HRN',
          riskSeverity: 'HIGH',
          message: 'Found production hospital registration number format without SYN- reserved prefix.',
        });
      }
    }

    return {
      scannedItemsCount: lines.length,
      findingsCount: findings.length,
      isSafe: findings.length === 0,
      findings,
    };
  }

  /**
   * Scans an object structure recursively.
   */
  public static scanObject(obj: any): PrivacyScanResult {
    const serialized = JSON.stringify(obj, null, 2);
    return this.scanTextContent(serialized);
  }
}
