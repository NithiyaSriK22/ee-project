import fs from 'fs';
import path from 'path';
import { getDatabase, initSchema } from './database';

export function runSeed(customDbPath?: string): void {
  console.log('--- Initializing Thunai Database and Seeding Data ---');
  const db = getDatabase(customDbPath);

  // 1. Create Tables
  initSchema(db);

  // 2. Read Formulary
  const formularyPath = path.resolve(__dirname, '../../../../seed/formulary.json');
  const formularyData = JSON.parse(fs.readFileSync(formularyPath, 'utf8'));

  const insertDrugStmt = db.prepare(`
    INSERT OR REPLACE INTO formulary (id, generic, brands_json, lasa_partners_json)
    VALUES (?, ?, ?, ?)
  `);

  const insertDrugTx = db.transaction((drugs: any[]) => {
    let idx = 1;
    for (const drug of drugs) {
      insertDrugStmt.run(
        `form-${String(idx++).padStart(3, '0')}`,
        drug.generic.toLowerCase(),
        JSON.stringify(drug.brands || []),
        JSON.stringify(drug.lasaPartners || [])
      );
    }
  });

  insertDrugTx(formularyData.drugs);
  console.log(`✓ Seeded ${formularyData.drugs.length} formulary drugs (Demo Dataset - Not a Clinical Reference)`);

  // 3. Read Scenarios
  const scenariosPath = path.resolve(__dirname, '../../../../seed/scenarios.json');
  const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

  // Prepared Statements for Entities
  const insertPatStmt = db.prepare(`
    INSERT OR REPLACE INTO patients (id, mrn, name, age, gender, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertVisitStmt = db.prepare(`
    INSERT OR REPLACE INTO visits (id, patient_id, status, token_number)
    VALUES (?, ?, ?, ?)
  `);

  const insertAnswerStmt = db.prepare(`
    INSERT OR REPLACE INTO answers (id, visit_id, question_code, option_code, value_text, state, is_critical)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDocStmt = db.prepare(`
    INSERT OR REPLACE INTO documents (id, visit_id, file_path, doc_type, mime_type, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertRawFieldStmt = db.prepare(`
    INSERT OR REPLACE INTO raw_fields (id, document_id, field_type, raw_text, ocr_confidence, bbox_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertValFieldStmt = db.prepare(`
    INSERT OR REPLACE INTO validated_fields (id, raw_field_id, field_type, is_critical, result, matched_value, match_score, reason_code, formulary_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSummaryStmt = db.prepare(`
    INSERT OR REPLACE INTO summaries (id, visit_id, version, mode)
    VALUES (?, ?, ?, ?)
  `);

  const insertStatementStmt = db.prepare(`
    INSERT OR REPLACE INTO summary_statements (id, summary_id, section, text, origin, source_refs_json, flags_json, ord)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAlertStmt = db.prepare(`
    INSERT OR REPLACE INTO alerts (id, visit_id, rule_code, tier, trigger_type, status, kiosk_label)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAuditStmt = db.prepare(`
    INSERT OR REPLACE INTO audit_log (id, actor, action, entity, entity_id, details_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seedScenarioTx = db.transaction(() => {
    for (const scenario of scenariosData.scenarios) {
      // Patient
      insertPatStmt.run(
        scenario.patient.id,
        scenario.patient.mrn,
        scenario.patient.name,
        scenario.patient.age,
        scenario.patient.gender,
        scenario.patient.phone
      );

      // Visit
      insertVisitStmt.run(
        scenario.visit.id,
        scenario.patient.id,
        scenario.visit.status,
        scenario.visit.tokenNumber
      );

      // Answers
      let ansIdx = 1;
      for (const ans of scenario.answers) {
        insertAnswerStmt.run(
          `ans-${scenario.id}-${ansIdx++}`,
          scenario.visit.id,
          ans.questionCode,
          ans.optionCode,
          ans.valueText,
          ans.state,
          ans.isCritical
        );
      }

      // Document
      insertDocStmt.run(
        scenario.document.id,
        scenario.visit.id,
        scenario.document.filePath,
        scenario.document.docType,
        scenario.document.mimeType,
        'OCR_PROCESSED'
      );

      // Raw and Validated OCR Fields from fixtures
      const fixturePath = path.resolve(__dirname, `../../../../seed/ocr-fixtures/${scenario.document.fixtureRef}_ocr.json`);
      if (fs.existsSync(fixturePath)) {
        const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        let valIdx = 1;

        for (const raw of fixture.rawFields) {
          insertRawFieldStmt.run(
            raw.id,
            scenario.document.id,
            raw.fieldType,
            raw.rawText,
            raw.ocrConfidence,
            JSON.stringify(raw.bbox || {})
          );

          // Apply Deterministic Validation Gate Logic for Seeded State
          let result: 'VERIFIED' | 'UNVERIFIED' | 'UNREADABLE' | 'MISMATCH_FLAGGED' = 'UNVERIFIED';
          let matchedValue: string | null = null;
          let matchScore = 0.0;
          let reasonCode: string | null = null;
          const isCritical = raw.fieldType === 'allergy' || raw.fieldType === 'drug_name' ? 1 : 0;

          if (raw.ocrConfidence < 0.30) {
            result = 'UNREADABLE';
            reasonCode = 'LOW_OCR_CONFIDENCE';
          } else if (raw.rawText.includes('Artisan-XR')) {
            result = 'MISMATCH_FLAGGED';
            matchScore = 0.52;
            reasonCode = 'NO_FORMULARY_MATCH';
          } else if (raw.rawText.trim() === 'OD') {
            result = 'UNVERIFIED';
            matchScore = 1.0;
            reasonCode = 'AMBIGUOUS_ABBREVIATION';
          } else if (raw.rawText.includes('None recorded on chart')) {
            // Absence is never negative: missing allergy info on chart is marked UNVERIFIED
            result = 'UNVERIFIED';
            reasonCode = 'NOT_FOUND_ON_DOCUMENT';
          } else if (raw.ocrConfidence >= 0.70) {
            result = 'VERIFIED';
            matchScore = 1.0;
            if (raw.rawText.toLowerCase().includes('paracetamol')) matchedValue = 'paracetamol';
            else if (raw.rawText.toLowerCase().includes('metformin')) matchedValue = 'metformin';
            else if (raw.rawText.toLowerCase().includes('cetirizine')) matchedValue = 'cetirizine';
            else if (raw.rawText.toLowerCase().includes('amlodipine')) matchedValue = 'amlodipine';
            else if (raw.rawText.toLowerCase().includes('aspirin')) matchedValue = 'aspirin';
            else if (raw.rawText.toLowerCase().includes('clopidogrel')) matchedValue = 'clopidogrel';
            else if (raw.fieldType === 'allergy' && raw.rawText.includes('No known drug allergies')) {
              matchedValue = 'NKDA';
            }
          }

          insertValFieldStmt.run(
            `val-${scenario.id}-${valIdx++}`,
            raw.id,
            raw.fieldType,
            isCritical,
            result,
            matchedValue,
            matchScore,
            reasonCode,
            'v1.0-demo'
          );
        }
      }

      // Draft Summary with Section Statements & Origin Labels
      const summaryId = `sum-${scenario.id}`;
      insertSummaryStmt.run(summaryId, scenario.visit.id, 1, 'template');

      let stmtOrd = 1;
      // Chief Complaint
      const reasonAns = scenario.answers.find((a: any) => a.questionCode === 'Q_REASON');
      const durAns = scenario.answers.find((a: any) => a.questionCode === 'Q_DURATION');
      insertStatementStmt.run(
        `stmt-${scenario.id}-${stmtOrd++}`,
        summaryId,
        'CHIEF_COMPLAINT',
        `Presents with ${reasonAns?.optionCode || 'general complaint'} for ${durAns?.optionCode || 'unspecified duration'}.`,
        'AUTO-INSERTED',
        JSON.stringify([`ans-${scenario.id}-1`]),
        JSON.stringify([]),
        stmtOrd
      );

      // Allergies Section
      if (scenario.id === 'scenario-b') {
        insertStatementStmt.run(
          `stmt-${scenario.id}-${stmtOrd++}`,
          summaryId,
          'ALLERGIES',
          'Illegible in original document - verify manually [Smudged prescription line]',
          'AUTO-INSERTED',
          JSON.stringify(['val-scenario-b-5']),
          JSON.stringify(['MUST_RESOLVE']),
          stmtOrd
        );
      } else if (scenario.id === 'scenario-c') {
        insertStatementStmt.run(
          `stmt-${scenario.id}-${stmtOrd++}`,
          summaryId,
          'ALLERGIES',
          'Allergy information not provided on document - verify manually',
          'AUTO-INSERTED',
          JSON.stringify(['val-scenario-c-5']),
          JSON.stringify(['MUST_RESOLVE']),
          stmtOrd
        );
      } else {
        insertStatementStmt.run(
          `stmt-${scenario.id}-${stmtOrd++}`,
          summaryId,
          'ALLERGIES',
          'No known drug allergies (verified in interview and document)',
          'AUTO-INSERTED',
          JSON.stringify([`ans-${scenario.id}-6`, 'val-scenario-a-7']),
          JSON.stringify([]),
          stmtOrd
        );
      }

      // Medications Section
      if (scenario.id === 'scenario-a') {
        insertStatementStmt.run(
          `stmt-${scenario.id}-${stmtOrd++}`,
          summaryId,
          'MEDICATIONS',
          'Current medications from verified prescription: Paracetamol 650mg (1-0-1), Metformin 500mg (1-0-0), Cetirizine 10mg (0-0-1).',
          'AUTO-INSERTED',
          JSON.stringify(['val-scenario-a-1', 'val-scenario-a-3', 'val-scenario-a-5']),
          JSON.stringify([]),
          stmtOrd
        );
      } else if (scenario.id === 'scenario-b') {
        insertStatementStmt.run(
          `stmt-${scenario.id}-${stmtOrd++}`,
          summaryId,
          'MEDICATIONS',
          'Unrecognized medication on prescription: "Artisan-XR 100mg" (Non-formulary - verify manually). Verified: Amlodipine 5mg.',
          'AUTO-INSERTED',
          JSON.stringify(['val-scenario-b-1', 'val-scenario-b-3']),
          JSON.stringify(['MUST_RESOLVE']),
          stmtOrd
        );
      }

      // Alerts
      for (const alert of scenario.alerts) {
        insertAlertStmt.run(
          alert.id,
          scenario.visit.id,
          alert.ruleCode,
          alert.tier,
          alert.triggerType,
          alert.status,
          alert.kioskLabel
        );
      }
    }

    // Audit Log for Seed (Zero Clinical Data)
    insertAuditStmt.run(
      'audit-seed-001',
      'SYSTEM_SEED',
      'SEED_DATABASE',
      'DATABASE',
      'v1.0-demo',
      JSON.stringify({ scenariosSeeded: scenariosData.scenarios.length, formularyCount: formularyData.drugs.length })
    );
  });

  seedScenarioTx();
  console.log(`✓ Seeded ${scenariosData.scenarios.length} synthetic scenarios (A: Routine, B: Unreadable/Unmatched, C: Red Flag)`);
  console.log('✓ Successfully completed database seeding.');
}

// Auto-run if executed directly
if (require.main === module) {
  runSeed();
}
