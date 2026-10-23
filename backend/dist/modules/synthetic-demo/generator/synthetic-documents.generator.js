"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyntheticDocumentGenerator = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prng_js_1 = require("./prng.js");
class SyntheticDocumentGenerator {
    static computeSha256(content) {
        return crypto_1.default.createHash('sha256').update(content, 'utf8').digest('hex');
    }
    /**
     * Generates a synthetic prescription with simulated handwriting/print styles and paired ground-truth JSON.
     */
    static generatePrescription(params) {
        const seed = params.seed || 3001;
        const prng = new prng_js_1.SeededPRNG(seed);
        const patientName = params.patientName || 'Aarav Sharma (SYNTHETIC)';
        const lang = params.language || 'en';
        const isDegraded = params.isDegraded ?? false;
        const docId = `syn_doc_rx_${seed}_${prng.nextInt(1000, 9999)}`;
        const clinicalDate = '2026-10-18';
        const medications = [
            {
                name: 'Paracetamol',
                dosage: '650 mg',
                frequency: '1 tab TID (thrice daily)',
                durationDays: 5,
                rxNormOrSnomedCode: 'DRUG_PARACETAMOL_650MG',
            },
            {
                name: 'Amoxicillin',
                dosage: '500 mg',
                frequency: '1 cap BID (twice daily after food)',
                durationDays: 7,
                rxNormOrSnomedCode: 'DRUG_AMOXICILLIN_500MG',
            },
            {
                name: 'Cetirizine',
                dosage: '10 mg',
                frequency: '1 tab HS (bedtime)',
                durationDays: 3,
                rxNormOrSnomedCode: 'DRUG_CETIRIZINE_10MG',
            },
        ];
        const groundTruth = {
            documentId: docId,
            documentType: 'PRESCRIPTION',
            language: lang,
            isSynthetic: true,
            patientName,
            doctorName: 'Dr. S. K. Ramanathan, MD (Medicine)',
            hospitalName: 'Apollo City Hospital (SYNTHETIC BENCHMARK FIXTURE)',
            clinicalDate,
            medications,
        };
        const styleParams = {
            fontFamily: isDegraded ? 'Brush Script MT, cursive' : 'Helvetica, Arial, sans-serif',
            isHandwrittenLike: isDegraded,
            skewDeg: isDegraded ? prng.nextInt(-6, 6) : 0,
            blurRadiusPx: isDegraded ? 0.8 : 0,
            hasHospitalStamp: true,
            noiseLevelPct: isDegraded ? 18 : 2,
        };
        const renderedHtml = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>Synthetic Prescription - ${docId}</title>
  <style>
    body {
      font-family: ${styleParams.fontFamily};
      transform: rotate(${styleParams.skewDeg}deg);
      filter: blur(${styleParams.blurRadiusPx}px);
      padding: 24px;
      max-width: 650px;
      margin: 0 auto;
      border: 2px dashed #999;
      background: #fafafa;
    }
    .header { border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px; }
    .stamp { display: inline-block; border: 2px solid #0066cc; color: #0066cc; padding: 4px 10px; border-radius: 4px; font-weight: bold; }
    .med-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .med-table th, .med-table td { border-bottom: 1px solid #ccc; padding: 8px; text-align: left; }
    .disclaimer { font-size: 11px; color: #d32f2f; margin-top: 24px; font-weight: bold; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${groundTruth.hospitalName}</h2>
    <p><strong>Physician:</strong> ${groundTruth.doctorName}</p>
    <p><strong>Patient:</strong> ${groundTruth.patientName} | <strong>Date:</strong> ${clinicalDate}</p>
    <div class="stamp">HOSPITAL RX SEAL - VERIFIED</div>
  </div>
  <h3>Rx (Prescription)</h3>
  <table class="med-table">
    <thead>
      <tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
    </thead>
    <tbody>
      ${medications
            .map((m) => `<tr><td><strong>${m.name}</strong></td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.durationDays} days</td></tr>`)
            .join('\n')}
    </tbody>
  </table>
  <div class="disclaimer">
    SYNTHETIC FIXTURE — FOR SYSTEM VALIDATION AND PIPELINE TESTING ONLY — NOT REAL CLINICAL ADVICE
  </div>
</body>
</html>
`.trim();
        const checksumSha256 = this.computeSha256(renderedHtml);
        return {
            id: docId,
            groundTruth,
            renderedHtml,
            styleParams,
            checksumSha256,
        };
    }
    /**
     * Generates a synthetic lab report with numeric values, reference ranges, and abnormal flags.
     */
    static generateLabReport(params) {
        const seed = params.seed || 4001;
        const prng = new prng_js_1.SeededPRNG(seed);
        const patientName = params.patientName || 'Priya Sundaram (SYNTHETIC)';
        const hasAbnormal = params.hasAbnormalValues ?? true;
        const docId = `syn_doc_lab_${seed}_${prng.nextInt(1000, 9999)}`;
        const clinicalDate = '2026-10-19';
        const labResults = [
            {
                testName: 'Hemoglobin (Hb)',
                numericValue: hasAbnormal ? 9.8 : 13.5,
                unit: 'g/dL',
                referenceRange: '12.0 - 15.5',
                flag: hasAbnormal ? 'LOW' : 'NORMAL',
            },
            {
                testName: 'Fasting Blood Glucose',
                numericValue: hasAbnormal ? 168 : 92,
                unit: 'mg/dL',
                referenceRange: '70 - 100',
                flag: hasAbnormal ? 'HIGH' : 'NORMAL',
            },
            {
                testName: 'Serum Creatinine',
                numericValue: 0.9,
                unit: 'mg/dL',
                referenceRange: '0.6 - 1.2',
                flag: 'NORMAL',
            },
            {
                testName: 'Platelet Count',
                numericValue: 240000,
                unit: '/mcL',
                referenceRange: '150,000 - 450,000',
                flag: 'NORMAL',
            },
        ];
        const groundTruth = {
            documentId: docId,
            documentType: 'LAB_REPORT',
            language: 'en',
            isSynthetic: true,
            patientName,
            doctorName: 'Dr. Ananya Roy, Pathologist',
            hospitalName: 'Apollo Diagnostics Laboratory (SYNTHETIC BENCHMARK FIXTURE)',
            clinicalDate,
            labResults,
        };
        const styleParams = {
            fontFamily: 'Courier New, monospace',
            isHandwrittenLike: false,
            skewDeg: 0,
            blurRadiusPx: 0,
            hasHospitalStamp: true,
            noiseLevelPct: 1,
        };
        const renderedHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Synthetic Laboratory Report - ${docId}</title>
  <style>
    body { font-family: ${styleParams.fontFamily}; padding: 24px; max-width: 650px; margin: 0 auto; border: 1px solid #444; background: #fff; }
    .header { border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 12px; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { border-bottom: 1px solid #eee; padding: 6px; font-size: 13px; text-align: left; }
    .flag-high { color: #b71c1c; font-weight: bold; }
    .flag-low { color: #e65100; font-weight: bold; }
    .disclaimer { font-size: 11px; color: #b71c1c; margin-top: 20px; text-align: center; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h3>${groundTruth.hospitalName}</h3>
    <p>Patient: ${groundTruth.patientName} | Date: ${clinicalDate} | Ref: ${docId}</p>
  </div>
  <h4>Biochemistry & Hematology Investigation</h4>
  <table class="table">
    <thead>
      <tr><th>Test Name</th><th>Result</th><th>Unit</th><th>Reference</th><th>Flag</th></tr>
    </thead>
    <tbody>
      ${labResults
            .map((r) => `
        <tr>
          <td>${r.testName}</td>
          <td><strong>${r.numericValue}</strong></td>
          <td>${r.unit}</td>
          <td>${r.referenceRange}</td>
          <td class="${r.flag === 'HIGH' ? 'flag-high' : r.flag === 'LOW' ? 'flag-low' : ''}">${r.flag}</td>
        </tr>`)
            .join('\n')}
    </tbody>
  </table>
  <div class="disclaimer">
    SYNTHETIC LABORATORY TEST FIXTURE — FOR CODE VALIDATION ONLY — NOT CLINICAL EVIDENCE
  </div>
</body>
</html>
`.trim();
        const checksumSha256 = this.computeSha256(renderedHtml);
        return {
            id: docId,
            groundTruth,
            renderedHtml,
            styleParams,
            checksumSha256,
        };
    }
}
exports.SyntheticDocumentGenerator = SyntheticDocumentGenerator;
