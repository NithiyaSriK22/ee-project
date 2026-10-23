"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaultInjectionService = void 0;
const feature_flags_service_js_1 = require("../../deployment/feature-flags.service.js");
const logger_js_1 = require("../../../config/logger.js");
class FaultInjectionService {
    static rules = new Map([
        [
            'OCR',
            {
                targetService: 'OCR',
                failureType: 'LATENCY',
                latencyMs: 1500,
                failureRatePct: 0,
                active: false,
            },
        ],
        [
            'SUMMARIZER',
            {
                targetService: 'SUMMARIZER',
                failureType: 'ERROR_500',
                failureRatePct: 0,
                active: false,
            },
        ],
        [
            'VOICE_STT',
            {
                targetService: 'VOICE_STT',
                failureType: 'TIMEOUT',
                latencyMs: 5000,
                failureRatePct: 0,
                active: false,
            },
        ],
        [
            'HOSPITAL_ADAPTER',
            {
                targetService: 'HOSPITAL_ADAPTER',
                failureType: 'ERROR_500',
                failureRatePct: 0,
                active: false,
            },
        ],
    ]);
    /**
     * Updates a fault injection rule.
     */
    static setRule(rule) {
        this.rules.set(rule.targetService, rule);
        logger_js_1.logger.warn('[FAULT_INJECTION_RULE_UPDATED]', {
            targetService: rule.targetService,
            failureType: rule.failureType,
            failureRatePct: rule.failureRatePct,
            active: rule.active,
        });
    }
    /**
     * Retrieves all fault injection rules.
     */
    static getRules() {
        return Array.from(this.rules.values());
    }
    /**
     * Resets all rules to inactive.
     */
    static resetAll() {
        for (const rule of this.rules.values()) {
            rule.active = false;
            rule.failureRatePct = 0;
        }
    }
    /**
     * Evaluates if a fault should be injected for a target service.
     * If yes, executes delay or throws error.
     */
    static async maybeInjectFault(targetService) {
        const isGlobalEnabled = feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('FAULT_INJECTION_ENABLED');
        if (!isGlobalEnabled)
            return;
        const rule = this.rules.get(targetService);
        if (!rule || !rule.active)
            return;
        const randomRoll = Math.random() * 100;
        if (randomRoll >= rule.failureRatePct)
            return;
        logger_js_1.logger.warn(`[FAULT_INJECTED] Target: ${targetService}, Type: ${rule.failureType}`);
        if (rule.failureType === 'LATENCY' && rule.latencyMs) {
            await new Promise((resolve) => setTimeout(resolve, rule.latencyMs));
        }
        else if (rule.failureType === 'TIMEOUT') {
            const waitTime = rule.latencyMs || 4000;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            throw new Error(`Injected simulated partner service timeout after ${waitTime}ms`);
        }
        else if (rule.failureType === 'ERROR_500') {
            throw new Error(`Injected simulated 500 error from upstream partner: ${targetService}`);
        }
    }
}
exports.FaultInjectionService = FaultInjectionService;
