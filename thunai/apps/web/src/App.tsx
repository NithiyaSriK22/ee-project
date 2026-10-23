import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  Activity, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  UserCheck, 
  Stethoscope, 
  ArrowRight,
  Database,
  ExternalLink,
  Lock
} from 'lucide-react';
import { DemoBanner } from './components/DemoBanner';
import { BuiltVsMockedPanel } from './components/BuiltVsMockedPanel';

interface Scenario {
  visit_id: string;
  status: string;
  token_number: string;
  patient_id: string;
  mrn: string;
  patient_name: string;
  age: number;
  gender: string;
  file_path: string;
  active_alerts: number;
}

export const App: React.FC = () => {
  const [isBuiltMockedOpen, setIsBuiltMockedOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'HEALTHY' | 'CHECKING' | 'OFFLINE'>('CHECKING');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('vis-demo-001');

  const fetchStatusAndScenarios = async () => {
    try {
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealthStatus(data.status === 'HEALTHY' ? 'HEALTHY' : 'CHECKING');
      } else {
        setHealthStatus('OFFLINE');
      }

      const scenRes = await fetch('/api/demo/scenarios');
      if (scenRes.ok) {
        const data = await scenRes.json();
        setScenarios(data.scenarios || []);
      }
    } catch {
      setHealthStatus('OFFLINE');
    }
  };

  useEffect(() => {
    fetchStatusAndScenarios();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f2] text-[#1c1917]">
      {/* 1. Permanent Demo Banner */}
      <DemoBanner 
        onOpenBuiltVsMocked={() => setIsBuiltMockedOpen(true)} 
        onResetComplete={fetchStatusAndScenarios}
      />

      {/* 2. Top Navigation Header */}
      <header className="bg-white border-b border-[#e7e0d3] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#b91c1c] text-white flex items-center justify-center shadow-md">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display text-[#1c1917] tracking-tight">
                  Thunai <span className="text-[#b91c1c] font-normal">(துணை)</span>
                </h1>
                <span className="text-[11px] font-semibold uppercase bg-[#fef2f2] text-[#b91c1c] px-2 py-0.5 rounded-full border border-[#fecaca]">
                  v1.0 Demo
                </span>
              </div>
              <p className="text-xs text-[#78716c]">The companion before the doctor.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#faf7f2] border border-[#e7e0d3] text-xs">
              <span className={`w-2 h-2 rounded-full ${
                healthStatus === 'HEALTHY' ? 'bg-emerald-600 animate-pulse' : 'bg-rose-500'
              }`}></span>
              <span className="text-[#44403c] font-medium hidden sm:inline">API Service:</span>
              <span className="font-semibold text-[#1c1917]">{healthStatus}</span>
            </div>

            <button
              onClick={() => setIsBuiltMockedOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e7e0d3] bg-white hover:bg-[#faf7f2] text-xs font-medium text-[#44403c] transition-colors"
            >
              <span>Architecture Spec</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#78716c]" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero & Mission Statement */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-white rounded-2xl border border-[#e7e0d3] p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#b91c1c] bg-[#fef2f2] px-2.5 py-1 rounded-md border border-[#fecaca]">
              Government Hospital OPD Case-Taking Companion
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#1c1917] tracking-tight">
              Pre-consultation history and prescription verification with zero clinical hallucinations.
            </h2>
            <p className="text-sm sm:text-base text-[#44403c] leading-relaxed">
              In overcrowded outpatient clinics, doctors have only minutes per patient and patients carry fragmented paper records. 
              Thunai captures structured intake at a shared kiosk, processes old prescription documents through a deterministic validation gate, 
              and prepares an origin-linked draft summary that the physician must review and confirm.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[#f0e9dc]">
            <div>
              <div className="text-xs text-[#78716c] font-medium">Validation Gate</div>
              <div className="text-lg font-bold text-[#1c1917] mt-0.5">Deterministic</div>
              <div className="text-[11px] text-[#78716c]">No LLM hallucinations</div>
            </div>
            <div>
              <div className="text-xs text-[#78716c] font-medium">Formulary Drugs</div>
              <div className="text-lg font-bold text-[#1c1917] mt-0.5">42 Common Generics</div>
              <div className="text-[11px] text-[#78716c]">LASA partner margin check</div>
            </div>
            <div>
              <div className="text-xs text-[#78716c] font-medium">Doctor Authority</div>
              <div className="text-lg font-bold text-[#1c1917] mt-0.5">Server-Enforced</div>
              <div className="text-[11px] text-[#78716c]">409 Conflict if unresolved</div>
            </div>
            <div>
              <div className="text-xs text-[#78716c] font-medium">Offline Ready</div>
              <div className="text-lg font-bold text-[#1c1917] mt-0.5">100% Self-Contained</div>
              <div className="text-[11px] text-[#78716c]">Self-hosted fonts &amp; SQLite</div>
            </div>
          </div>
        </section>

        {/* 4. Three Seeded Demonstration Scenarios */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-display text-[#1c1917]">
                Seeded Verification Scenarios
              </h3>
              <p className="text-xs text-[#78716c]">
                Select a scenario to inspect its structured history, prescription document, and validation gate output.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#78716c] bg-[#faf7f2] px-2.5 py-1 rounded-md border border-[#e7e0d3]">
              3 Scenarios Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Scenario A Card */}
            <div 
              onClick={() => setActiveScenarioId('vis-demo-001')}
              className={`bg-white rounded-xl border p-5 cursor-pointer transition-all ${
                activeScenarioId === 'vis-demo-001'
                  ? 'border-[#b91c1c] ring-2 ring-[#b91c1c]/15 shadow-md'
                  : 'border-[#e7e0d3] hover:border-[#d3c7b5]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  Scenario A: Routine
                </span>
                <span className="text-xs font-mono font-medium text-[#78716c]">OPD-01</span>
              </div>
              <h4 className="font-bold text-base text-[#1c1917]">Ramesh Kumar</h4>
              <p className="text-xs text-[#78716c] mt-0.5">45 Y / Male • MRN: TN-GH-2026-001</p>
              <p className="text-xs text-[#44403c] mt-2.5 line-clamp-2">
                Cough and fever for 2 days. Type-2 diabetes history. Crisp printed prescription with verified Paracetamol, Metformin, and Cetirizine.
              </p>
              <div className="mt-4 pt-3 border-t border-[#f0e9dc] flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> All Fields Verified
                </span>
                <span className="text-[#b91c1c] font-medium flex items-center gap-0.5">
                  Select <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Scenario B Card */}
            <div 
              onClick={() => setActiveScenarioId('vis-demo-002')}
              className={`bg-white rounded-xl border p-5 cursor-pointer transition-all ${
                activeScenarioId === 'vis-demo-002'
                  ? 'border-[#b91c1c] ring-2 ring-[#b91c1c]/15 shadow-md'
                  : 'border-[#e7e0d3] hover:border-[#d3c7b5]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                  Scenario B: Gate Errors
                </span>
                <span className="text-xs font-mono font-medium text-[#78716c]">OPD-02</span>
              </div>
              <h4 className="font-bold text-base text-[#1c1917]">Meena Sundaram</h4>
              <p className="text-xs text-[#78716c] mt-0.5">52 Y / Female • MRN: TN-GH-2026-002</p>
              <p className="text-xs text-[#44403c] mt-2.5 line-clamp-2">
                Joint pain &gt;1 week. Smudged allergy line produces UNREADABLE state. Unmatched drug "Artisan-XR" flagged MISMATCH. Must resolve before confirm.
              </p>
              <div className="mt-4 pt-3 border-t border-[#f0e9dc] flex items-center justify-between text-xs">
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Must-Resolve Active
                </span>
                <span className="text-[#b91c1c] font-medium flex items-center gap-0.5">
                  Select <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Scenario C Card */}
            <div 
              onClick={() => setActiveScenarioId('vis-demo-003')}
              className={`bg-white rounded-xl border p-5 cursor-pointer transition-all ${
                activeScenarioId === 'vis-demo-003'
                  ? 'border-[#b91c1c] ring-2 ring-[#b91c1c]/15 shadow-md'
                  : 'border-[#e7e0d3] hover:border-[#d3c7b5]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                  Scenario C: Red Flag
                </span>
                <span className="text-xs font-mono font-medium text-[#78716c]">OPD-03</span>
              </div>
              <h4 className="font-bold text-base text-[#1c1917]">Arumugam Pillai</h4>
              <p className="text-xs text-[#78716c] mt-0.5">61 Y / Male • MRN: TN-GH-2026-003</p>
              <p className="text-xs text-[#44403c] mt-2.5 line-clamp-2">
                Chest pain + Breathing difficulty = IMMEDIATE alert (Rule RF-DEMO-001). Calm kiosk guidance while dispatching staff triage.
              </p>
              <div className="mt-4 pt-3 border-t border-[#f0e9dc] flex items-center justify-between text-xs">
                <span className="text-rose-700 font-semibold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> Immediate Triage
                </span>
                <span className="text-[#b91c1c] font-medium flex items-center gap-0.5">
                  Select <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Selected Scenario Inspector Preview */}
        <section className="bg-white rounded-2xl border border-[#e7e0d3] p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#f0e9dc]">
            <div>
              <h3 className="text-base font-bold text-[#1c1917]">
                Inspection Deck: {activeScenarioId === 'vis-demo-001' ? 'Scenario A' : activeScenarioId === 'vis-demo-002' ? 'Scenario B' : 'Scenario C'}
              </h3>
              <p className="text-xs text-[#78716c]">
                Review the underlying SQLite entities populated by the seed runner for this scenario.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#faf7f2] border border-[#e7e0d3] px-3 py-1 rounded-md text-[#44403c] font-mono">
                visit_id: {activeScenarioId}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Left: Document View */}
            <div className="space-y-2">
              <span className="font-bold text-[#1c1917] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#b91c1c]" /> Synthetic Scanned Prescription
              </span>
              <div className="border border-[#e7e0d3] rounded-xl overflow-hidden bg-[#faf7f2] flex items-center justify-center p-2 min-h-[300px]">
                <img 
                  src={`/api/images/${
                    activeScenarioId === 'vis-demo-001' 
                      ? 'rx_001_printed.svg' 
                      : activeScenarioId === 'vis-demo-002' 
                      ? 'rx_002_handwritten.svg' 
                      : 'rx_003_smudged.svg'
                  }`} 
                  alt="Synthetic prescription" 
                  className="max-h-[340px] w-auto object-contain rounded shadow-xs"
                />
              </div>
            </div>

            {/* Right: Validation & Invariants Summary */}
            <div className="space-y-4">
              <span className="font-bold text-[#1c1917] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#b91c1c]" /> Non-Negotiable Gate Assertions
              </span>
              <div className="space-y-2.5">
                <div className="bg-[#faf7f2] p-3 rounded-lg border border-[#e7e0d3]">
                  <div className="font-semibold text-[#1c1917]">1. Field State Determinism</div>
                  <div className="text-[#44403c] mt-0.5">
                    {activeScenarioId === 'vis-demo-001' && 'Paracetamol (VERIFIED 1.0), Metformin (VERIFIED 1.0), Cetirizine (VERIFIED 1.0).'}
                    {activeScenarioId === 'vis-demo-002' && 'Artisan-XR (MISMATCH_FLAGGED score 0.52 < 0.60), OD (UNVERIFIED ambiguous), Smudged line (UNREADABLE confidence 0.22 < 0.30).'}
                    {activeScenarioId === 'vis-demo-003' && 'Aspirin (VERIFIED), Clopidogrel (VERIFIED), Missing allergy (UNVERIFIED: absence is not negative).'}
                  </div>
                </div>

                <div className="bg-[#faf7f2] p-3 rounded-lg border border-[#e7e0d3]">
                  <div className="font-semibold text-[#1c1917]">2. Doctor Confirmation Gate</div>
                  <div className="text-[#44403c] mt-0.5">
                    {activeScenarioId === 'vis-demo-001' ? 'Ready for confirmation with zero blocking items.' : 'HTTP 409 Conflict rejection enforced by server until doctor resolves all items.'}
                  </div>
                </div>

                <div className="bg-[#faf7f2] p-3 rounded-lg border border-[#e7e0d3]">
                  <div className="font-semibold text-[#1c1917]">3. Record Immutability</div>
                  <div className="text-[#44403c] mt-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#b91c1c]" /> Confirmed record protected by SQLite UPDATE/DELETE trigger abort.
                  </div>
                </div>
              </div>

              {/* Action Buttons to Enter Later Modules */}
              <div className="pt-2 flex flex-wrap gap-2">
                <div className="text-xs text-[#78716c] italic">
                  Modules D2–D7 will connect the interactive Kiosk (D3), Validation Gate (D4), and Doctor Workspace (D6).
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="bg-white border-t border-[#e7e0d3] py-6 text-xs text-[#78716c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1c1917]">Thunai (துணை)</span>
            <span>•</span>
            <span>Government Hospital OPD Pre-Consultation Platform</span>
          </div>
          <div className="text-[11px] text-[#a8a29e]">
            Theme: White, Cream, and Red • Synthetic Datasets • Pure Deterministic Validation
          </div>
        </div>
      </footer>

      {/* 7. Built vs Mocked Modal Drawer */}
      <BuiltVsMockedPanel 
        isOpen={isBuiltMockedOpen} 
        onClose={() => setIsBuiltMockedOpen(false)} 
      />
    </div>
  );
};
