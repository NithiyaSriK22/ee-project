import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { ProvenanceTag } from '../components/ui/ProvenanceTag';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Users,
  Clock,
  ShieldCheck,
  Stethoscope,
  Info,
} from 'lucide-react';

export const DoctorDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Top Clinical Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">OPD Consultation Queue & Case Reviews</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Real-time patient intake summaries captured via kiosk interviews and digitized old prescriptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/review')}
          >
            Open Queue
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Stethoscope className="w-4 h-4" />}
            onClick={() => navigate('/review')}
          >
            Start Next Review
          </Button>
        </div>
      </div>

      {/* Triage & Queue Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Patients in Queue</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">Ready for Intake</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Average intake time: ~3.5 min
          </div>
        </Card>

        <Card
          className="p-4 border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/review')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Pending Doctor Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">Draft Summaries</div>
          <div className="text-xs text-slate-500 mt-1">
            Requiring physician confirmation
          </div>
        </Card>

        <Card
          className="p-4 border-l-4 border-l-rose-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/redflags')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Red-Flag Triage Alerts</span>
            <Badge variant="urgent">Critical</Badge>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">Active Screening</div>
          <div className="text-xs text-rose-600 mt-1 font-medium">
            Emergency symptom safety net
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Confirmed Records</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">Doctor Confirmed</div>
          <div className="text-xs text-emerald-700 mt-1">
            Saved to official OPD history
          </div>
        </Card>
      </div>

      {/* Explainability & Provenance Architecture Demonstration */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-700" />
            <span>Clinical Provenance & Explainability Architecture (Module 1 Foundation)</span>
          </div>
        }
      >
        <div className="mb-4 text-sm text-slate-600 leading-relaxed">
          MediKiosk strictly enforces deterministic field validation before AI summarization. Every clinical field displays its source, confidence score, and verification state. The physician retains final authority to edit, confirm, or reject any field.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProvenanceTag
            fieldName="Chief Complaint"
            fieldValue="Productive cough for 5 days with mild evening fever"
            provenance={{
              sourceType: 'INTERVIEW_ANSWER',
              sourceReference: 'kiosk_voice_q1',
              confidenceScore: 0.98,
              validationCheckApplied: 'OCR_CONFIDENCE_THRESHOLD',
              status: 'VERIFIED',
              extractedAt: new Date().toISOString(),
            }}
          />

          <ProvenanceTag
            fieldName="Current Medication"
            fieldValue="Amoxicillin 500mg (1-0-1)"
            provenance={{
              sourceType: 'DOCUMENT_SNIPPET',
              sourceReference: 'prescription_doc_page1_line4',
              confidenceScore: 0.91,
              validationCheckApplied: 'FORMULARY_MATCH',
              status: 'VERIFIED',
              extractedAt: new Date().toISOString(),
            }}
          />

          <ProvenanceTag
            fieldName="Known Drug Allergy"
            fieldValue="[Illegible in original - Verify manually]"
            provenance={{
              sourceType: 'DOCUMENT_SNIPPET',
              sourceReference: 'prescription_doc_page1_line9',
              confidenceScore: 0.32,
              validationCheckApplied: 'FORMULARY_MATCH',
              status: 'UNREADABLE',
              extractedAt: new Date().toISOString(),
            }}
          />
        </div>
      </Card>

      {/* Safety & SaMD Regulatory Notice */}
      <Alert variant="warning" title="Clinical Decision-Support & Regulatory Notice">
        This platform assists in organizing patient-provided information and digitized documents into a structured summary for physician review. This summary is a draft aid, not a diagnosis, and does not replace clinical judgment. Treating physicians review and confirm all clinical fields. Red-flag emergency screening is designed to assist triage under human supervision.
      </Alert>
    </div>
  );
};
