"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyntheticDemoController = void 0;
const response_util_js_1 = require("../../utils/response.util.js");
const demo_mode_service_js_1 = require("./demo/demo-mode.service.js");
const about_demo_registry_js_1 = require("./demo/about-demo.registry.js");
const demo_reset_service_js_1 = require("./demo/demo-reset.service.js");
const scenario_definitions_js_1 = require("./simulation/scenarios/scenario-definitions.js");
const scenario_runner_js_1 = require("./simulation/scenarios/scenario-runner.js");
const kiosk_fleet_simulator_js_1 = require("./simulation/kiosk-fleet-simulator.js");
const fault_injection_service_js_1 = require("./simulation/fault-injection.service.js");
const synthetic_patient_generator_js_1 = require("./generator/synthetic-patient.generator.js");
const synthetic_documents_generator_js_1 = require("./generator/synthetic-documents.generator.js");
const consistency_audit_service_js_1 = require("./consistency-audit/consistency-audit.service.js");
const production_guard_service_js_1 = require("./guards/production-guard.service.js");
class SyntheticDemoController {
    // ==========================================
    // DEMO MODE & HONEST LABELS
    // ==========================================
    static getDemoStatus(_req, res) {
        const status = demo_mode_service_js_1.DemoModeService.getState();
        response_util_js_1.ResponseUtil.success(res, status, 'Demo mode status retrieved');
    }
    static getAboutDemoRegistry(_req, res) {
        const registry = about_demo_registry_js_1.AboutDemoService.getAboutDemoRegistry();
        response_util_js_1.ResponseUtil.success(res, registry, 'About this demo registry retrieved');
    }
    static async resetDemoSandbox(_req, res, next) {
        try {
            const result = await demo_reset_service_js_1.DemoResetService.resetDemoSandbox();
            response_util_js_1.ResponseUtil.success(res, result, 'Demo sandbox reset to clean baseline state');
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // SCENARIO LIBRARY & SIMULATION
    // ==========================================
    static getScenarios(_req, res) {
        const scenarios = scenario_definitions_js_1.ScenarioDefinitionService.getAllScenarios();
        response_util_js_1.ResponseUtil.success(res, scenarios, 'Scenario library retrieved');
    }
    static async runScenario(req, res, next) {
        try {
            const scenarioId = req.params.scenarioId;
            demo_mode_service_js_1.DemoModeService.setActiveScenario(scenarioId);
            const result = await scenario_runner_js_1.ScenarioRunner.runScenario(scenarioId);
            response_util_js_1.ResponseUtil.success(res, result, `Scenario '${scenarioId}' executed successfully`);
        }
        catch (err) {
            next(err);
        }
    }
    static async runAllScenarios(_req, res, next) {
        try {
            const results = await scenario_runner_js_1.ScenarioRunner.runAllScenarios();
            response_util_js_1.ResponseUtil.success(res, results, 'All 12 smoke scenarios executed successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async simulateFleet(req, res, next) {
        try {
            const config = {
                kioskCount: Number(req.body.kioskCount || 5),
                sessionsPerKiosk: Number(req.body.sessionsPerKiosk || 2),
                concurrencyLevel: Number(req.body.concurrencyLevel || 3),
                failureRatePct: Number(req.body.failureRatePct || 0),
                injectLatencyMs: Number(req.body.injectLatencyMs || 20),
            };
            const metrics = await kiosk_fleet_simulator_js_1.KioskFleetSimulator.simulateFleet(config);
            response_util_js_1.ResponseUtil.success(res, metrics, 'Kiosk fleet simulation executed');
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // SYNTHETIC GENERATORS
    // ==========================================
    static generatePatient(req, res, next) {
        try {
            production_guard_service_js_1.ProductionGuardService.assertSyntheticPermitted();
            const seed = req.body.seed ? Number(req.body.seed) : Math.floor(Math.random() * 10000);
            const persona = req.body.persona || 'normal_adult';
            const patient = synthetic_patient_generator_js_1.SyntheticPatientGenerator.generatePatient(seed, persona);
            const visit = synthetic_patient_generator_js_1.SyntheticPatientGenerator.generateVisit(patient, seed + 1000);
            response_util_js_1.ResponseUtil.success(res, { patient, visit }, 'Synthetic patient generated');
        }
        catch (err) {
            next(err);
        }
    }
    static generateDocument(req, res, next) {
        try {
            production_guard_service_js_1.ProductionGuardService.assertSyntheticPermitted();
            const type = req.body.type || 'PRESCRIPTION';
            const seed = req.body.seed ? Number(req.body.seed) : Math.floor(Math.random() * 10000);
            const isDegraded = Boolean(req.body.isDegraded);
            const doc = type === 'LAB_REPORT'
                ? synthetic_documents_generator_js_1.SyntheticDocumentGenerator.generateLabReport({ seed })
                : synthetic_documents_generator_js_1.SyntheticDocumentGenerator.generatePrescription({ seed, isDegraded });
            response_util_js_1.ResponseUtil.success(res, doc, 'Synthetic document and ground truth generated');
        }
        catch (err) {
            next(err);
        }
    }
    // ==========================================
    // FAULT INJECTION
    // ==========================================
    static getFaultInjectionRules(_req, res) {
        const rules = fault_injection_service_js_1.FaultInjectionService.getRules();
        response_util_js_1.ResponseUtil.success(res, rules, 'Fault injection rules retrieved');
    }
    static setFaultInjectionRule(req, res) {
        fault_injection_service_js_1.FaultInjectionService.setRule(req.body);
        response_util_js_1.ResponseUtil.success(res, req.body, 'Fault injection rule updated');
    }
    // ==========================================
    // CROSS-MODULE CONSISTENCY AUDIT
    // ==========================================
    static async runConsistencyAudit(_req, res, next) {
        try {
            const report = await consistency_audit_service_js_1.ConsistencyAuditService.runFullAudit();
            response_util_js_1.ResponseUtil.success(res, report, 'Cross-module consistency audit completed');
        }
        catch (err) {
            next(err);
        }
    }
    static async getConsistencyAuditMarkdown(_req, res, next) {
        try {
            const report = await consistency_audit_service_js_1.ConsistencyAuditService.runFullAudit();
            const markdown = consistency_audit_service_js_1.ConsistencyAuditService.generateMarkdownReport(report);
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.status(200).send(markdown);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.SyntheticDemoController = SyntheticDemoController;
