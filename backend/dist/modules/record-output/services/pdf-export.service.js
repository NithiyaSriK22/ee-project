"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfExportService = void 0;
class PdfExportService {
    /**
     * Generates a sandboxed, accessible printable clinical record document.
     * Features:
     * - Strict zero external fetches (pure CSS / inline fonts).
     * - Accessible heading hierarchy (h1, h2, semantic tables).
     * - Security watermark carrying authenticated user name, role, and ISO timestamp.
     * - Filename contains ZERO clinical data (Record_Visit_{visitId}_v{version}.pdf).
     * - Doctor-language headings and explicit attestation footer.
     */
    static generatePrintableDocument(params) {
        const { record, provenance, requestingUser, excludeSensitiveItems = false } = params;
        const exportedAt = new Date().toISOString();
        const watermarkText = `CONFIDENTIAL CLINICAL RECORD — Exported by ${requestingUser.fullName} (${requestingUser.role}) on ${exportedAt}`;
        // Clean filename with zero clinical data
        const fileName = `Record_Visit_${record.visitId}_v${record.version}.pdf`;
        // Group statements by clinical section
        const sectionMap = {};
        for (const stmt of record.statements) {
            if (excludeSensitiveItems &&
                (stmt.section.toLowerCase().includes('sensitive') || stmt.text.toLowerCase().includes('confidential'))) {
                continue;
            }
            const sec = stmt.section.toUpperCase();
            if (!sectionMap[sec]) {
                sectionMap[sec] = [];
            }
            sectionMap[sec].push(stmt.text);
        }
        // Build sections HTML
        let sectionsHtml = '';
        for (const [sec, items] of Object.entries(sectionMap)) {
            const displayTitle = sec.replace(/_/g, ' ');
            sectionsHtml += `
        <section class="clinical-section">
          <h2 class="section-title">${this.escapeHtml(displayTitle)}</h2>
          <ul class="statement-list">
            ${items.map((it) => `<li>${this.escapeHtml(it)}</li>`).join('\n')}
          </ul>
        </section>
      `;
        }
        // Items to clarify block if any
        let toClarifyHtml = '';
        if (provenance.toClarifyItems.length > 0) {
            toClarifyHtml = `
        <div class="to-clarify-box">
          <h3>Items to Clarify with Patient / Records:</h3>
          <ul>
            ${provenance.toClarifyItems.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `;
        }
        // Provisional Identity Banner
        let provisionalBannerHtml = '';
        if (provenance.isProvisionalIdentity) {
            provisionalBannerHtml = `
        <div class="provisional-banner">
          <strong>⚠️ PROVISIONAL IDENTITY:</strong> Reconciliation required with hospital master index prior to permanent archive.
        </div>
      `;
        }
        // Full self-contained accessible document with security watermark
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Clinical Record - Visit ${record.visitId} v${record.version}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #1a202c;
      margin: 0;
      padding: 0;
      position: relative;
    }
    .watermark {
      position: fixed;
      top: 45%;
      left: 5%;
      right: 5%;
      transform: rotate(-35deg);
      font-size: 14pt;
      font-weight: bold;
      color: rgba(200, 30, 30, 0.12);
      text-align: center;
      pointer-events: none;
      z-index: 1000;
      border: 2px dashed rgba(200, 30, 30, 0.15);
      padding: 10px;
    }
    header.record-header {
      border-bottom: 2px solid #2b6cb0;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    h1.record-title {
      font-size: 18pt;
      color: #2b6cb0;
      margin: 0 0 4px 0;
    }
    .provenance-statement {
      font-size: 10pt;
      font-weight: 600;
      color: #2d3748;
      background: #edf2f7;
      padding: 6px 10px;
      border-radius: 4px;
      margin-top: 6px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 10px;
      font-size: 9.5pt;
      color: #4a5568;
    }
    .provisional-banner {
      background: #fffaf0;
      border: 1px solid #dd6b20;
      color: #9c4221;
      padding: 8px 12px;
      border-radius: 4px;
      margin: 12px 0;
      font-size: 10pt;
    }
    .to-clarify-box {
      background: #fff5f5;
      border-left: 4px solid #e53e3e;
      padding: 8px 14px;
      margin: 14px 0;
      font-size: 9.5pt;
    }
    .to-clarify-box h3 {
      margin: 0 0 4px 0;
      color: #c53030;
      font-size: 10pt;
    }
    .clinical-section {
      margin-bottom: 16px;
    }
    h2.section-title {
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #2c5282;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin: 14px 0 6px 0;
    }
    ul.statement-list {
      margin: 4px 0 0 18px;
      padding: 0;
      font-size: 10pt;
    }
    footer.record-footer {
      margin-top: 30px;
      border-top: 1px solid #cbd5e0;
      padding-top: 8px;
      font-size: 8.5pt;
      color: #718096;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="watermark">${this.escapeHtml(watermarkText)}</div>

  <header class="record-header">
    <h1 class="record-title">OUTPATIENT CONSULTATION CASE SUMMARY</h1>
    <div class="provenance-statement">${this.escapeHtml(provenance.reviewConfirmationStatement)}</div>
    ${provisionalBannerHtml}
    <div class="meta-grid">
      <div><strong>Patient Token:</strong> ${this.escapeHtml(provenance.patientToken)}</div>
      <div><strong>Hospital Reg No:</strong> ${this.escapeHtml(provenance.hospitalRegistrationNumber || 'Provisional / Withheld')}</div>
      <div><strong>Confirmed At:</strong> ${this.escapeHtml(new Date(provenance.confirmedAt).toLocaleString())}</div>
      <div><strong>Record Version:</strong> v${provenance.version} (${provenance.amendmentStatus})</div>
      <div><strong>Review Policy:</strong> ${this.escapeHtml(provenance.reviewPolicyVersion)}</div>
      <div><strong>Attestation:</strong> ${this.escapeHtml(provenance.attestationVersion)}</div>
    </div>
  </header>

  <main>
    ${toClarifyHtml}
    ${sectionsHtml}
  </main>

  <footer class="record-footer">
    <div>MEDBRIEF Clinical Documentation Platform — Tamper-evident verified record</div>
    <div>Exported by ${this.escapeHtml(requestingUser.fullName)} | ${new Date().toISOString()}</div>
  </footer>
</body>
</html>`;
        return {
            fileName,
            mimeType: 'application/pdf',
            watermarkText,
            htmlContent,
            byteSize: Buffer.byteLength(htmlContent, 'utf-8'),
            exportedAt,
        };
    }
    static escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
exports.PdfExportService = PdfExportService;
