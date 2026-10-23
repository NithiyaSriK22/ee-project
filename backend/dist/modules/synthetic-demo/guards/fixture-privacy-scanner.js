"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixturePrivacyScanner = void 0;
class FixturePrivacyScanner {
    static AADHAAR_REGEX = /\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b/;
    static SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/;
    static CC_REGEX = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/;
    static PROD_HRN_REGEX = /\b(MK|HOSP|REG)-\d{4}-\d{5,}\b/;
    /**
     * Scans text content (fixtures, logs, synthetic records) for realistic identifiers that should not be present.
     */
    static scanTextContent(content) {
        const lines = content.split('\n');
        const findings = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line === undefined)
                continue;
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
    static scanObject(obj) {
        const serialized = JSON.stringify(obj, null, 2);
        return this.scanTextContent(serialized);
    }
}
exports.FixturePrivacyScanner = FixturePrivacyScanner;
