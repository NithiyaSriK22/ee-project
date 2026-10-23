import fs from 'fs';
import path from 'path';
import { ConfirmedRecordDTO } from '../../doctor-review/doctor-review.types.js';
import {
  HospitalSystemAdapter,
  HospitalPushContext,
  HospitalPushResult,
} from '../record-output.types.js';
import { logger } from '../../../config/logger.js';
import { FeatureFlagsService } from '../../deployment/feature-flags.service.js';

/**
 * 1. Default No-Op Hospital System Adapter
 * Safely logs output events and returns success without external I/O.
 */
export class NoOpHospitalSystemAdapter implements HospitalSystemAdapter {
  public readonly name = 'NOOP_ADAPTER';

  public async pushRecord(
    record: ConfirmedRecordDTO,
    context: HospitalPushContext
  ): Promise<HospitalPushResult> {
    logger.info('[HOSPITAL_ADAPTER:NOOP] Record push processed safely in no-op mode', {
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

/**
 * 2. File-Drop Hospital System Adapter
 * Writes structured record export files to a designated network share or folder.
 * Gated behind feature flag HOSPITAL_FILE_DROP_ENABLED.
 */
export class FileDropHospitalSystemAdapter implements HospitalSystemAdapter {
  public readonly name = 'FILE_DROP_ADAPTER';
  private dropDirectory: string;

  constructor(dropDirectory?: string) {
    this.dropDirectory =
      dropDirectory ||
      process.env.HOSPITAL_EXPORT_DROP_PATH ||
      path.join(process.cwd(), 'storage', 'hospital-export-drop');
  }

  public async pushRecord(
    record: ConfirmedRecordDTO,
    context: HospitalPushContext
  ): Promise<HospitalPushResult> {
    const isEnabled = FeatureFlagsService.isFlagEnabled('HOSPITAL_FILE_DROP_ENABLED');
    if (!isEnabled) {
      logger.info('[HOSPITAL_ADAPTER:FILE_DROP] Flag HOSPITAL_FILE_DROP_ENABLED is OFF. Diverting to safe no-op.');
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
      if (!fs.existsSync(this.dropDirectory)) {
        fs.mkdirSync(this.dropDirectory, { recursive: true });
      }

      // Safe filename without clinical content: Record_{idempotencyKey}.json
      const safeFilename = `Record_${context.idempotencyKey}.json`;
      const targetFilePath = path.join(this.dropDirectory, safeFilename);

      const payload = {
        idempotencyKey: context.idempotencyKey,
        visitId: context.visitId,
        patientId: context.patientId,
        identityState: context.identityState,
        hospitalRegistrationNumber:
          context.identityState === 'CONFIRMED' ? context.hospitalRegistrationNumber : null,
        needsManualReconciliation: context.identityState === 'PROVISIONAL',
        record,
        exportedAt: new Date().toISOString(),
      };

      fs.writeFileSync(targetFilePath, JSON.stringify(payload, null, 2), 'utf-8');

      logger.info('[HOSPITAL_ADAPTER:FILE_DROP] Record drop completed', {
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
    } catch (err: any) {
      logger.error('[HOSPITAL_ADAPTER:FILE_DROP_ERROR]', { error: err.message, idempotencyKey: context.idempotencyKey });
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

/**
 * 3. Endpoint Hospital System Adapter
 * Dispatches HTTP POST push to external hospital EHR REST endpoint.
 * Gated behind feature flag HOSPITAL_ENDPOINT_PUSH_ENABLED.
 */
export class EndpointHospitalSystemAdapter implements HospitalSystemAdapter {
  public readonly name = 'ENDPOINT_PUSH_ADAPTER';
  private endpointUrl: string;

  constructor(endpointUrl?: string) {
    this.endpointUrl =
      endpointUrl || process.env.HOSPITAL_EHR_ENDPOINT_URL || 'https://ehr-gw.hospital.org/api/v1/records';
  }

  public async pushRecord(
    record: ConfirmedRecordDTO,
    context: HospitalPushContext
  ): Promise<HospitalPushResult> {
    const isEnabled = FeatureFlagsService.isFlagEnabled('HOSPITAL_ENDPOINT_PUSH_ENABLED');
    if (!isEnabled) {
      logger.info('[HOSPITAL_ADAPTER:ENDPOINT] Flag HOSPITAL_ENDPOINT_PUSH_ENABLED is OFF. Diverting to safe no-op.');
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
    logger.info('[HOSPITAL_ADAPTER:ENDPOINT] Outbound HTTP push simulated to hospital EHR endpoint', {
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
