import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../../utils/response.util.js';
import { AppRequest } from '../../types/api.types.js';
import { DemoModeService } from './demo/demo-mode.service.js';
import { AboutDemoService } from './demo/about-demo.registry.js';
import { DemoResetService } from './demo/demo-reset.service.js';
import { ScenarioDefinitionService } from './simulation/scenarios/scenario-definitions.js';
import { ScenarioRunner } from './simulation/scenarios/scenario-runner.js';
import { KioskFleetSimulator } from './simulation/kiosk-fleet-simulator.js';
import { FaultInjectionService } from './simulation/fault-injection.service.js';
import { SyntheticPatientGenerator } from './generator/synthetic-patient.generator.js';
import { SyntheticDocumentGenerator } from './generator/synthetic-documents.generator.js';
import { ConsistencyAuditService } from './consistency-audit/consistency-audit.service.js';
import { ProductionGuardService } from './guards/production-guard.service.js';
import { ScenarioId, PersonaType } from './synthetic-demo.types.js';

export class SyntheticDemoController {
  // ==========================================
  // DEMO MODE & HONEST LABELS
  // ==========================================

  public static getDemoStatus(_req: Request, res: Response): void {
    const status = DemoModeService.getState();
    ResponseUtil.success(res, status, 'Demo mode status retrieved');
  }

  public static getAboutDemoRegistry(_req: Request, res: Response): void {
    const registry = AboutDemoService.getAboutDemoRegistry();
    ResponseUtil.success(res, registry, 'About this demo registry retrieved');
  }

  public static async resetDemoSandbox(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await DemoResetService.resetDemoSandbox();
      ResponseUtil.success(res, result, 'Demo sandbox reset to clean baseline state');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // SCENARIO LIBRARY & SIMULATION
  // ==========================================

  public static getScenarios(_req: Request, res: Response): void {
    const scenarios = ScenarioDefinitionService.getAllScenarios();
    ResponseUtil.success(res, scenarios, 'Scenario library retrieved');
  }

  public static async runScenario(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const scenarioId = req.params.scenarioId as ScenarioId;
      DemoModeService.setActiveScenario(scenarioId);
      const result = await ScenarioRunner.runScenario(scenarioId);
      ResponseUtil.success(res, result, `Scenario '${scenarioId}' executed successfully`);
    } catch (err) {
      next(err);
    }
  }

  public static async runAllScenarios(_req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await ScenarioRunner.runAllScenarios();
      ResponseUtil.success(res, results, 'All 12 smoke scenarios executed successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async simulateFleet(req: AppRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = {
        kioskCount: Number(req.body.kioskCount || 5),
        sessionsPerKiosk: Number(req.body.sessionsPerKiosk || 2),
        concurrencyLevel: Number(req.body.concurrencyLevel || 3),
        failureRatePct: Number(req.body.failureRatePct || 0),
        injectLatencyMs: Number(req.body.injectLatencyMs || 20),
      };
      const metrics = await KioskFleetSimulator.simulateFleet(config);
      ResponseUtil.success(res, metrics, 'Kiosk fleet simulation executed');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // SYNTHETIC GENERATORS
  // ==========================================

  public static generatePatient(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ProductionGuardService.assertSyntheticPermitted();
      const seed = req.body.seed ? Number(req.body.seed) : Math.floor(Math.random() * 10000);
      const persona = (req.body.persona as PersonaType) || 'normal_adult';

      const patient = SyntheticPatientGenerator.generatePatient(seed, persona);
      const visit = SyntheticPatientGenerator.generateVisit(patient, seed + 1000);

      ResponseUtil.success(res, { patient, visit }, 'Synthetic patient generated');
    } catch (err) {
      next(err);
    }
  }

  public static generateDocument(req: AppRequest, res: Response, next: NextFunction): void {
    try {
      ProductionGuardService.assertSyntheticPermitted();
      const type = req.body.type || 'PRESCRIPTION';
      const seed = req.body.seed ? Number(req.body.seed) : Math.floor(Math.random() * 10000);
      const isDegraded = Boolean(req.body.isDegraded);

      const doc =
        type === 'LAB_REPORT'
          ? SyntheticDocumentGenerator.generateLabReport({ seed })
          : SyntheticDocumentGenerator.generatePrescription({ seed, isDegraded });

      ResponseUtil.success(res, doc, 'Synthetic document and ground truth generated');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // FAULT INJECTION
  // ==========================================

  public static getFaultInjectionRules(_req: Request, res: Response): void {
    const rules = FaultInjectionService.getRules();
    ResponseUtil.success(res, rules, 'Fault injection rules retrieved');
  }

  public static setFaultInjectionRule(req: AppRequest, res: Response): void {
    FaultInjectionService.setRule(req.body);
    ResponseUtil.success(res, req.body, 'Fault injection rule updated');
  }

  // ==========================================
  // CROSS-MODULE CONSISTENCY AUDIT
  // ==========================================

  public static async runConsistencyAudit(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await ConsistencyAuditService.runFullAudit();
      ResponseUtil.success(res, report, 'Cross-module consistency audit completed');
    } catch (err) {
      next(err);
    }
  }

  public static async getConsistencyAuditMarkdown(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await ConsistencyAuditService.runFullAudit();
      const markdown = ConsistencyAuditService.generateMarkdownReport(report);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.status(200).send(markdown);
    } catch (err) {
      next(err);
    }
  }
}
