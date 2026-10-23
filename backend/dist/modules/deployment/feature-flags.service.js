"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagsService = void 0;
const logger_js_1 = require("../../config/logger.js");
const dev_fallback_admin_store_js_1 = require("../admin/dev-fallback-admin-store.js");
class FeatureFlagsService {
    static flags = new Map([
        [
            'AI_SUMMARIZATION_ENABLED',
            {
                key: 'AI_SUMMARIZATION_ENABLED',
                enabled: true,
                name: 'AI Clinical Summarization',
                description: 'Enables LLM-powered clinical note draft generation for doctor review workspace.',
                effectWhenOff: 'Summarizer switches to deterministic, template-only summary generator (Module 5 fallback).',
                ownerRole: 'CLINICAL_LEAD',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'VOICE_ENABLED',
            {
                key: 'VOICE_ENABLED',
                enabled: true,
                name: 'Voice STT / TTS Intake',
                description: 'Enables speech-to-text input and text-to-speech audio guidance on kiosk devices.',
                effectWhenOff: 'Kiosks switch immediately to touch-only touchscreen keyboard and visual prompts.',
                ownerRole: 'IT_OPERATIONS',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'ASSISTANT_ENABLED',
            {
                key: 'ASSISTANT_ENABLED',
                enabled: true,
                name: 'Kiosk Interactive Help Assistant',
                description: 'Provides conversational navigation assistance and question clarification at kiosk.',
                effectWhenOff: 'Kiosk shows static help cards, instructional diagrams, and the emergency call button.',
                ownerRole: 'CLINICAL_LEAD',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'OCR_ENABLED',
            {
                key: 'OCR_ENABLED',
                enabled: true,
                name: 'Prescription & Document OCR',
                description: 'Automated optical character recognition and deterministic formulary matching for uploads.',
                effectWhenOff: 'Documents captured as secure raw images; fields flagged as not extracted for manual doctor review.',
                ownerRole: 'IT_OPERATIONS',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'MACHINE_TRANSLATION_ENABLED',
            {
                key: 'MACHINE_TRANSLATION_ENABLED',
                enabled: true,
                name: 'Multilingual Dynamic Translation',
                description: 'Serves approved localized strings and on-the-fly validated translations.',
                effectWhenOff: 'Doctor workspace and kiosks display verified original strings in original intake language.',
                ownerRole: 'CLINICAL_LEAD',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'SMS_ENABLED',
            {
                key: 'SMS_ENABLED',
                enabled: false, // Default off in dev/pilot until telecom gateway approved
                name: 'Outbound Patient SMS Dispatch',
                description: 'Sends queue position updates and post-consultation appointment reminders.',
                effectWhenOff: 'No SMS messages sent; in-app portal notifications and kiosk printed slips continue normally.',
                ownerRole: 'ADMIN',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'SYNTHETIC_ALERT_CHECK_ENABLED',
            {
                key: 'SYNTHETIC_ALERT_CHECK_ENABLED',
                enabled: true,
                name: 'Alert Pipeline Synthetic Heartbeat Check',
                description: 'Periodically injects synthetic canary alerts in staging to verify end-to-end alert delivery.',
                effectWhenOff: 'Synthetic probe paused; live patient triage alert evaluation and delivery is completely unaffected.',
                ownerRole: 'IT_OPERATIONS',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'KIOSK_INTAKE_ENABLED',
            {
                key: 'KIOSK_INTAKE_ENABLED',
                enabled: true,
                name: 'Kiosk Patient Registration Intake',
                description: 'Permits new kiosk sessions to be initiated at enrolled kiosk terminals.',
                effectWhenOff: 'Kiosk displays calm message: "Please see the OPD reception desk for paper-assisted registration."',
                ownerRole: 'ADMIN',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'HOSPITAL_FILE_DROP_ENABLED',
            {
                key: 'HOSPITAL_FILE_DROP_ENABLED',
                enabled: false,
                name: 'Hospital EHR File-Drop Adapter',
                description: 'Enables automated export file drops to configured hospital network share folder.',
                effectWhenOff: 'Adapter operates in safe no-op mode without file drops.',
                ownerRole: 'IT_OPERATIONS',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'HOSPITAL_ENDPOINT_PUSH_ENABLED',
            {
                key: 'HOSPITAL_ENDPOINT_PUSH_ENABLED',
                enabled: false,
                name: 'Hospital EHR Endpoint Push Adapter',
                description: 'Enables automated HTTP push of confirmed records to hospital EHR endpoint.',
                effectWhenOff: 'Adapter operates in safe no-op mode without outbound network push.',
                ownerRole: 'IT_OPERATIONS',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'FHIR_R4_EXPORT_ENABLED',
            {
                key: 'FHIR_R4_EXPORT_ENABLED',
                enabled: false,
                name: 'FHIR R4 Bundle Mapping',
                description: 'Enables FHIR R4 document mapping and export for hospital integration.',
                effectWhenOff: 'FHIR R4 export endpoint is disabled.',
                ownerRole: 'CLINICAL_LEAD',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'PATIENT_COPY_ENABLED',
            {
                key: 'PATIENT_COPY_ENABLED',
                enabled: false,
                name: 'Patient Copy Generation',
                description: 'Permits doctors to generate plain-language patient copies via print or short-lived link.',
                effectWhenOff: 'Patient copy feature is disabled; only doctor-scoped exports are permitted.',
                ownerRole: 'CLINICAL_LEAD',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'DEMO_MODE_ENABLED',
            {
                key: 'DEMO_MODE_ENABLED',
                enabled: false,
                name: 'Demo Mode Demonstration Environment',
                description: 'Enables safe synthetic demonstration environment with persistent DEMO banner and scenario runner.',
                effectWhenOff: 'Demo endpoints and banners are disabled; system functions in standard clinical mode.',
                ownerRole: 'ADMIN',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
        [
            'FAULT_INJECTION_ENABLED',
            {
                key: 'FAULT_INJECTION_ENABLED',
                enabled: false,
                name: 'Provider Fault Injection for Resilience Testing',
                description: 'Injects configurable latency, errors, and timeouts to simulate partner outages.',
                effectWhenOff: 'All providers operate with standard live/mock latency and zero artificial failures.',
                ownerRole: 'IT_OPERATIONS',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'SYSTEM_INIT',
                rehearsedInStaging: true,
            },
        ],
    ]);
    static globalIntakePause = {
        isPaused: false,
        pausedAt: null,
        pausedBy: null,
        actorRole: null,
        reason: null,
        estimatedResumeTime: null,
    };
    /**
     * Retrieves all feature flags and their current status.
     */
    static getAllFlags() {
        return Array.from(this.flags.values());
    }
    /**
     * Checks whether a specific feature flag is currently enabled.
     */
    static isFlagEnabled(key) {
        const flag = this.flags.get(key);
        return flag ? flag.enabled : true;
    }
    /**
     * Updates a feature flag. Audited as a critical clinical safety event.
     * Safety constraint: Cannot disable doctor review or emergency help.
     */
    static updateFlag(key, enabled, actor, reason) {
        const flag = this.flags.get(key);
        if (!flag) {
            throw new Error(`Unknown feature flag: ${key}`);
        }
        const previousState = flag.enabled;
        flag.enabled = enabled;
        flag.lastModifiedAt = new Date().toISOString();
        flag.lastModifiedBy = `${actor.role}:${actor.id}`;
        flag.changeReason = reason;
        logger_js_1.logger.info('[KILL_SWITCH_TOGGLED]', {
            flagKey: key,
            previousState,
            newState: enabled,
            actorRole: actor.role,
            actorId: actor.id,
            reason,
        });
        // Record in tamper-evident audit log
        dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
            actorType: 'STAFF',
            actorId: actor.id,
            actorRole: actor.role,
            action: 'FEATURE_FLAG_MODIFIED',
            entityType: 'FEATURE_FLAG',
            entityId: key,
            result: 'SUCCESS',
            metadata: {
                flagKey: key,
                previousState,
                newState: enabled,
                reason,
            },
        });
        return flag;
    }
    /**
     * Global Intake Pause status
     */
    static getGlobalIntakePauseState() {
        return { ...this.globalIntakePause };
    }
    /**
     * Toggles Global Intake Pause.
     * When paused = true, stops NEW kiosk sessions immediately, while leaving doctor review,
     * alert routing, and confirmed records running for all existing visits.
     */
    static setGlobalIntakePause(paused, actor, reason, estimatedResumeTime) {
        const previousState = this.globalIntakePause.isPaused;
        this.globalIntakePause = {
            isPaused: paused,
            pausedAt: paused ? new Date().toISOString() : null,
            pausedBy: paused ? actor.id : null,
            actorRole: paused ? actor.role : null,
            reason: paused ? reason : null,
            estimatedResumeTime: paused ? estimatedResumeTime || null : null,
        };
        logger_js_1.logger.warn('[GLOBAL_INTAKE_PAUSE_TOGGLED]', {
            previousState,
            isPaused: paused,
            actorRole: actor.role,
            actorId: actor.id,
            reason,
        });
        // Tamper-evident audit
        dev_fallback_admin_store_js_1.devFallbackAdminStore.appendAuditLog({
            actorType: 'STAFF',
            actorId: actor.id,
            actorRole: actor.role,
            action: paused ? 'GLOBAL_INTAKE_PAUSED' : 'GLOBAL_INTAKE_RESUMED',
            entityType: 'KIOSK_INTAKE_GATE',
            entityId: 'GLOBAL_KIOSK_INTAKE',
            result: 'SUCCESS',
            metadata: {
                previousState,
                isPaused: paused,
                reason,
                estimatedResumeTime,
            },
        });
        return { ...this.globalIntakePause };
    }
}
exports.FeatureFlagsService = FeatureFlagsService;
