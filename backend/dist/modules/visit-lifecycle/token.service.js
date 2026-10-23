"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
class TokenService {
    // Atomic sequence counter per department per date key: `${deptCode}_${YYYY-MM-DD}`
    static sequences = new Map();
    static generateDailyToken(departmentCode, date = new Date()) {
        const normCode = departmentCode.trim().toUpperCase();
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const key = `${normCode}_${dateKey}`;
        const currentSeq = this.sequences.get(key) || 0;
        const nextSeq = currentSeq + 1;
        this.sequences.set(key, nextSeq);
        const tokenSeqFormatted = String(nextSeq).padStart(3, '0');
        return `${normCode}-${tokenSeqFormatted}`;
    }
    static generateTokenSlip(visit, department, patientName, location) {
        const locString = location
            ? `${location.building}, ${location.floor}, ${location.room_number} (${location.name})`
            : 'Main OPD Waiting Hall';
        // Minimal privacy-preserving name presentation (e.g. John D***)
        const nameParts = patientName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Patient';
        const secondPart = nameParts[1];
        const maskedName = secondPart
            ? `${firstName} ${secondPart.charAt(0)}***`
            : `${firstName.substring(0, 2)}***`;
        return {
            tokenNumber: visit.token_number,
            departmentCode: department.code,
            departmentName: department.name,
            locationName: locString,
            issuedAt: visit.opened_at.toISOString(),
            patientNameMinimal: maskedName,
            notice: 'Please wait in the designated department waiting area. Your token will be called on the display board.',
        };
    }
    // Testing helper to reset sequence state between test runs
    static resetSequences() {
        this.sequences.clear();
    }
}
exports.TokenService = TokenService;
