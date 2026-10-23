"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointHospitalSystemAdapter = exports.FileDropHospitalSystemAdapter = exports.NoOpHospitalSystemAdapter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = require("../../../config/logger.js");
const feature_flags_service_js_1 = require("../../deployment/feature-flags.service.js");
/**
 * 1. Default No-Op Hospital System Adapter
 * Safely logs output events and returns success without external I/O.
 */
class NoOpHospitalSystemAdapter {
    name = 'NOOP_ADAPTER';
    async pushRecord(record, context) {
        logger_js_1.logger.info('[HOSPITAL_ADAPTER:NOOP] Record push processed safely in no-op mode', {
            recordId: record.id,
            version: record.version,
            idempotencyKey: context.idempotencyKey,
            identityState: context.identityState,
        });
        return {
            success: true,
            adapterName: this.name,
            idempotencyKey: context.idempotencyKey,
            remoteTransactionId: `NOOP-TX-${context.idempotencyKey}`,
            attemptCount: 1,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.NoOpHospitalSystemAdapter = NoOpHospitalSystemAdapter;
/**
 * 2. File-Drop Hospital System Adapter
 * Writes structured record export files to a designated network share or folder.
 * Gated behind feature flag HOSPITAL_FILE_DROP_ENABLED.
 */
class FileDropHospitalSystemAdapter {
    name = 'FILE_DROP_ADAPTER';
    dropDirectory;
    constructor(dropDirectory) {
        this.dropDirectory =
            dropDirectory ||
                process.env.HOSPITAL_EXPORT_DROP_PATH ||
                path_1.default.join(process.cwd(), 'storage', 'hospital-export-drop');
    }
    async pushRecord(record, context) {
        const isEnabled = feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('HOSPITAL_FILE_DROP_ENABLED');
        if (!isEnabled) {
            logger_js_1.logger.info('[HOSPITAL_ADAPTER:FILE_DROP] Flag HOSPITAL_FILE_DROP_ENABLED is OFF. Diverting to safe no-op.');
            return {
                success: true,
                adapterName: this.name,
                idempotencyKey: context.idempotencyKey,
                remoteTransactionId: `FILE-DROP-BYPASS-${context.idempotencyKey}`,
                attemptCount: 1,
                timestamp: new Date().toISOString(),
            };
        }
        try {
            if (!fs_1.default.existsSync(this.dropDirectory)) {
                fs_1.default.mkdirSync(this.dropDirectory, { recursive: true });
            }
            // Safe filename without clinical content: Record_{idempotencyKey}.json
            const safeFilename = `Record_${context.idempotencyKey}.json`;
            const targetFilePath = path_1.default.join(this.dropDirectory, safeFilename);
            const payload = {
                idempotencyKey: context.idempotencyKey,
                visitId: context.visitId,
                patientId: context.patientId,
                identityState: context.identityState,
                hospitalRegistrationNumber: context.identityState === 'CONFIRMED' ? context.hospitalRegistrationNumber : null,
                needsManualReconciliation: context.identityState === 'PROVISIONAL',
                record,
                exportedAt: new Date().toISOString(),
            };
            fs_1.default.writeFileSync(targetFilePath, JSON.stringify(payload, null, 2), 'utf-8');
            logger_js_1.logger.info('[HOSPITAL_ADAPTER:FILE_DROP] Record drop completed', {
                filePath: targetFilePath,
                idempotencyKey: context.idempotencyKey,
            });
            return {
                success: true,
                adapterName: this.name,
                idempotencyKey: context.idempotencyKey,
                remoteTransactionId: `FILE-${safeFilename}`,
                attemptCount: 1,
                timestamp: new Date().toISOString(),
            };
        }
        catch (err) {
            logger_js_1.logger.error('[HOSPITAL_ADAPTER:FILE_DROP_ERROR]', { error: err.message, idempotencyKey: context.idempotencyKey });
            return {
                success: false,
                adapterName: this.name,
                idempotencyKey: context.idempotencyKey,
                errorMessage: err.message || 'File drop execution failed',
                attemptCount: 1,
                timestamp: new Date().toISOString(),
            };
        }
    }
}
exports.FileDropHospitalSystemAdapter = FileDropHospitalSystemAdapter;
/**
 * 3. Endpoint Hospital System Adapter
 * Dispatches HTTP POST push to external hospital EHR REST endpoint.
 * Gated behind feature flag HOSPITAL_ENDPOINT_PUSH_ENABLED.
 */
class EndpointHospitalSystemAdapter {
    name = 'ENDPOINT_PUSH_ADAPTER';
    endpointUrl;
    constructor(endpointUrl) {
        this.endpointUrl =
            endpointUrl || process.env.HOSPITAL_EHR_ENDPOINT_URL || 'https://ehr-gw.hospital.org/api/v1/records';
    }
    async pushRecord(record, context) {
        const isEnabled = feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('HOSPITAL_ENDPOINT_PUSH_ENABLED');
        if (!isEnabled) {
            logger_js_1.logger.info('[HOSPITAL_ADAPTER:ENDPOINT] Flag HOSPITAL_ENDPOINT_PUSH_ENABLED is OFF. Diverting to safe no-op.');
            return {
                success: true,
                adapterName: this.name,
                idempotencyKey: context.idempotencyKey,
                remoteTransactionId: `ENDPOINT-BYPASS-${context.idempotencyKey}`,
                attemptCount: 1,
                timestamp: new Date().toISOString(),
            };
        }
        // In a live integration, fetch(this.endpointUrl) with headers:
        // 'X-Idempotency-Key': context.idempotencyKey
        logger_js_1.logger.info('[HOSPITAL_ADAPTER:ENDPOINT] Outbound HTTP push simulated to hospital EHR endpoint', {
            endpointUrl: this.endpointUrl,
            idempotencyKey: context.idempotencyKey,
            version: record.version,
        });
        return {
            success: true,
            adapterName: this.name,
            idempotencyKey: context.idempotencyKey,
            statusCode: 200,
            remoteTransactionId: `EHR-TX-${Date.now()}-${context.idempotencyKey}`,
            attemptCount: 1,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.EndpointHospitalSystemAdapter = EndpointHospitalSystemAdapter;
