export interface LocalStoredAnswer {
  idempotencyKey: string;
  visitId: string;
  questionId: string;
  questionCode?: string;
  answerValue: any;
  answeredVia: string;
  languageUsed: string;
  isCritical?: boolean;
  isSkipped?: boolean;
  answeredAt: string;
}

export class LocalAnswerStore {
  private static STORAGE_KEY_PREFIX = 'medikiosk_offline_answers_';

  /**
   * Generates a unique idempotency key for an offline answer.
   */
  public static generateIdempotencyKey(visitId: string, questionId: string): string {
    return `${visitId}_${questionId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Saves an answer into session-scoped local storage.
   */
  public static saveAnswer(visitId: string, answer: Omit<LocalStoredAnswer, 'idempotencyKey' | 'visitId'>): LocalStoredAnswer {
    const idempotencyKey = this.generateIdempotencyKey(visitId, answer.questionId);
    const item: LocalStoredAnswer = {
      ...answer,
      idempotencyKey,
      visitId,
    };

    const existing = this.getAnswersForVisit(visitId);
    // Replace if question was re-answered offline
    const filtered = existing.filter((a) => a.questionId !== answer.questionId);
    filtered.push(item);

    sessionStorage.setItem(`${this.STORAGE_KEY_PREFIX}${visitId}`, JSON.stringify(filtered));
    return item;
  }

  /**
   * Retrieves pending offline answers for this visit.
   */
  public static getAnswersForVisit(visitId: string): LocalStoredAnswer[] {
    const raw = sessionStorage.getItem(`${this.STORAGE_KEY_PREFIX}${visitId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Clears all session-scoped data when the session ends or times out.
   * STRICT SECURITY RULE: A shared device must never retain previous patient data.
   */
  public static clearSessionData(visitId: string): void {
    sessionStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${visitId}`);
    // Also clear any other session-scoped tokens
    sessionStorage.removeItem('kiosk_session_token');
    sessionStorage.removeItem('kiosk_patient_id');
  }
}
