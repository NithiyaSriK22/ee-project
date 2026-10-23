import { CanonicalEventName } from './visit.types.js';

export interface EventContract {
  eventName: CanonicalEventName;
  version: string;
  producer: string;
  consumers: string[];
  description: string;
  requiredFields: string[];
}

export const CANONICAL_EVENT_CATALOG: Record<CanonicalEventName, EventContract> = {
  VISIT_CREATED: {
    eventName: 'VISIT_CREATED',
    version: '1.0.0',
    producer: 'Module 2A (Visit Lifecycle)',
    consumers: ['Module 9 (Audit & Analytics)', 'Module 2A (Orchestrator)'],
    description: 'Emitted when a new patient visit entity is instantiated at kiosk or desk',
    requiredFields: ['visitId', 'patientId', 'departmentId', 'tokenNumber'],
  },
  VISIT_CHECKED_IN: {
    eventName: 'VISIT_CHECKED_IN',
    version: '1.0.0',
    producer: 'Module 2A (Visit Lifecycle)',
    consumers: ['Module 9 (Audit & Analytics)', 'Module 2A (Orchestrator)', 'Module 7 (Doctor Queue)'],
    description: 'Emitted when a visit is checked in at the department queue',
    requiredFields: ['visitId', 'patientId'],
  },
  INTERVIEW_ANSWER_RECORDED: {
    eventName: 'INTERVIEW_ANSWER_RECORDED',
    version: '1.0.0',
    producer: 'Module 3 (Guided Interview)',
    consumers: ['Module 2A (Orchestrator)', 'Module 6 (Red-Flag Engine)', 'Module 9 (Analytics)'],
    description: 'Emitted when a patient submits or updates an answer to an interview question',
    requiredFields: ['visitId', 'questionId', 'answerId'],
  },
  INTERVIEW_COMPLETED: {
    eventName: 'INTERVIEW_COMPLETED',
    version: '1.0.0',
    producer: 'Module 3 (Guided Interview)',
    consumers: ['Module 2A (Orchestrator)', 'Module 5 (Summarization)', 'Module 9 (Audit)'],
    description: 'Emitted when the patient reaches the end of the guided interview questionnaire',
    requiredFields: ['visitId', 'templateId'],
  },
  DOCUMENT_UPLOADED: {
    eventName: 'DOCUMENT_UPLOADED',
    version: '1.0.0',
    producer: 'Module 4 (Document Capture)',
    consumers: ['Module 4 (OCR Queue)', 'Module 9 (Audit)'],
    description: 'Emitted when a prescription or lab document image is captured and uploaded',
    requiredFields: ['visitId', 'documentId'],
  },
  DOCUMENT_VALIDATED: {
    eventName: 'DOCUMENT_VALIDATED',
    version: '1.0.0',
    producer: 'Module 4 (Validation Gate)',
    consumers: ['Module 2A (Orchestrator)', 'Module 6 (Red-Flag Engine)', 'Module 9 (Analytics)'],
    description: 'Emitted when OCR fields complete deterministic validation gate checks',
    requiredFields: ['visitId', 'documentId', 'validationResult'],
  },
  SUMMARY_REQUESTED: {
    eventName: 'SUMMARY_REQUESTED',
    version: '1.0.0',
    producer: 'Module 2A (Orchestrator)',
    consumers: ['Module 5 (AI Summarizer)', 'Module 9 (Audit)'],
    description: 'Triggered by orchestrator when interview completes and documents validate',
    requiredFields: ['visitId'],
  },
  SUMMARY_GENERATED: {
    eventName: 'SUMMARY_GENERATED',
    version: '1.0.0',
    producer: 'Module 5 (AI Summarizer)',
    consumers: ['Module 7 (Doctor Review)', 'Module 9 (Audit & Analytics)'],
    description: 'Emitted when a grounded or template clinical summary draft is ready',
    requiredFields: ['visitId', 'summaryId', 'version'],
  },
  SUMMARY_FAILED: {
    eventName: 'SUMMARY_FAILED',
    version: '1.0.0',
    producer: 'Module 5 (AI Summarizer)',
    consumers: ['Module 7 (Doctor Review Fallback)', 'Module 9 (Monitoring)'],
    description: 'Emitted when LLM summarization fails and falls back to raw data view',
    requiredFields: ['visitId', 'error'],
  },
  ALERT_RAISED: {
    eventName: 'ALERT_RAISED',
    version: '1.0.0',
    producer: 'Module 6 (Red-Flag Engine)',
    consumers: ['Module 6 (Staff Triage Stream)', 'Module 7 (Doctor Workspace)', 'Module 9 (Audit)'],
    description: 'Emitted when deterministic rules detect a red-flag condition or emergency help',
    requiredFields: ['visitId', 'alertId', 'severity'],
  },
  ALERT_ACKNOWLEDGED: {
    eventName: 'ALERT_ACKNOWLEDGED',
    version: '1.0.0',
    producer: 'Module 6 (Triage Staff)',
    consumers: ['Module 9 (Audit & Analytics)'],
    description: 'Emitted when duty staff acknowledge a red-flag alert card',
    requiredFields: ['visitId', 'alertId', 'staffId'],
  },
  REVIEW_STARTED: {
    eventName: 'REVIEW_STARTED',
    version: '1.0.0',
    producer: 'Module 7 (Doctor Review)',
    consumers: ['Module 2A (Orchestrator)', 'Module 9 (Audit)'],
    description: 'Emitted when an attending physician opens a visit in the consultation workspace',
    requiredFields: ['visitId', 'reviewId', 'doctorId'],
  },
  RECORD_CONFIRMED: {
    eventName: 'RECORD_CONFIRMED',
    version: '1.0.0',
    producer: 'Module 7 (Doctor Review)',
    consumers: ['Module 2A (Orchestrator)', 'Module 9 (Audit & Legal Records)', 'Module 7A (Export)'],
    description: 'Emitted when the doctor confirms the signed medical case note with legal attestation',
    requiredFields: ['visitId', 'recordId', 'version', 'doctorId'],
  },
  VISIT_COMPLETED: {
    eventName: 'VISIT_COMPLETED',
    version: '1.0.0',
    producer: 'Module 2A (Orchestrator)',
    consumers: ['Module 9 (Audit & Analytics)'],
    description: 'Emitted when a visit reaches the final COMPLETED state',
    requiredFields: ['visitId'],
  },
  VISIT_EXPIRED: {
    eventName: 'VISIT_EXPIRED',
    version: '1.0.0',
    producer: 'Module 2A (Visit Lifecycle)',
    consumers: ['Module 9 (Audit & Analytics)'],
    description: 'Emitted when an uncompleted visit passes its expiration timestamp',
    requiredFields: ['visitId', 'reason'],
  },
};
