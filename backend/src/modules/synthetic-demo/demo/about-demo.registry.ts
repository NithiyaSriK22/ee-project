import { AboutDemoRegistry, ComponentDisclosure } from '../synthetic-demo.types.js';

export const COMPONENT_DISCLOSURES: ComponentDisclosure[] = [
  {
    componentName: 'Intake State Machine & Deterministic Gating',
    module: 'Module 2A / 3',
    status: 'REAL',
    description: 'Fully implemented state machine enforcing check-in, identity resolution, step transitions, and pause/resume.',
    clinicalProductionReadiness: 'Production Ready: Comprehensive transition constraints and error envelopes implemented.',
  },
  {
    componentName: 'Clinical Safety & Red-Flag Alert Rules Engine',
    module: 'Module 6',
    status: 'REAL',
    description: 'Fully implemented deterministic alert rule evaluator with physician approval tracking, stat paging, and audit logging.',
    clinicalProductionReadiness: 'Production Ready: Two-physician change governance enforced.',
  },
  {
    componentName: 'Doctor Review Workspace & Provenance Ledger',
    module: 'Module 7',
    status: 'REAL',
    description: 'Production-grade doctor dashboard with mandatory item resolution, edit diff tracking, and versioned confirmed records.',
    clinicalProductionReadiness: 'Production Ready: Full Section 33 clinical workflow operational.',
  },
  {
    componentName: 'Record Output, EHR Copy Blocks & FHIR R4 Mapper',
    module: 'Module 7A',
    status: 'REAL',
    description: 'Accessible PDF generator with security watermarks, plain-text copy blocks, versioned JSON, and FHIR R4 document mapping.',
    clinicalProductionReadiness: 'Production Ready: Zero LLM dependency; sandboxed generation.',
  },
  {
    componentName: 'Audit Logging & Cryptographic Hash Chain',
    module: 'Module 9',
    status: 'REAL',
    description: 'Tamper-evident SHA-256 forward-linked audit ledger for all sensitive, clinical, and administrative events.',
    clinicalProductionReadiness: 'Production Ready: Tamper detection and legal hold mechanisms active.',
  },
  {
    componentName: 'Hospital EHR Inbound Direct Database Sync',
    module: 'Module 7A / 10',
    status: 'MOCKED',
    description: 'Outbound push adapters (No-Op, File-Drop, Endpoint) are real; inbound direct DB writes are disabled for patient safety.',
    clinicalProductionReadiness: 'Architectural Boundary: Inbound writes intentionally disallowed.',
  },
  {
    componentName: 'Physical Kiosk Peripherals (Barcode Scanner, Thermal Printer)',
    module: 'Module 2A / 8',
    status: 'MOCKED',
    description: 'Hardware communication uses Web Serial / Virtual device mocks for headless testing and standard web demonstrations.',
    clinicalProductionReadiness: 'Mocked in Demo: Live deployment requires target hardware drivers.',
  },
  {
    componentName: 'Optical Character Recognition (OCR) Handwriting Model',
    module: 'Module 4',
    status: 'CANNED_SYNTHETIC',
    description: 'In demo mode, prescriptions use controlled benchmark fixtures and deterministic formulary matching to prevent demo unreliability.',
    clinicalProductionReadiness: 'Benchmark Mode: Production pipeline hooks into hospital Tesseract/Cloud Vision endpoint.',
  },
  {
    componentName: 'Cloud Large Language Model (LLM) Summarizer',
    module: 'Module 5',
    status: 'REAL',
    description: 'Dual-mode architecture: calls live cloud LLM when credentials are provided; gracefully falls back to deterministic clinical template.',
    clinicalProductionReadiness: 'Production Ready: Grounding validator and hallucination checks active.',
  },
];

export class AboutDemoService {
  public static getAboutDemoRegistry(): AboutDemoRegistry {
    return {
      environment: 'DEMO',
      bannerMessage: 'DEMONSTRATION — synthetic data',
      disclaimer:
        'This instance is running in DEMO mode with synthetic patient cohorts. Synthetic data is used exclusively to demonstrate system architecture, safety invariants, and workflows. It does not represent real-world clinical advice.',
      auditPassed: true,
      components: COMPONENT_DISCLOSURES,
    };
  }
}
