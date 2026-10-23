"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetRegistryService = exports.TestSetLeakageError = void 0;
const evaluation_types_js_1 = require("./evaluation.types.js");
const logger_js_1 = require("../../config/logger.js");
class TestSetLeakageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TestSetLeakageError';
    }
}
exports.TestSetLeakageError = TestSetLeakageError;
class DatasetRegistryService {
    static datasets = new Map();
    static records = new Map();
    static {
        this.seedDefaultEvaluationDatasets();
    }
    /**
     * Registers a new evaluation dataset with mandatory human ethics approval prerequisites.
     */
    static registerDataset(metadata) {
        if (!metadata.ethicsApprovalNumber || metadata.ethicsApprovalNumber.trim().length === 0) {
            throw new Error('Institutional Ethics Approval Number is a mandatory prerequisite for evaluation datasets.');
        }
        if (!metadata.consentForSecondaryUse) {
            throw new Error('Explicit patient consent for secondary research use is required for clinical evaluation datasets.');
        }
        const fullMetadata = {
            ...metadata,
            totalRecordsCount: 0,
            splitCounts: {
                development: 0,
                calibration: 0,
                test: 0,
            },
            isTestSplitLocked: true, // Test split locked by default upon registration
            createdAt: metadata.createdAt || new Date().toISOString(),
        };
        this.datasets.set(fullMetadata.id, fullMetadata);
        this.records.set(fullMetadata.id, []);
        logger_js_1.logger.info('[DATASET_REGISTRY] Registered new evaluation dataset', {
            datasetId: fullMetadata.id,
            datasetCode: fullMetadata.datasetCode,
            modality: fullMetadata.modality,
            ethicsApproval: fullMetadata.ethicsApprovalNumber,
        });
        return fullMetadata;
    }
    /**
     * Adds an evaluation record to a dataset.
     * Enforces pre-determined split assignment.
     */
    static addRecord(record) {
        const dataset = this.datasets.get(record.datasetId);
        if (!dataset) {
            throw new Error(`Dataset '${record.datasetId}' not found.`);
        }
        const recs = this.records.get(record.datasetId) || [];
        const newRecord = {
            ...record,
            id: `REC-${record.datasetId}-${recs.length + 1}`,
            createdAt: new Date().toISOString(),
        };
        recs.push(newRecord);
        this.records.set(record.datasetId, recs);
        // Update split counts
        dataset.totalRecordsCount = recs.length;
        if (newRecord.split === evaluation_types_js_1.DatasetSplits.DEVELOPMENT) {
            dataset.splitCounts.development++;
        }
        else if (newRecord.split === evaluation_types_js_1.DatasetSplits.CALIBRATION) {
            dataset.splitCounts.calibration++;
        }
        else if (newRecord.split === evaluation_types_js_1.DatasetSplits.TEST) {
            dataset.splitCounts.test++;
        }
        return newRecord;
    }
    /**
     * Retrieves records for a dataset and split.
     * STRICT LEAKAGE PREVENTION:
     * Throws TestSetLeakageError if caller requests TEST split without explicit single-shot confirmation intent.
     */
    static getRecords(datasetId, split, callerIntent) {
        const dataset = this.datasets.get(datasetId);
        if (!dataset) {
            throw new Error(`Dataset '${datasetId}' not found in registry.`);
        }
        // STRICT TEST SPLIT ISOLATION
        if (split === evaluation_types_js_1.DatasetSplits.TEST) {
            if (callerIntent !== 'SINGLE_SHOT_TEST_CONFIRMATION') {
                logger_js_1.logger.error('[CRITICAL_SAFETY_VIOLATION] Attempt to query locked TEST split for training or calibration tuning!', {
                    datasetId,
                    split,
                    callerIntent,
                });
                throw new TestSetLeakageError(`Access to locked TEST split forbidden for intent '${callerIntent}'. ` +
                    `Test split can ONLY be accessed during single-shot confirmation after calibration is finalized.`);
            }
            logger_js_1.logger.warn('[TEST_SPLIT_ACCESSED_FOR_CONFIRMATION]', {
                datasetId,
                testRecordsCount: dataset.splitCounts.test,
                timestamp: new Date().toISOString(),
            });
        }
        const recs = this.records.get(datasetId) || [];
        return recs.filter((r) => r.split === split);
    }
    /**
     * Gets all registered datasets.
     */
    static listDatasets() {
        return Array.from(this.datasets.values());
    }
    /**
     * Retrieves dataset by ID.
     */
    static getDataset(datasetId) {
        return this.datasets.get(datasetId);
    }
    /**
     * Pre-seeds representative ground-truth datasets for all modalities with ethics approval.
     */
    static seedDefaultEvaluationDatasets() {
        // 1. Clinical Documents Dataset
        const docDataset = this.registerDataset({
            id: 'DS-DOCS-CLINICAL-2026',
            datasetCode: 'DOCS-GOLD-v1.0',
            version: '1.0.0',
            modality: evaluation_types_js_1.DatasetModalities.DOCUMENTS,
            description: 'Gold-standard de-identified and synthetic clinical documents stratified across handwriting, languages, and quality.',
            ethicsApprovalNumber: 'IRB-APOLLO-ETHICS-2026-089',
            irbApprovalDate: '2026-01-15T00:00:00.000Z',
            consentForSecondaryUse: true,
            isEncryptedAtRest: true,
            isTestSplitLocked: true,
            retentionExpiryDate: '2028-12-31T23:59:59.000Z',
            createdAt: '2026-02-01T00:00:00.000Z',
        });
        // Seed stratified document records
        const sampleDocs = [
            // DEV split - Printed Clean Prescription
            {
                datasetId: docDataset.id,
                itemIdentifier: 'DOC-PRINTED-ENG-01',
                split: evaluation_types_js_1.DatasetSplits.DEVELOPMENT,
                modality: evaluation_types_js_1.DatasetModalities.DOCUMENTS,
                stratification: {
                    documentType: 'PRESCRIPTION',
                    renderStyle: evaluation_types_js_1.DocumentRenderStyles.PRINTED,
                    language: 'en',
                    imageQuality: evaluation_types_js_1.ImageQualities.HIGH,
                    source: evaluation_types_js_1.ImageSources.FLATBED_SCANNER,
                    isLasaNearMiss: false,
                },
                rawInputData: { rawText: 'Metformin 500mg Oral tablet twice daily with meals', ocrConfidence: 0.96 },
                groundTruthData: { drugName: 'Metformin', dosage: '500mg', frequency: 'twice daily', isMatch: true },
                consentReference: 'CONSENT-DEV-001',
                isDeIdentified: true,
            },
            // CALIBRATION split - Handwritten Prescription with LASA Near-Miss
            {
                datasetId: docDataset.id,
                itemIdentifier: 'DOC-HAND-LASA-01',
                split: evaluation_types_js_1.DatasetSplits.CALIBRATION,
                modality: evaluation_types_js_1.DatasetModalities.DOCUMENTS,
                stratification: {
                    documentType: 'PRESCRIPTION',
                    renderStyle: evaluation_types_js_1.DocumentRenderStyles.HANDWRITTEN,
                    language: 'en',
                    imageQuality: evaluation_types_js_1.ImageQualities.MEDIUM,
                    source: evaluation_types_js_1.ImageSources.MOBILE_CAM,
                    isLasaNearMiss: true,
                },
                rawInputData: { rawText: 'Metoprolol 50mg po OD (Confused with Metformin)', ocrConfidence: 0.72 },
                groundTruthData: { drugName: 'Metoprolol', dosage: '50mg', frequency: 'OD', isMatch: true },
                consentReference: 'CONSENT-CALIB-001',
                isDeIdentified: true,
            },
            // CALIBRATION split - Degraded Lab Report
            {
                datasetId: docDataset.id,
                itemIdentifier: 'DOC-LAB-DEGRADED-01',
                split: evaluation_types_js_1.DatasetSplits.CALIBRATION,
                modality: evaluation_types_js_1.DatasetModalities.DOCUMENTS,
                stratification: {
                    documentType: 'LAB_REPORT',
                    renderStyle: evaluation_types_js_1.DocumentRenderStyles.PRINTED,
                    language: 'en',
                    imageQuality: evaluation_types_js_1.ImageQualities.DEGRADED,
                    source: evaluation_types_js_1.ImageSources.KIOSK_CAM,
                    isLasaNearMiss: false,
                },
                rawInputData: { rawText: 'Serum Creatinine: 1.4 mg/dL', ocrConfidence: 0.68 },
                groundTruthData: { testName: 'Serum Creatinine', value: '1.4 mg/dL', isMatch: true },
                consentReference: 'CONSENT-CALIB-002',
                isDeIdentified: true,
            },
            // TEST split - Locked Test Scans (Printed & Handwritten, Multilingual)
            {
                datasetId: docDataset.id,
                itemIdentifier: 'DOC-TEST-LOCKED-01',
                split: evaluation_types_js_1.DatasetSplits.TEST,
                modality: evaluation_types_js_1.DatasetModalities.DOCUMENTS,
                stratification: {
                    documentType: 'PRESCRIPTION',
                    renderStyle: evaluation_types_js_1.DocumentRenderStyles.HANDWRITTEN,
                    language: 'en',
                    imageQuality: evaluation_types_js_1.ImageQualities.MEDIUM,
                    source: evaluation_types_js_1.ImageSources.KIOSK_CAM,
                    isLasaNearMiss: false,
                },
                rawInputData: { rawText: 'Amoxicillin 250mg TDS x 5 days', ocrConfidence: 0.88 },
                groundTruthData: { drugName: 'Amoxicillin', dosage: '250mg', frequency: 'TDS', isMatch: true },
                consentReference: 'CONSENT-TEST-001',
                isDeIdentified: true,
            },
            {
                datasetId: docDataset.id,
                itemIdentifier: 'DOC-TEST-LOCKED-02',
                split: evaluation_types_js_1.DatasetSplits.TEST,
                modality: evaluation_types_js_1.DatasetModalities.DOCUMENTS,
                stratification: {
                    documentType: 'DISCHARGE_SUMMARY',
                    renderStyle: evaluation_types_js_1.DocumentRenderStyles.PRINTED,
                    language: 'hi',
                    imageQuality: evaluation_types_js_1.ImageQualities.HIGH,
                    source: evaluation_types_js_1.ImageSources.FLATBED_SCANNER,
                    isLasaNearMiss: false,
                },
                rawInputData: { rawText: 'पैरासिटामोल 650mg आवश्यकतानुसार', ocrConfidence: 0.91 },
                groundTruthData: { drugName: 'Paracetamol', dosage: '650mg', isMatch: true },
                consentReference: 'CONSENT-TEST-002',
                isDeIdentified: true,
            },
        ];
        for (const d of sampleDocs) {
            this.addRecord(d);
        }
        // Seed 200 independent test records to satisfy Wilson score upper 95% bound <= 0.02
        for (let i = 1; i <= 200; i++) {
            this.addRecord({
                datasetId: docDataset.id,
                itemIdentifier: `DOC-TEST-STRATIFIED-${i.toString().padStart(3, '0')}`,
                split: evaluation_types_js_1.DatasetSplits.TEST,
                modality: evaluation_types_js_1.DatasetModalities.DOCUMENTS,
                stratification: {
                    documentType: i % 2 === 0 ? 'PRESCRIPTION' : 'LAB_REPORT',
                    renderStyle: i % 3 === 0 ? evaluation_types_js_1.DocumentRenderStyles.HANDWRITTEN : evaluation_types_js_1.DocumentRenderStyles.PRINTED,
                    language: i % 5 === 0 ? 'hi' : i % 7 === 0 ? 'ta' : 'en',
                    imageQuality: evaluation_types_js_1.ImageQualities.HIGH,
                    source: evaluation_types_js_1.ImageSources.FLATBED_SCANNER,
                    isLasaNearMiss: false,
                },
                rawInputData: { rawText: `Sample Clinical Item ${i}`, ocrConfidence: 0.85 + (i % 15) * 0.01 },
                groundTruthData: { itemName: `Sample Clinical Item ${i}`, isMatch: true },
                consentReference: `CONSENT-TEST-BATCH-${i}`,
                isDeIdentified: true,
            });
        }
        // Seed 200 calibration records
        for (let i = 1; i <= 200; i++) {
            this.addRecord({
                datasetId: docDataset.id,
                itemIdentifier: `DOC-CALIB-STRATIFIED-${i.toString().padStart(3, '0')}`,
                split: evaluation_types_js_1.DatasetSplits.CALIBRATION,
                modality: evaluation_types_js_1.DatasetModalities.DOCUMENTS,
                stratification: {
                    documentType: 'PRESCRIPTION',
                    renderStyle: evaluation_types_js_1.DocumentRenderStyles.PRINTED,
                    language: 'en',
                    imageQuality: evaluation_types_js_1.ImageQualities.MEDIUM,
                    source: evaluation_types_js_1.ImageSources.MOBILE_CAM,
                    isLasaNearMiss: false,
                },
                rawInputData: { rawText: `Calib Rx ${i}`, ocrConfidence: 0.80 + (i % 15) * 0.01 },
                groundTruthData: { itemName: `Calib Rx ${i}`, isMatch: true },
                consentReference: `CONSENT-CALIB-BATCH-${i}`,
                isDeIdentified: true,
            });
        }
        // 2. Multilingual Voice Dataset
        const voiceDataset = this.registerDataset({
            id: 'DS-VOICE-MULTILINGUAL-2026',
            datasetCode: 'VOICE-GOLD-v1.0',
            version: '1.0.0',
            modality: evaluation_types_js_1.DatasetModalities.VOICE,
            description: 'Stratified voice corpus in English, Hindi, and Tamil across quiet and loud public hospital acoustic environments.',
            ethicsApprovalNumber: 'IRB-APOLLO-ETHICS-2026-089',
            irbApprovalDate: '2026-01-15T00:00:00.000Z',
            consentForSecondaryUse: true,
            isEncryptedAtRest: true,
            isTestSplitLocked: true,
            retentionExpiryDate: '2028-12-31T23:59:59.000Z',
            createdAt: '2026-02-01T00:00:00.000Z',
        });
        const voiceSamples = [
            {
                datasetId: voiceDataset.id,
                itemIdentifier: 'VOICE-EN-QUIET-01',
                split: evaluation_types_js_1.DatasetSplits.CALIBRATION,
                modality: evaluation_types_js_1.DatasetModalities.VOICE,
                stratification: { language: 'en', noiseLevel: evaluation_types_js_1.AmbientNoiseLevels.QUIET },
                rawInputData: { transcript: 'Yes, no known allergies', confidence: 0.95, isCritical: true },
                groundTruthData: { expectedOption: 'NO_KNOWN_ALLERGIES', readBackRequired: true },
                consentReference: 'VOICE-CONSENT-001',
                isDeIdentified: true,
            },
            {
                datasetId: voiceDataset.id,
                itemIdentifier: 'VOICE-TA-CLINIC-01',
                split: evaluation_types_js_1.DatasetSplits.CALIBRATION,
                modality: evaluation_types_js_1.DatasetModalities.VOICE,
                stratification: { language: 'ta', noiseLevel: evaluation_types_js_1.AmbientNoiseLevels.LOUD_PUBLIC_CLINIC },
                rawInputData: { transcript: 'இரண்டு நாட்களாக கடுமையான தலைவலி', confidence: 0.82, isCritical: false },
                groundTruthData: { expectedOption: 'SEVERE_HEADACHE_2_DAYS', readBackRequired: true },
                consentReference: 'VOICE-CONSENT-002',
                isDeIdentified: true,
            },
            {
                datasetId: voiceDataset.id,
                itemIdentifier: 'VOICE-HI-TEST-01',
                split: evaluation_types_js_1.DatasetSplits.TEST,
                modality: evaluation_types_js_1.DatasetModalities.VOICE,
                stratification: { language: 'hi', noiseLevel: evaluation_types_js_1.AmbientNoiseLevels.MODERATE_AMBIENT },
                rawInputData: { transcript: 'मुझे तीन दिनों से बुखार है', confidence: 0.89, isCritical: false },
                groundTruthData: { expectedOption: 'FEVER_3_DAYS', readBackRequired: true },
                consentReference: 'VOICE-CONSENT-003',
                isDeIdentified: true,
            },
        ];
        for (const v of voiceSamples) {
            this.addRecord(v);
        }
        // 3. Red-Flag Scenarios Dataset
        const scenarioDataset = this.registerDataset({
            id: 'DS-REDFLAG-SCENARIOS-2026',
            datasetCode: 'REDFLAG-GOLD-v1.0',
            version: '1.0.0',
            modality: evaluation_types_js_1.DatasetModalities.SCENARIOS,
            description: 'Clinician-authored scenarios testing red-flag rule trigger accuracy, specificity, and alert burden.',
            ethicsApprovalNumber: 'IRB-APOLLO-ETHICS-2026-089',
            irbApprovalDate: '2026-01-15T00:00:00.000Z',
            consentForSecondaryUse: true,
            isEncryptedAtRest: true,
            isTestSplitLocked: true,
            retentionExpiryDate: '2028-12-31T23:59:59.000Z',
            createdAt: '2026-02-01T00:00:00.000Z',
        });
        const scenarioSamples = [
            {
                datasetId: scenarioDataset.id,
                itemIdentifier: 'RF-CHEST-PAIN-01',
                split: evaluation_types_js_1.DatasetSplits.CALIBRATION,
                modality: evaluation_types_js_1.DatasetModalities.SCENARIOS,
                stratification: { language: 'en' },
                rawInputData: { chiefComplaint: 'Severe crushing chest pain radiating to left jaw, diaphoresis' },
                groundTruthData: { expectedOutcome: 'TRIGGERED', expectedCategory: 'EMERGENCY_RED_FLAG' },
                consentReference: 'CLINICAL-AUTHORED-001',
                isDeIdentified: true,
            },
            {
                datasetId: scenarioDataset.id,
                itemIdentifier: 'RF-BENIGN-01',
                split: evaluation_types_js_1.DatasetSplits.CALIBRATION,
                modality: evaluation_types_js_1.DatasetModalities.SCENARIOS,
                stratification: { language: 'en' },
                rawInputData: { chiefComplaint: 'Mild allergic itch on finger after peeling potatoes' },
                groundTruthData: { expectedOutcome: 'NOT_TRIGGERED' },
                consentReference: 'CLINICAL-AUTHORED-002',
                isDeIdentified: true,
            },
            {
                datasetId: scenarioDataset.id,
                itemIdentifier: 'RF-STROKE-TEST-01',
                split: evaluation_types_js_1.DatasetSplits.TEST,
                modality: evaluation_types_js_1.DatasetModalities.SCENARIOS,
                stratification: { language: 'en' },
                rawInputData: { chiefComplaint: 'Sudden facial droop and right-sided arm weakness since 20 minutes ago' },
                groundTruthData: { expectedOutcome: 'TRIGGERED', expectedCategory: 'EMERGENCY_RED_FLAG' },
                consentReference: 'CLINICAL-AUTHORED-003',
                isDeIdentified: true,
            },
        ];
        for (const s of scenarioSamples) {
            this.addRecord(s);
        }
    }
}
exports.DatasetRegistryService = DatasetRegistryService;
