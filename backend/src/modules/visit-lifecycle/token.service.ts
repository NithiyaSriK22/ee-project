import { Department, OpdLocation, TokenSlip, VisitRecord } from './visit.types.js';

export class TokenService {
  // Atomic sequence counter per department per date key: `${deptCode}_${YYYY-MM-DD}`
  private static sequences = new Map<string, number>();

  public static generateDailyToken(departmentCode: string, date: Date = new Date()): string {
    const normCode = departmentCode.trim().toUpperCase();
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    const key = `${normCode}_${dateKey}`;

    const currentSeq = this.sequences.get(key) || 0;
    const nextSeq = currentSeq + 1;
    this.sequences.set(key, nextSeq);

    const tokenSeqFormatted = String(nextSeq).padStart(3, '0');
    return `${normCode}-${tokenSeqFormatted}`;
  }

  public static generateTokenSlip(
    visit: VisitRecord,
    department: Department,
    patientName: string,
    location?: OpdLocation | null
  ): TokenSlip {
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
      notice:
        'Please wait in the designated department waiting area. Your token will be called on the display board.',
    };
  }

  // Testing helper to reset sequence state between test runs
  public static resetSequences(): void {
    this.sequences.clear();
  }
}
