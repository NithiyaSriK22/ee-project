import { Router, Request, Response, NextFunction } from 'express';
import { runReset } from '../db/reset';
import { getDatabase } from '../db/database';
import { AppError } from '../middleware/error-handler';

export const demoRouter = Router();

demoRouter.get('/demo/about', (req: Request, res: Response) => {
  res.json({
    product: 'Thunai (துணை)',
    tagline: 'The companion before the doctor.',
    purpose: 'AI-assisted patient case-taking platform for busy government hospital OPDs.',
    principles: [
      '1. AI/OCR never decides what is true. Deterministic validation gate determines trust.',
      '2. Uncertain values are never passed to LLMs. Code inserts explicit placeholders.',
      '3. Absence is never a negative. Missing allergy info is "Not provided", never "No allergies".',
      '4. Every summary statement shows source link and origin label (AUTO-INSERTED, AI-PHRASED, PATIENT QUOTE, DOCTOR-EDITED).',
      '5. The doctor decides. Server enforces confirmation gate. Nothing is auto-confirmed.',
      '6. Red-flag alerts point human to pattern. Unanswered critical questions produce STAFF_CHECK.',
      '7. Honest labelling: permanent demo banner, built vs mocked panel, zero invented statistics.',
      '8. Synthetic data only. Zero real patient data.',
    ],
    builtVsMocked: {
      built: [
        'Kiosk structured intake interview (8 questions, Tamil + English support)',
        'Deterministic validation gate with formulary fuzzy matcher & LASA margin protection',
        'Pre-computed cached OCR pipeline with confidence scoring and bounding boxes',
        'Doctor review workspace with unbypassable must-resolve confirmation gate',
        'Immutable confirmed record persistence with SQLite update/delete trigger protection',
        'Three-state red-flag emergency alert triage (IMMEDIATE, STAFF_CHECK, MANUAL)',
        'Full synthetic seed data: 42-drug formulary + 3 multi-stage scenarios',
      ],
      mockedOrRoadmapOnly: [
        'Live voice/audio intake (Roadmap)',
        'Hospital EMR/HIS bidirectional sync (Roadmap)',
        'Offline client-side SQLite sync (Roadmap)',
        'Production OCR training calibration on real hospital handwritten slips (Roadmap)',
        'Multi-hospital tenant federation (Roadmap)',
      ],
    },
    datasetNotice: 'Demo dataset - not a clinical reference. All patients, records, and prescriptions are synthetic.',
  });
});

demoRouter.get('/demo/scenarios', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const visits = db.prepare(`
      SELECT v.id as visit_id, v.status, v.token_number,
             p.id as patient_id, p.mrn, p.name as patient_name, p.age, p.gender,
             d.id as doc_id, d.file_path,
             (SELECT COUNT(*) FROM alerts WHERE visit_id = v.id AND status = 'ACTIVE') as active_alerts
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN documents d ON d.visit_id = v.id
      ORDER BY v.id ASC
    `).all();

    res.json({
      scenarios: visits,
      activeCount: visits.length,
    });
  } catch (err) {
    next(err);
  }
});

demoRouter.post('/demo/reset', (req: Request, res: Response, next: NextFunction) => {
  try {
    runReset();
    res.json({
      success: true,
      message: 'Thunai database has been wiped and reset to initial seed state.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

demoRouter.post('/demo/scenario/:name', (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.params.name.toLowerCase();
    const db = getDatabase();

    let visitId = 'vis-demo-001';
    if (name === 'b' || name === 'scenario-b' || name.includes('unreadable')) {
      visitId = 'vis-demo-002';
    } else if (name === 'c' || name === 'scenario-c' || name.includes('red-flag')) {
      visitId = 'vis-demo-003';
    } else if (name !== 'a' && name !== 'scenario-a' && !name.includes('routine')) {
      throw new AppError(404, 'SCENARIO_NOT_FOUND', `Scenario '${req.params.name}' not found. Use 'a', 'b', or 'c'.`);
    }

    const visit = db.prepare(`
      SELECT v.*, p.name as patient_name, p.mrn, p.age, p.gender
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE v.id = ?
    `).get(visitId);

    res.json({
      success: true,
      scenario: req.params.name,
      visit,
    });
  } catch (err) {
    next(err);
  }
});
