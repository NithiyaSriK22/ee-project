"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KioskFleetSimulator = void 0;
const production_guard_service_js_1 = require("../guards/production-guard.service.js");
const synthetic_patient_generator_js_1 = require("../generator/synthetic-patient.generator.js");
const logger_js_1 = require("../../../config/logger.js");
class KioskFleetSimulator {
    /**
     * Simulates a virtual fleet of concurrent kiosks conducting patient intakes.
     */
    static async simulateFleet(config) {
        production_guard_service_js_1.ProductionGuardService.assertSyntheticPermitted();
        const startTime = Date.now();
        const durations = [];
        let completed = 0;
        let errors = 0;
        const totalSessions = config.kioskCount * config.sessionsPerKiosk;
        logger_js_1.logger.info(`[FLEET_SIMULATION_START] Kiosks: ${config.kioskCount}, Sessions: ${totalSessions}, Concurrency: ${config.concurrencyLevel}`);
        // Generate batch of synthetic patients
        const cohort = synthetic_patient_generator_js_1.SyntheticPatientGenerator.generateCohort(totalSessions, 8000);
        // Simulate concurrent batches
        for (let i = 0; i < totalSessions; i += config.concurrencyLevel) {
            const batch = cohort.slice(i, i + config.concurrencyLevel);
            const batchPromises = batch.map(async ({ visit }) => {
                const sessionStart = Date.now();
                try {
                    // Simulate intake steps duration
                    const jitter = Math.random() * 20;
                    const simulatedLatency = (config.injectLatencyMs || 50) + jitter;
                    await new Promise((resolve) => setTimeout(resolve, simulatedLatency));
                    // Check if artificial failure should be triggered
                    if (config.failureRatePct > 0 && Math.random() * 100 < config.failureRatePct) {
                        throw new Error(`Simulated kiosk hardware/network fault on ${visit.tokenNumber}`);
                    }
                    durations.push(Date.now() - sessionStart);
                    completed++;
                }
                catch {
                    durations.push(Date.now() - sessionStart);
                    errors++;
                }
            });
            await Promise.all(batchPromises);
        }
        // Compute metrics
        durations.sort((a, b) => a - b);
        const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
        const p95Idx = Math.floor(durations.length * 0.95);
        const p95Duration = durations[p95Idx] || avgDuration;
        const elapsedMs = Date.now() - startTime;
        logger_js_1.logger.info(`[FLEET_SIMULATION_COMPLETE] Completed: ${completed}, Errors: ${errors}, Elapsed: ${elapsedMs}ms, Avg: ${avgDuration.toFixed(1)}ms, p95: ${p95Duration.toFixed(1)}ms`);
        return {
            totalSessionsInitiated: totalSessions,
            totalSessionsCompleted: completed,
            totalErrorsEncountered: errors,
            averageSessionDurationMs: Math.round(avgDuration),
            p95SessionDurationMs: Math.round(p95Duration),
            activeConcurrentKiosks: config.kioskCount,
            syntheticOnlyEnforced: true,
        };
    }
}
exports.KioskFleetSimulator = KioskFleetSimulator;
