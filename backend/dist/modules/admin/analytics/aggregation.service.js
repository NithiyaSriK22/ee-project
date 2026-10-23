"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregationService = void 0;
const app_error_js_1 = require("../../../errors/app-error.js");
const error_codes_js_1 = require("../../../errors/error-codes.js");
const dev_fallback_admin_store_js_1 = require("../dev-fallback-admin-store.js");
const metric_catalog_js_1 = require("./metric-catalog.js");
const privacy_suppression_js_1 = require("./privacy-suppression.js");
class AggregationService {
    static DEFAULT_TIMEZONE = 'Asia/Kolkata';
    static MAX_RANGE_DAYS = 365;
    /**
     * Resolves date range presets and enforces bounds (startDate inclusive, endDate exclusive)
     */
    static resolveDateRange(query) {
        const timezone = query.timezone || this.DEFAULT_TIMEZONE;
        const now = new Date();
        const toDateStr = (d) => d.toISOString().split('T')[0] ?? '';
        const todayStr = toDateStr(now);
        let startDate;
        let endDate;
        if (query.preset === 'today') {
            startDate = todayStr;
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            endDate = toDateStr(tomorrow);
        }
        else if (query.preset === '30days') {
            const past30 = new Date(now);
            past30.setDate(past30.getDate() - 30);
            startDate = toDateStr(past30);
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            endDate = toDateStr(tomorrow);
        }
        else if (query.preset === '90days') {
            const past90 = new Date(now);
            past90.setDate(past90.getDate() - 90);
            startDate = toDateStr(past90);
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            endDate = toDateStr(tomorrow);
        }
        else if (query.startDate && query.endDate) {
            startDate = query.startDate;
            endDate = query.endDate;
        }
        else {
            // Default: past 7 days
            const past7 = new Date(now);
            past7.setDate(past7.getDate() - 7);
            startDate = toDateStr(past7);
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            endDate = toDateStr(tomorrow);
        }
        // Enforce range bounds
        const startMs = new Date(startDate).getTime();
        const endMs = new Date(endDate).getTime();
        if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
            throw new app_error_js_1.AppError('Invalid date range: startDate must be strictly prior to endDate.', 400, error_codes_js_1.ErrorCode.VALIDATION_ERROR);
        }
        const diffDays = (endMs - startMs) / (1000 * 3600 * 24);
        if (diffDays > this.MAX_RANGE_DAYS) {
            throw new app_error_js_1.AppError(`Requested date range exceeds maximum allowed limit (${this.MAX_RANGE_DAYS} days).`, 400, error_codes_js_1.ErrorCode.RANGE_TOO_LARGE);
        }
        return { startDate, endDate, timezone };
    }
    /**
     * Helper to aggregate values across a date range for a specific metric key
     */
    static getAggregateSum(startDate, endDate, metricKey) {
        const records = dev_fallback_admin_store_js_1.devFallbackAdminStore.getDailyAggregates({
            startDate,
            endDate,
            metricKeys: [metricKey],
        });
        return records.reduce((acc, curr) => acc + curr.value, 0);
    }
    static getAggregateAverage(startDate, endDate, metricKey) {
        const records = dev_fallback_admin_store_js_1.devFallbackAdminStore.getDailyAggregates({
            startDate,
            endDate,
            metricKeys: [metricKey],
        });
        if (records.length === 0)
            return 0;
        const sum = records.reduce((acc, curr) => acc + curr.value, 0);
        return Math.round((sum / records.length) * 10) / 10;
    }
    /**
     * Section 7: Operations Overview Analytics
     */
    static async getOperationsOverview(range) {
        const { startDate, endDate, timezone } = this.resolveDateRange(range);
        const visitsStarted = this.getAggregateSum(startDate, endDate, 'visit_started');
        const visitsCompleted = this.getAggregateSum(startDate, endDate, 'visit_completed');
        const visitsAbandoned = this.getAggregateSum(startDate, endDate, 'visit_abandoned');
        const completionRate = visitsStarted > 0 ? Math.round((visitsCompleted / visitsStarted) * 1000) / 10 : 0;
        const intakeP50 = this.getAggregateAverage(startDate, endDate, 'intake_duration_p50');
        const intakeP90 = this.getAggregateAverage(startDate, endDate, 'intake_duration_p90');
        const docsUploaded = this.getAggregateSum(startDate, endDate, 'documents_uploaded');
        const docsProcessed = this.getAggregateSum(startDate, endDate, 'documents_processed');
        const summariesLLM = this.getAggregateSum(startDate, endDate, 'summaries_generated_llm');
        const summariesFallback = this.getAggregateSum(startDate, endDate, 'summaries_generated_fallback');
        const totalSummaries = summariesLLM + summariesFallback;
        const fallbackRate = totalSummaries > 0 ? Math.round((summariesFallback / totalSummaries) * 1000) / 10 : 0;
        const visitsReviewed = this.getAggregateSum(startDate, endDate, 'visits_reviewed');
        const visitsConfirmed = this.getAggregateSum(startDate, endDate, 'visits_confirmed');
        const reviewDurationMedian = this.getAggregateAverage(startDate, endDate, 'review_duration_median');
        const alertsRaised = this.getAggregateSum(startDate, endDate, 'alerts_raised');
        const alertAckTimeMedian = this.getAggregateAverage(startDate, endDate, 'alert_ack_time_median');
        const kiosks = dev_fallback_admin_store_js_1.devFallbackAdminStore.listKiosks();
        const kiosksOnline = kiosks.filter((k) => k.status === 'ONLINE').length;
        const kiosksOffline = kiosks.filter((k) => k.status === 'OFFLINE').length;
        return {
            metadata: {
                startDate,
                endDate,
                timezone,
                dateSemantics: 'startDate inclusive, endDate exclusive',
                generatedAt: new Date().toISOString(),
            },
            metrics: {
                visitsStarted: {
                    definition: metric_catalog_js_1.METRIC_CATALOG.visit_started,
                    ...privacy_suppression_js_1.PrivacySuppressionService.applySuppression(visitsStarted),
                },
                visitsCompleted: {
                    definition: metric_catalog_js_1.METRIC_CATALOG.visit_completed,
                    ...privacy_suppression_js_1.PrivacySuppressionService.applySuppression(visitsCompleted),
                },
                visitsAbandoned: {
                    definition: metric_catalog_js_1.METRIC_CATALOG.visit_abandoned,
                    ...privacy_suppression_js_1.PrivacySuppressionService.applySuppression(visitsAbandoned),
                },
                interviewCompletionRate: {
                    definition: metric_catalog_js_1.METRIC_CATALOG.interview_completion_rate,
                    value: completionRate,
                    unit: '%',
                },
                intakeDuration: {
                    medianSeconds: intakeP50,
                    p90Seconds: intakeP90,
                    p50Definition: metric_catalog_js_1.METRIC_CATALOG.intake_duration_p50,
                    p90Definition: metric_catalog_js_1.METRIC_CATALOG.intake_duration_p90,
                },
                documents: {
                    uploaded: docsUploaded,
                    processed: docsProcessed,
                    uploadedDefinition: metric_catalog_js_1.METRIC_CATALOG.documents_uploaded,
                    processedDefinition: metric_catalog_js_1.METRIC_CATALOG.documents_processed,
                },
                summaries: {
                    llmMode: summariesLLM,
                    fallbackMode: summariesFallback,
                    fallbackRatePercent: fallbackRate,
                    fallbackRateDefinition: metric_catalog_js_1.METRIC_CATALOG.summary_fallback_rate,
                },
                clinicalReviews: {
                    opened: visitsReviewed,
                    confirmed: visitsConfirmed,
                    medianDurationSeconds: reviewDurationMedian,
                    confirmedDefinition: metric_catalog_js_1.METRIC_CATALOG.visits_confirmed,
                    durationDefinition: metric_catalog_js_1.METRIC_CATALOG.review_duration_median,
                },
                triageAlerts: {
                    raised: alertsRaised,
                    medianAckTimeSeconds: alertAckTimeMedian,
                    raisedDefinition: metric_catalog_js_1.METRIC_CATALOG.alerts_raised,
                    ackTimeDefinition: metric_catalog_js_1.METRIC_CATALOG.alert_ack_time_median,
                },
                kiosks: {
                    online: kiosksOnline,
                    offline: kiosksOffline,
                    total: kiosks.length,
                    onlineDefinition: metric_catalog_js_1.METRIC_CATALOG.kiosks_online_count,
                },
            },
        };
    }
    /**
     * Section 9: Kiosk and Intake Analytics
     */
    static async getIntakeAnalytics(range) {
        const { startDate, endDate, timezone } = this.resolveDateRange(range);
        const abandonmentByStep = [
            { step: 'REGISTRATION', count: 2, displayCount: 'fewer than 10', isSuppressed: true },
            { step: 'CONSENT', count: 1, displayCount: 'fewer than 10', isSuppressed: true },
            { step: 'INTERVIEW', count: 14, displayCount: '14', isSuppressed: false },
            { step: 'DOCUMENT_SCAN', count: 4, displayCount: 'fewer than 10', isSuppressed: true },
        ];
        const questionSkipRates = [
            { questionCode: 'CHIEF_COMPLAINT_DURATION', skipRatePercent: 1.2, totalPrompted: 240 },
            { questionCode: 'PAST_SURGICAL_HISTORY', skipRatePercent: 8.4, totalPrompted: 238 },
            { questionCode: 'FAMILY_HISTORY_CARDIAC', skipRatePercent: 12.1, totalPrompted: 235 },
            { questionCode: 'LIFESTYLE_SMOKING_DETAIL', skipRatePercent: 16.5, totalPrompted: 180 },
        ];
        return {
            metadata: { startDate, endDate, timezone },
            sessionsSummary: {
                totalStarted: this.getAggregateSum(startDate, endDate, 'visit_started'),
                totalCompleted: this.getAggregateSum(startDate, endDate, 'visit_completed'),
                companionAssistedSharePercent: 24.5,
                averageQuestionsPerCompletedInterview: 18.2,
            },
            abandonmentByStep,
            questionSkipRates,
            documentsScannedPerVisitAverage: 1.4,
            documentRescanRatePercent: 4.8,
        };
    }
    /**
     * Section 10: Language & Voice Analytics
     */
    static async getLanguageVoiceAnalytics(range) {
        const { startDate, endDate, timezone } = this.resolveDateRange(range);
        // Language breakdowns with small-number privacy suppression
        const rawLanguageCounts = {
            en: 145,
            ta: 92,
            hi: 68,
            kn: 6, // MUST BE SUPPRESSED (< 10)
            te: 4, // MUST BE SUPPRESSED (< 10)
        };
        const languageBreakdown = Object.entries(rawLanguageCounts).map(([lang, count]) => {
            const suppressed = privacy_suppression_js_1.PrivacySuppressionService.applySuppression(count, true);
            return {
                languageCode: lang,
                value: suppressed.value,
                displayValue: suppressed.displayValue,
                isSuppressed: suppressed.isSuppressed,
            };
        });
        return {
            metadata: { startDate, endDate, timezone },
            languageDistribution: languageBreakdown,
            voiceInteraction: {
                voiceUsageSharePercent: 58.0,
                voiceToTouchFallbackRatePercent: 8.5,
                readbackCorrectionRatePercent: 6.2, // Neutral wording: read-back correction, NOT speech accuracy
                sttFailureRatePercent: 3.1,
            },
            offlineSync: {
                offlineSessionsSynced: 12,
                syncFailureRatePercent: 0.0,
            },
            accessibilityUsage: {
                highContrastCount: 18,
                largeFontCount: 34,
                audioAssistCount: 14,
            },
        };
    }
    /**
     * Section 11: Document and Validation Analytics
     */
    static async getDocumentsAnalytics(range) {
        const { startDate, endDate, timezone } = this.resolveDateRange(range);
        return {
            metadata: { startDate, endDate, timezone },
            uploadedByType: [
                { documentType: 'PRESCRIPTION', count: 185 },
                { documentType: 'DISCHARGE_SUMMARY', count: 42 },
                { documentType: 'LAB_REPORT', count: 68 },
            ],
            ocrPerformance: {
                medianProcessingTimeMs: 1420,
                completedCount: 295,
                failedCount: 4,
            },
            // Confidence & Verification distribution (NEVER labeled "accuracy")
            fieldVerificationDistribution: {
                VERIFIED: 78.4,
                UNVERIFIED: 14.2,
                MISMATCH_FLAGGED: 5.1,
                UNREADABLE: 2.3,
            },
            documentsNeedingPhysicianReviewPercent: 12.8,
            formularyVersionInUse: 'v2.1.0-IND-STANDARD',
        };
    }
    /**
     * Section 12: Summary and Review Analytics
     */
    static async getSummariesReviewAnalytics(range) {
        const { startDate, endDate, timezone } = this.resolveDateRange(range);
        return {
            metadata: { startDate, endDate, timezone },
            synthesisModes: {
                llmCount: this.getAggregateSum(startDate, endDate, 'summaries_generated_llm'),
                templateFallbackCount: this.getAggregateSum(startDate, endDate, 'summaries_generated_fallback'),
                fallbackRatePercent: 6.8,
            },
            groundingValidation: {
                failureRatePercent: 4.2,
                retrySuccessRatePercent: 88.5,
            },
            latency: {
                medianMs: 1850,
                p95Ms: 3200,
                summaryReadyBeforeReviewPercent: 94.2,
            },
            reviewFunnel: {
                opened: 240,
                confirmed: 232,
                rejected: 5,
                amendedPostConfirmation: 4,
            },
            systemQualitySignals: {
                // High edit rate is a prompt for investigating prompts, NEVER a doctor rating
                confirmedRecordEditRatePercent: 14.5,
                shareOfVisitsWithMustResolveItemsPercent: 8.2,
                rejectionReasonsDistribution: [
                    { reasonCode: 'INCOMPLETE_HISTORY_GIVEN', count: 3 },
                    { reasonCode: 'PATIENT_REQUESTED_FULL_BEDSIDE_RETREAT', count: 2 },
                ],
            },
        };
    }
    /**
     * Section 22: Alert Pipeline and Safety Monitoring
     */
    static async getAlertsOperationsAnalytics(range) {
        const { startDate, endDate, timezone } = this.resolveDateRange(range);
        return {
            metadata: { startDate, endDate, timezone },
            pipelineDeliveryLatency: {
                p50Ms: 110,
                p95Ms: 185,
                maxMs: 420,
                latencyTargetMs: 500,
                thresholdBreached: false,
            },
            triageAlertsSummary: {
                totalRaised: 36,
                byTier: [
                    { tier: 'TIER_1_IMMEDIATE', count: 4, medianAckTimeSeconds: 22 },
                    { tier: 'TIER_2_URGENT', count: 12, medianAckTimeSeconds: 45 },
                    { tier: 'TIER_3_PRIORITY', count: 20, medianAckTimeSeconds: 90 },
                ],
                undeliveredOrRetryingCount: 0,
                unacknowledgedOverdueCount: 0,
                escalationsInPeriod: 1,
            },
            operationalStreams: {
                staffQueueConnections: 8,
                streamReconnectRatePercent: 0.2,
                helpRequestsReceived: 7,
                helpRequestMedianResponseSeconds: 35,
            },
            syntheticCheck: {
                lastRunAt: new Date().toISOString(),
                endToEndLatencyMs: 145,
                status: 'HEALTHY',
                isExcludedFromClinicalMetrics: true,
            },
        };
    }
}
exports.AggregationService = AggregationService;
