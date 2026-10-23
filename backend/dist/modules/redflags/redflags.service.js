"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedFlagsService = void 0;
const redflags_repository_js_1 = require("./redflags.repository.js");
const fact_extractor_js_1 = require("./engine/fact-extractor.js");
const rule_evaluator_js_1 = require("./engine/rule-evaluator.js");
const rule_test_runner_js_1 = require("./engine/rule-test-runner.js");
const alert_lifecycle_js_1 = require("./alerts/alert-lifecycle.js");
const escalation_service_js_1 = require("./alerts/escalation-service.js");
const sse_broadcaster_js_1 = require("./alerts/sse-broadcaster.js");
const interview_service_js_1 = require("../interview/interview.service.js");
const documents_service_js_1 = require("../documents/documents.service.js");
const logger_js_1 = require("../../config/logger.js");
const app_error_js_1 = require("../../errors/app-error.js");
const error_codes_js_1 = require("../../errors/error-codes.js");
const redflags_types_js_1 = require("./redflags.types.js");
class RedFlagsService {
    // ============================================================================
    // INCREMENTAL EVALUATION (Module 3 & Module 4 hooks)
    // ============================================================================
    /**
     * Deterministically evaluates active red-flag rules against visit facts.
     * Incremental: Called after critical answers, document validation, or interview completion.
     * Safety Guarantee: Never silent on failure; raises STAFF_CHECK alert if evaluation crashes.
     */
    static async evaluateVisit(visitId, kioskDeviceId) {
        const raisedAlerts = [];
        try {
            // 1. Fetch raw interview answers (Module 3)
            let rawAnswers = [];
            try {
                const interviewData = await interview_service_js_1.InterviewService.getCompletedAnswers(visitId);
                rawAnswers = interviewData.answers || [];
            }
            catch (err) {
                // If interview not started or not completed yet, fetch partial answers if possible
                logger_js_1.logger.info('Interview answers not yet available for visit in evaluation', { visitId });
            }
            // 2. Fetch validated document fields (Module 4)
            let rawFields = [];
            try {
                const docs = await documents_service_js_1.DocumentsService.getValidatedDocumentFieldsForVisit(visitId);
                for (const doc of docs) {
                    for (const f of doc.validatedFields) {
                        rawFields.push({
                            id: f.id,
                            documentId: doc.documentId,
                            fieldType: f.fieldType,
                            isCritical: f.isCritical,
                            result: f.result,
                            matchedReferenceValue: f.matchedReferenceValue,
                            ocrConfidence: f.ocrConfidence,
                        });
                    }
                }
            }
            catch (err) {
                logger_js_1.logger.info('No documents yet available for visit in evaluation', { visitId });
            }
            // 3. Extract normalized facts map (3-state logic)
            const normalizedMap = fact_extractor_js_1.FactExtractor.extractNormalizedFacts(visitId, rawAnswers, rawFields);
            // 4. Fetch only ACTIVE rules
            const activeRules = await redflags_repository_js_1.RedFlagsRepository.getActiveRules();
            if (activeRules.length === 0) {
                return [];
            }
            // 5. Evaluate all active rules
            const evalInputs = activeRules.map((r) => ({
                id: r.id,
                ruleCode: r.ruleCode,
                version: r.version,
                name: r.name,
                description: r.description,
                severityTier: r.severityTier,
                conditionTree: r.conditionTree,
                raiseOnIndeterminate: r.raiseOnIndeterminate,
                recommendedStaffAction: r.recommendedStaffAction,
            }));
            const results = rule_evaluator_js_1.RuleEvaluator.evaluateAll(evalInputs, normalizedMap);
            // 6. Resolve kiosk location
            const kioskLocation = await redflags_repository_js_1.RedFlagsRepository.getKioskLocation(kioskDeviceId);
            // 7. Process alerts
            for (const res of results) {
                if (!res.shouldRaiseAlert || !res.alertSeverityTier || !res.triggerType) {
                    continue;
                }
                // Deduplication check: check if an open alert already exists for this rule and visit
                const existingOpenAlert = await redflags_repository_js_1.RedFlagsRepository.findOpenAlertForVisitAndRule(visitId, res.ruleId);
                if (existingOpenAlert) {
                    // Deduplicate by adding newly confirmed evidence rather than spamming
                    const updated = await redflags_repository_js_1.RedFlagsRepository.addEvidenceToAlert(existingOpenAlert.id, res.evidenceItems);
                    if (updated) {
                        raisedAlerts.push(updated);
                        sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:updated', updated);
                        logger_js_1.logger.info('Red-flag alert deduplicated with new evidence', {
                            alertId: existingOpenAlert.id,
                            visitId,
                            ruleCode: res.ruleCode,
                        });
                    }
                }
                else {
                    // Create new alert
                    const newAlert = await redflags_repository_js_1.RedFlagsRepository.createAlert({
                        visitId,
                        kioskDeviceId,
                        kioskLocation,
                        ruleId: res.ruleId,
                        ruleCode: res.ruleCode,
                        ruleVersion: res.ruleVersion,
                        severityTier: res.alertSeverityTier,
                        triggerType: res.triggerType,
                        ruleDescription: res.triggerType === 'INDETERMINATE'
                            ? `Uncertain Critical Question / Document Field: ${res.unknownCriticalFacts.join(', ')}`
                            : activeRules.find((r) => r.id === res.ruleId)?.description,
                        recommendedStaffAction: res.recommendedStaffAction,
                        evidences: res.evidenceItems,
                    });
                    raisedAlerts.push(newAlert);
                    sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:raised', newAlert);
                    logger_js_1.logger.info('Red-flag alert raised by deterministic rule engine', {
                        alertId: newAlert.id,
                        visitId,
                        ruleCode: res.ruleCode,
                        tier: newAlert.severityTier,
                        triggerType: newAlert.triggerType,
                    });
                }
            }
            return raisedAlerts;
        }
        catch (err) {
            // SECTION 36 REQUIREMENT: Fail loud, never silent!
            logger_js_1.logger.error('CRITICAL: Red-flag evaluation encountered an unexpected error', {
                visitId,
                error: String(err),
            });
            // Automatically create a STAFF_CHECK fallback alert so human clinical staff assesses directly
            const kioskLocation = await redflags_repository_js_1.RedFlagsRepository.getKioskLocation(kioskDeviceId);
            try {
                const fallbackAlert = await redflags_repository_js_1.RedFlagsRepository.createAlert({
                    visitId,
                    kioskDeviceId,
                    kioskLocation,
                    severityTier: redflags_types_js_1.SeverityTiers.STAFF_CHECK,
                    triggerType: redflags_types_js_1.TriggerTypes.INDETERMINATE,
                    ruleDescription: 'Automatic clinical screening system error. Direct staff assessment required.',
                    recommendedStaffAction: 'Please visit kiosk immediately and assess patient directly.',
                    evidences: [
                        {
                            sourceType: 'EVALUATION_ERROR',
                            sourceId: `err-${Date.now()}`,
                            factKey: 'system_evaluation_error',
                            factValueSnippet: 'Evaluation failure fallback',
                        },
                    ],
                });
                sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:raised', fallbackAlert);
            }
            catch {
                // Log failure if fallback alert could not be persisted
            }
            throw new app_error_js_1.AppError('Red-flag rule evaluation failed. Staff alert automatically generated.', 500, error_codes_js_1.ErrorCode.EVALUATION_ERROR);
        }
    }
    // ============================================================================
    // KIOSK HELP REQUEST (Always-visible button)
    // ============================================================================
    static async raiseManualHelpRequest(visitId, kioskDeviceId, reason) {
        const kioskLocation = await redflags_repository_js_1.RedFlagsRepository.getKioskLocation(kioskDeviceId);
        // Deduplication: check if open manual alert exists
        const existing = await redflags_repository_js_1.RedFlagsRepository.findOpenAlertForVisit(visitId);
        if (existing && existing.severityTier === redflags_types_js_1.SeverityTiers.MANUAL) {
            logger_js_1.logger.info('Manual help request deduplicated for visit', { visitId });
            return existing;
        }
        const alert = await redflags_repository_js_1.RedFlagsRepository.createAlert({
            visitId,
            kioskDeviceId,
            kioskLocation,
            severityTier: redflags_types_js_1.SeverityTiers.MANUAL,
            triggerType: redflags_types_js_1.TriggerTypes.MANUAL,
            ruleDescription: reason ? `Patient requested help: ${reason}` : 'Patient or companion pressed the "I Need Help" button at kiosk.',
            recommendedStaffAction: 'Attend to kiosk immediately to assist the patient.',
            evidences: [
                {
                    sourceType: 'MANUAL_REQUEST',
                    sourceId: `help-req-${Date.now()}`,
                    factKey: 'kiosk_help_button_pressed',
                    factValueSnippet: reason || 'I need help button activated',
                },
            ],
        });
        sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:raised', alert);
        logger_js_1.logger.info('Manual help alert raised from kiosk', {
            alertId: alert.id,
            visitId,
            kioskLocation,
        });
        return alert;
    }
    /**
     * MODULE 3B: Neutral Sensitive Disclosure Floor Alert
     * Triggers a dedicated SENSITIVE_DISCLOSURE alert category with pure neutral text ("Please assist the patient at kiosk X").
     * Zero sensitive clinical details in the alert text, notifications, or on the kiosk screen.
     */
    static async raiseSensitiveDisclosureAlert(visitId, kioskDeviceId, kioskLocation) {
        const location = kioskLocation || (await redflags_repository_js_1.RedFlagsRepository.getKioskLocation(kioskDeviceId)) || 'Device Kiosk';
        // Neutral text per Section 8: "Please assist the patient at kiosk X"
        const neutralDescription = `Please assist the patient at ${location}.`;
        const alert = await redflags_repository_js_1.RedFlagsRepository.createAlert({
            visitId,
            kioskDeviceId,
            kioskLocation: location,
            severityTier: redflags_types_js_1.SeverityTiers.SENSITIVE_DISCLOSURE,
            triggerType: redflags_types_js_1.TriggerTypes.MANUAL,
            ruleDescription: neutralDescription,
            recommendedStaffAction: 'Please attend kiosk to provide confidential patient assistance.',
            evidences: [
                {
                    sourceType: 'SENSITIVE_DISCLOSURE',
                    sourceId: `disclosure-${Date.now()}`,
                    factKey: 'sensitive_disclosure_triggered',
                    factValueSnippet: 'Neutral assistance requested',
                },
            ],
        });
        sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:raised', alert);
        logger_js_1.logger.info('Neutral sensitive disclosure alert raised for floor staff', {
            alertId: alert.id,
            visitId,
            kioskLocation: location,
            tier: redflags_types_js_1.SeverityTiers.SENSITIVE_DISCLOSURE,
        });
        return {
            alert,
            supportiveMessage: 'A trained staff member has been notified and will assist you in private. You are in a safe, confidential environment.',
            helplineDetails: 'National Support Helpline: 112 / Patient Care Advocacy: Ext. 4004',
        };
    }
    /**
     * MODULE 3B Section 5: Staff flag "patient unwell or unable"
     * Stops intake and routes straight to staff through Module 6 manual-alert path.
     */
    static async flagPatientUnwellOrUnable(visitId, kioskDeviceId, reason) {
        const location = (await redflags_repository_js_1.RedFlagsRepository.getKioskLocation(kioskDeviceId)) || 'Device Kiosk';
        const alert = await redflags_repository_js_1.RedFlagsRepository.createAlert({
            visitId,
            kioskDeviceId,
            kioskLocation: location,
            severityTier: redflags_types_js_1.SeverityTiers.MANUAL,
            triggerType: redflags_types_js_1.TriggerTypes.MANUAL,
            ruleDescription: `Patient unwell or unable to continue intake at ${location}. Direct clinical assistance needed.`,
            recommendedStaffAction: 'Attend to kiosk immediately and escort patient to clinical assessment area.',
            evidences: [
                {
                    sourceType: 'PATIENT_UNWELL_FLAG',
                    sourceId: `unwell-${Date.now()}`,
                    factKey: 'patient_unwell_or_unable',
                    factValueSnippet: reason || 'Patient flagged unwell/unable',
                },
            ],
        });
        sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:raised', alert);
        logger_js_1.logger.info('Patient unwell/unable flag raised, intake halted', {
            alertId: alert.id,
            visitId,
            reason,
        });
        return alert;
    }
    static async getKioskAlertStatus(visitId) {
        const openAlert = await redflags_repository_js_1.RedFlagsRepository.findOpenAlertForVisit(visitId);
        if (!openAlert) {
            return {
                hasActiveAlert: false,
                messageType: null,
            };
        }
        // Zero clinical detail leaked!
        const isImmediate = openAlert.severityTier === redflags_types_js_1.SeverityTiers.IMMEDIATE || openAlert.severityTier === redflags_types_js_1.SeverityTiers.URGENT || openAlert.severityTier === redflags_types_js_1.SeverityTiers.MANUAL;
        return {
            hasActiveAlert: true,
            messageType: isImmediate ? 'IMMEDIATE' : 'STAFF_CHECK',
        };
    }
    // ============================================================================
    // STAFF ALERT QUEUE MANAGEMENT
    // ============================================================================
    static async listAlerts(filters) {
        return redflags_repository_js_1.RedFlagsRepository.listAlerts(filters);
    }
    static async getAlertById(id) {
        const alert = await redflags_repository_js_1.RedFlagsRepository.getAlertById(id);
        if (!alert) {
            throw new app_error_js_1.NotFoundError(`Triage alert not found with ID: ${id}`);
        }
        return alert;
    }
    static async acknowledgeAlert(id, actorId, actorRole, note) {
        const alert = await this.getAlertById(id);
        alert_lifecycle_js_1.AlertLifecycle.validateTransition(alert.status, redflags_types_js_1.AlertStatuses.ACKNOWLEDGED);
        const updated = await redflags_repository_js_1.RedFlagsRepository.updateAlertStatus(id, redflags_types_js_1.AlertStatuses.ACKNOWLEDGED, actorId, actorRole, note ? { resolutionNote: note } : undefined);
        if (!updated)
            throw new app_error_js_1.NotFoundError('Alert not found during acknowledgement');
        sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:acknowledged', updated);
        logger_js_1.logger.info('Triage alert acknowledged by staff', { alertId: id, actorId });
        return updated;
    }
    static async startAssessment(id, actorId, actorRole, note) {
        const alert = await this.getAlertById(id);
        alert_lifecycle_js_1.AlertLifecycle.validateTransition(alert.status, redflags_types_js_1.AlertStatuses.IN_ASSESSMENT);
        const updated = await redflags_repository_js_1.RedFlagsRepository.updateAlertStatus(id, redflags_types_js_1.AlertStatuses.IN_ASSESSMENT, actorId, actorRole, note ? { resolutionNote: note } : undefined);
        if (!updated)
            throw new app_error_js_1.NotFoundError('Alert not found');
        sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:updated', updated);
        logger_js_1.logger.info('Triage alert moved to IN_ASSESSMENT', { alertId: id, actorId });
        return updated;
    }
    static async resolveAlert(id, actorId, actorRole, resolutionType, resolutionNote) {
        const alert = await this.getAlertById(id);
        alert_lifecycle_js_1.AlertLifecycle.validateTransition(alert.status, redflags_types_js_1.AlertStatuses.RESOLVED);
        alert_lifecycle_js_1.AlertLifecycle.validateResolution(resolutionType);
        const updated = await redflags_repository_js_1.RedFlagsRepository.updateAlertStatus(id, redflags_types_js_1.AlertStatuses.RESOLVED, actorId, actorRole, { resolutionType, resolutionNote });
        if (!updated)
            throw new app_error_js_1.NotFoundError('Alert not found');
        sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:resolved', updated);
        logger_js_1.logger.info('Triage alert RESOLVED', { alertId: id, resolutionType });
        return updated;
    }
    static async escalateAlert(id, actorId, actorRole, reason) {
        const alert = await this.getAlertById(id);
        alert_lifecycle_js_1.AlertLifecycle.validateTransition(alert.status, redflags_types_js_1.AlertStatuses.ESCALATED);
        const updated = await redflags_repository_js_1.RedFlagsRepository.updateAlertStatus(id, redflags_types_js_1.AlertStatuses.ESCALATED, actorId, actorRole, reason ? { resolutionNote: reason } : undefined);
        if (!updated)
            throw new app_error_js_1.NotFoundError('Alert not found');
        sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:escalated', updated);
        logger_js_1.logger.info('Triage alert ESCALATED', { alertId: id, level: updated.escalationLevel });
        return updated;
    }
    static async dismissAlert(id, actorId, actorRole, dismissalReason, note) {
        const alert = await this.getAlertById(id);
        alert_lifecycle_js_1.AlertLifecycle.validateTransition(alert.status, redflags_types_js_1.AlertStatuses.DISMISSED);
        alert_lifecycle_js_1.AlertLifecycle.validateDismissal(dismissalReason);
        const updated = await redflags_repository_js_1.RedFlagsRepository.updateAlertStatus(id, redflags_types_js_1.AlertStatuses.DISMISSED, actorId, actorRole, { dismissalReason, resolutionNote: note });
        if (!updated)
            throw new app_error_js_1.NotFoundError('Alert not found');
        sse_broadcaster_js_1.SSEBroadcaster.broadcastAlert('alert:dismissed', updated);
        logger_js_1.logger.info('Triage alert DISMISSED as false positive', { alertId: id, dismissalReason });
        return updated;
    }
    // ============================================================================
    // ADMIN & CLINICAL REVIEW OF RULES
    // ============================================================================
    static async listRules() {
        return redflags_repository_js_1.RedFlagsRepository.listRules();
    }
    static async getRuleById(id) {
        const rule = await redflags_repository_js_1.RedFlagsRepository.getRuleById(id);
        if (!rule) {
            throw new app_error_js_1.NotFoundError(`Red-flag rule not found with ID: ${id}`);
        }
        return rule;
    }
    static async createRule(data, authorId) {
        const existing = await redflags_repository_js_1.RedFlagsRepository.getRuleByCode(data.ruleCode);
        if (existing) {
            throw new app_error_js_1.ValidationError(`A rule with code '${data.ruleCode}' already exists.`);
        }
        const rule = await redflags_repository_js_1.RedFlagsRepository.createRule({
            ...data,
            createdBy: authorId,
        });
        logger_js_1.logger.info('Red-flag rule authored in DRAFT state', {
            ruleId: rule.id,
            ruleCode: rule.ruleCode,
            authorId,
        });
        return rule;
    }
    static async updateRule(id, updates) {
        const rule = await this.getRuleById(id);
        if (rule.status === redflags_types_js_1.RuleStatuses.ACTIVE) {
            throw new app_error_js_1.ValidationError('Active rules cannot be edited in place. Create a new version instead.');
        }
        const updated = await redflags_repository_js_1.RedFlagsRepository.updateRule(id, updates);
        if (!updated)
            throw new app_error_js_1.NotFoundError('Rule not found during update');
        return updated;
    }
    static async runRuleTests(id) {
        const rule = await this.getRuleById(id);
        return rule_test_runner_js_1.RuleTestRunner.runTests(rule, rule.testCases || []);
    }
    static async submitRuleForReview(id, actorId) {
        const rule = await this.getRuleById(id);
        if (rule.status !== redflags_types_js_1.RuleStatuses.DRAFT) {
            throw new app_error_js_1.ValidationError(`Only DRAFT rules can be submitted for review. Current status: ${rule.status}`);
        }
        // Gating check: Must pass test cases
        const testResults = rule_test_runner_js_1.RuleTestRunner.runTests(rule, rule.testCases || []);
        if (!testResults.passed) {
            throw new app_error_js_1.AppError(`Cannot submit rule for review: ${testResults.failedTests} test case(s) failed.`, 400, error_codes_js_1.ErrorCode.RULE_TESTS_FAILED);
        }
        const updated = await redflags_repository_js_1.RedFlagsRepository.updateRule(id, {
            status: redflags_types_js_1.RuleStatuses.CLINICAL_REVIEW,
            updatedBy: actorId,
        });
        logger_js_1.logger.info('Red-flag rule submitted for clinical review', { ruleId: id, actorId });
        return updated;
    }
    static async approveRule(id, reviewerId, reviewerRole) {
        const rule = await this.getRuleById(id);
        if (rule.status !== redflags_types_js_1.RuleStatuses.CLINICAL_REVIEW) {
            throw new app_error_js_1.ValidationError(`Only rules in CLINICAL_REVIEW can be approved. Current status: ${rule.status}`);
        }
        // Clinical reviewer role permission check
        if (reviewerRole !== 'DOCTOR' && reviewerRole !== 'SUPER_ADMIN') {
            throw new app_error_js_1.ForbiddenError('Clinical sign-off requires DOCTOR or clinical reviewer role.');
        }
        // Separation of duties check
        if (rule.createdBy && rule.createdBy === reviewerId) {
            throw new app_error_js_1.ForbiddenError('Separation of duties: The person who authored the rule cannot be the sole approver.');
        }
        // Final test harness gate
        const testResults = rule_test_runner_js_1.RuleTestRunner.runTests(rule, rule.testCases || []);
        if (!testResults.passed) {
            throw new app_error_js_1.AppError('Cannot approve rule: Automated test harness suite failed.', 400, error_codes_js_1.ErrorCode.RULE_TESTS_FAILED);
        }
        const updated = await redflags_repository_js_1.RedFlagsRepository.updateRule(id, {
            status: redflags_types_js_1.RuleStatuses.ACTIVE,
            clinicallyReviewedBy: reviewerId,
            clinicallyReviewedAt: new Date().toISOString(),
            effectiveFrom: new Date().toISOString(),
        });
        logger_js_1.logger.info('Red-flag rule ACTIVATED after clinical review approval', {
            ruleId: id,
            reviewerId,
            ruleCode: rule.ruleCode,
            version: rule.version,
        });
        return updated;
    }
    static async retireRule(id, actorId) {
        await this.getRuleById(id);
        const updated = await redflags_repository_js_1.RedFlagsRepository.updateRule(id, {
            status: redflags_types_js_1.RuleStatuses.RETIRED,
            updatedBy: actorId,
        });
        logger_js_1.logger.info('Red-flag rule RETIRED', { ruleId: id, actorId });
        return updated;
    }
    // ============================================================================
    // BACKGROUND ESCALATION SWEEPER
    // ============================================================================
    static async sweepAndEscalateStaleAlerts() {
        const openAlerts = await redflags_repository_js_1.RedFlagsRepository.listAlerts({ status: redflags_types_js_1.AlertStatuses.RAISED });
        let escalatedCount = 0;
        for (const alert of openAlerts) {
            const shouldEscalate = escalation_service_js_1.EscalationService.shouldEscalate(alert.severityTier, alert.status, new Date(alert.raisedAt));
            if (shouldEscalate) {
                await this.escalateAlert(alert.id, 'system-escalation-sweeper', 'SYSTEM', 'Unacknowledged SLA exceeded');
                escalatedCount++;
            }
        }
        return escalatedCount;
    }
}
exports.RedFlagsService = RedFlagsService;
