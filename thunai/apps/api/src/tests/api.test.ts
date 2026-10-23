import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { getDatabase } from '../db/database';
import { runSeed } from '../db/seed';
import { VALIDATION_THRESHOLDS } from '../config/validation-gate.config';

describe('Thunai D1 Foundation & Seed Verification', () => {
  const app = createApp();

  beforeAll(() => {
    runSeed();
  });

  it('GET /api/health should return HEALTHY status and service info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.body.service).toBe('thunai-api');
    expect(res.body.flags.demoMode).toBe(true);
  });

  it('GET /api/demo/about should return non-negotiable principles and built vs mocked', async () => {
    const res = await request(app).get('/api/demo/about');
    expect(res.status).toBe(200);
    expect(res.body.product).toContain('Thunai');
    expect(res.body.tagline).toBe('The companion before the doctor.');
    expect(res.body.principles).toHaveLength(8);
    expect(res.body.builtVsMocked.built.length).toBeGreaterThan(0);
    expect(res.body.builtVsMocked.mockedOrRoadmapOnly.length).toBeGreaterThan(0);
  });

  it('GET /api/demo/scenarios should return 3 synthetic seeded scenarios', async () => {
    const res = await request(app).get('/api/demo/scenarios');
    expect(res.status).toBe(200);
    expect(res.body.scenarios).toHaveLength(3);
    const names = res.body.scenarios.map((s: any) => s.patient_name);
    expect(names).toContain('Ramesh Kumar'); // Scenario A
    expect(names).toContain('Meena Sundaram'); // Scenario B
    expect(names).toContain('Arumugam Pillai'); // Scenario C
  });

  it('POST /api/demo/reset should reset database cleanly', async () => {
    const res = await request(app).post('/api/demo/reset');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Formulary table should contain 40+ drugs with LASA pairs', () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM formulary').all();
    expect(rows.length).toBeGreaterThanOrEqual(40);

    const metformin = db.prepare('SELECT * FROM formulary WHERE generic = ?').get('metformin') as any;
    expect(metformin).toBeDefined();
    const lasa = JSON.parse(metformin.lasa_partners_json);
    expect(lasa).toContain('metoprolol');
  });

  it('Validation gate thresholds match non-negotiable spec', () => {
    expect(VALIDATION_THRESHOLDS.OCR_MIN_USABLE).toBe(0.30);
    expect(VALIDATION_THRESHOLDS.OCR_MIN_VERIFIED).toBe(0.70);
    expect(VALIDATION_THRESHOLDS.MATCH_VERIFIED).toBe(0.85);
    expect(VALIDATION_THRESHOLDS.MATCH_FLOOR).toBe(0.60);
    expect(VALIDATION_THRESHOLDS.LASA_MARGIN).toBe(0.10);
  });

  it('confirmed_records must be IMMUTABLE (update and delete blocked by SQLite triggers)', () => {
    const db = getDatabase();
    // Insert a test confirmed record
    db.prepare(`
      INSERT OR REPLACE INTO confirmed_records (id, visit_id, version, doctor_id, confirmed_at, content_json)
      VALUES (?, ?, ?, ?, datetime('now'), ?)
    `).run('rec-test-001', 'vis-demo-001', 1, 'dr-001', JSON.stringify({ summary: 'Immutable record content' }));

    // Attempt UPDATE -> should throw
    expect(() => {
      db.prepare(`UPDATE confirmed_records SET content_json = ? WHERE id = ?`).run('{"tampered": true}', 'rec-test-001');
    }).toThrow(/IMMUTABLE_RECORD/);

    // Attempt DELETE -> should throw
    expect(() => {
      db.prepare(`DELETE FROM confirmed_records WHERE id = ?`).run('rec-test-001');
    }).toThrow(/IMMUTABLE_RECORD/);
  });
});
