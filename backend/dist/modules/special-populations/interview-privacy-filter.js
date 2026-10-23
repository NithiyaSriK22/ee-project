"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewPrivacyFilter = void 0;
const special_populations_types_js_1 = require("./special-populations.types.js");
class InterviewPrivacyFilter {
    /**
     * Filters interview answers based on requesting staff role.
     * - DOCTOR: full unredacted clinical view
     * - STAFF_ATTENDANT / RECEPTIONIST: DOCTOR_ONLY items are masked/redacted
     */
    static filterAnswersForRole(answers, userRole) {
        const isDoctor = userRole === 'DOCTOR' || userRole === 'PHYSICIAN';
        return answers.map((ans) => {
            const isDoctorOnly = ans.visibilityScope === special_populations_types_js_1.VisibilityScopes.DOCTOR_ONLY ||
                ans.sensitivityLevel === special_populations_types_js_1.SensitivityLevels.HIGHLY_SENSITIVE;
            if (isDoctorOnly && !isDoctor) {
                return {
                    ...ans,
                    isRedacted: true,
                    promptText: '[CONFIDENTIAL - DOCTOR CONSULTATION ONLY]',
                    answerValue: '[REDACTED - VIEWABLE ONLY BY ATTENDING DOCTOR]',
                };
            }
            return {
                ...ans,
                isRedacted: false,
            };
        });
    }
    /**
     * Filters answers prior to constructing LLM summarization payloads.
     * AI Summarizer strictly omits any items marked aiSummarizationAllowed: false,
     * DOCTOR_ONLY, or HIGHLY_SENSITIVE to prevent 3rd-party/cloud leakage of private disclosures.
     */
    static filterForAiSummarizer(answers) {
        const safeForAi = [];
        const excludedSensitive = [];
        for (const ans of answers) {
            const isBlockedFromAi = ans.aiSummarizationAllowed === false ||
                ans.visibilityScope === special_populations_types_js_1.VisibilityScopes.DOCTOR_ONLY ||
                ans.sensitivityLevel === special_populations_types_js_1.SensitivityLevels.HIGHLY_SENSITIVE;
            if (isBlockedFromAi) {
                excludedSensitive.push({ ...ans });
            }
            else {
                safeForAi.push({ ...ans });
            }
        }
        return {
            safeForAiSummarizer: safeForAi,
            excludedSensitiveItems: excludedSensitive,
            totalSafeCount: safeForAi.length,
            totalExcludedCount: excludedSensitive.length,
        };
    }
    /**
     * Carry-Forward Gate: Prevents sensitive items from silently propagating across visits
     * without fresh patient re-disclosure.
     */
    static filterForCarryForward(previousVisitAnswers) {
        return previousVisitAnswers.filter((ans) => {
            if (ans.carryForwardAllowed === false) {
                return false;
            }
            if (ans.sensitivityLevel === special_populations_types_js_1.SensitivityLevels.HIGHLY_SENSITIVE) {
                return false;
            }
            return true;
        });
    }
    /**
     * Formats excluded sensitive items into a structured block for Doctor Review UI
     */
    static formatDoctorReviewSensitiveBlock(excludedItems) {
        return {
            header: '🔒 Sensitive Patient Disclosures (Doctor Review Only — Not Processed by AI)',
            totalCount: excludedItems.length,
            items: excludedItems.map((item) => ({
                prompt: item.promptText,
                answer: item.answerValue,
                provenance: item.provenanceLabel,
                answeredAt: item.answeredAt,
            })),
        };
    }
}
exports.InterviewPrivacyFilter = InterviewPrivacyFilter;
