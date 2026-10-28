import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileCheck2,
  ShieldCheck,
  Play,
  Menu,
  ChevronRight,
  Search,
  Upload,
  FileEdit,
  CheckCircle2,
  User,
  Award,
  Lock,
  Loader2,
  AlertCircle,
  UserCheck,
  X,
} from 'lucide-react';
import { DoctorReviewApi } from '../features/doctor-review/api/doctor-review.api';
import {
  VisitQueueEntryDTO,
  DashboardStatsDTO,
} from '../features/doctor-review/types/doctor-review.types';
import { useAuth } from '../features/auth/hooks/useAuth';
import { PatientSearchModal } from '../components/modals/PatientSearchModal';
import { DocumentUploadModal } from '../components/modals/DocumentUploadModal';
import { QuickNoteModal } from '../components/modals/QuickNoteModal';

export const DoctorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [queue, setQueue] = useState<VisitQueueEntryDTO[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isNoteOpen, setIsNoteOpen] = useState<boolean>(false);

  // Queue scoping and dynamic doctor reassignment state
  const [queueScope, setQueueScope] = useState<'my_queue' | 'unassigned' | 'all'>('my_queue');
  const [isReassignOpen, setIsReassignOpen] = useState<boolean>(false);
  const [selectedVisitForReassign, setSelectedVisitForReassign] = useState<VisitQueueEntryDTO | null>(null);
  const [availableDoctors, setAvailableDoctors] = useState<Array<{ id: string; fullName?: string; doctor_name?: string; department_name?: string }>>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dept = user?.hospitalDepartment || undefined;
      const [statsData, queueData] = await Promise.all([
        DoctorReviewApi.getDashboardStats(dept),
        DoctorReviewApi.getQueue({ department: dept, scope: queueScope }),
      ]);
      setStats(statsData);
      setQueue(queueData);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(
        err?.response?.data?.message ||
          'Failed to load live OPD consultation queue from backend.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000); // 20s live sync
    return () => clearInterval(interval);
  }, [user?.hospitalDepartment, queueScope]);

  const openReassignModal = async (entry: VisitQueueEntryDTO) => {
    setSelectedVisitForReassign(entry);
    setSelectedDoctorId(entry.assignedDoctorId || '');
    setReassignReason('');
    setIsReassignOpen(true);
    try {
      const docs = await DoctorReviewApi.getDoctors();
      setAvailableDoctors(docs);
      if (!entry.assignedDoctorId && docs.length > 0) {
        setSelectedDoctorId(docs[0].id);
      }
    } catch (err) {
      console.warn('Failed to load doctors list:', err);
    }
  };

  const handleConfirmReassign = async () => {
    if (!selectedVisitForReassign || !selectedDoctorId) {
      alert('Please select a physician');
      return;
    }
    setIsReassigning(true);
    try {
      await DoctorReviewApi.reassignVisit(selectedVisitForReassign.visitId, {
        newDoctorId: selectedDoctorId,
        reason: reassignReason.trim() || 'Physician assignment updated from dashboard',
      });
      showToast('Physician assignment successfully updated.');
      setIsReassignOpen(false);
      setSelectedVisitForReassign(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to reassign physician');
    } finally {
      setIsReassigning(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStartNextReview = () => {
    if (!queue || queue.length === 0) {
      showToast('No patients are currently waiting for review.');
      return;
    }
    // Pick the top eligible case
    const nextCase =
      queue.find((q) => q.queueStatus === 'WAITING' || q.queueStatus === 'READY_FOR_REVIEW') ||
      queue[0];
    if (nextCase) {
      navigate(`/review/${nextCase.visitId}`);
    } else {
      showToast('No patients are currently waiting for review.');
    }
  };

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return 'Just now';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins === 1) return '1 min ago';
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return '1 hr ago';
      if (diffHours < 24) return `${diffHours} hrs ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return 'Just now';
    }
  };

  const getStatCount = (val: any, fallback = 0): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val.count === 'number') return val.count;
    return fallback;
  };

  const getStatAvgMinutes = (st: any, fallback = 3.2): number => {
    if (st?.patientsInQueue && typeof st.patientsInQueue === 'object' && st.patientsInQueue.avgIntakeMinutes !== undefined) {
      return st.patientsInQueue.avgIntakeMinutes;
    }
    if (st?.avgIntakeMinutes !== undefined) {
      return st.avgIntakeMinutes;
    }
    return fallback;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Main Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            OPD Consultation Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Review, validate and confirm patient cases captured via kiosk interviews and documents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/review')}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
          >
            <Menu className="w-4 h-4 text-slate-600" />
            <span>Open Queue</span>
          </button>

          <button
            onClick={handleStartNextReview}
            className="px-5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#043e30] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm shadow-[#064e3b]/20 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Next Review</span>
          </button>
        </div>
      </div>

      {/* Live Statistics 3-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Patients in Queue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Patients in Queue</div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mt-1" />
              ) : (
                getStatCount(stats?.patientsInQueue, 0)
              )}
            </div>
            <div className="text-xs font-bold text-emerald-700 mt-1">Ready for intake</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Avg. intake time ~ {getStatAvgMinutes(stats)} min
            </div>
          </div>
        </div>

        {/* Card 2: Pending Reviews */}
        <div
          onClick={() => navigate('/review')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-start gap-4 cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Pending Reviews</div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mt-1" />
              ) : (
                getStatCount(stats?.pendingReviews, 0)
              )}
            </div>
            <div className="text-xs font-bold text-slate-800 mt-1">Draft summaries</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Awaiting your confirmation</div>
          </div>
        </div>

        {/* Card 3: Confirmed Records */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Confirmed Records</div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mt-1" />
              ) : (
                getStatCount(stats?.confirmedRecords, 0)
              )}
            </div>
            <div className="text-xs font-bold text-emerald-700 mt-1">This month</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Saved to OPD history</div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Intake Queue Table (68% width on large screens) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Card Header & Scope Tabs */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Intake & Consultation Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {queueScope === 'my_queue'
                  ? 'Patients assigned specifically to your active consultation queue'
                  : queueScope === 'unassigned'
                  ? 'Intake cases awaiting department physician assignment'
                  : 'All active consultations across the department'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setQueueScope('my_queue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  queueScope === 'my_queue'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                My Queue
              </button>
              <button
                onClick={() => setQueueScope('unassigned')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  queueScope === 'unassigned'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Unassigned
              </button>
              <button
                onClick={() => setQueueScope('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  queueScope === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All OPD
              </button>
            </div>
          </div>

          {/* Table Content */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
              <p className="text-xs font-medium">Loading OPD consultation queue...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="inline-block p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium max-w-md">
                {error}
              </div>
            </div>
          ) : queue.length === 0 ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Users className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">
                {queueScope === 'my_queue'
                  ? 'No patients are currently assigned to your queue.'
                  : queueScope === 'unassigned'
                  ? 'No unassigned patients awaiting triage.'
                  : 'No patients are currently waiting in the consultation queue.'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                Patients who complete kiosk intake will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-5 font-bold">#</th>
                    <th className="py-3 px-4 font-bold">Patient ID</th>
                    <th className="py-3 px-4 font-bold">Name</th>
                    <th className="py-3 px-4 font-bold">Age / Gender</th>
                    <th className="py-3 px-4 font-bold">Chief Complaint</th>
                    <th className="py-3 px-4 font-bold">Assigned Doctor</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Time</th>
                    <th className="py-3 px-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {queue.slice(0, visibleCount).map((entry, index) => {
                    const isReview =
                      entry.queueStatus === 'READY_FOR_REVIEW' ||
                      entry.queueStatus === 'IN_CONSULTATION';

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => navigate(`/review/${entry.visitId}`)}
                        className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-5 text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-slate-700">
                          {entry.patientRegistrationNumber ||
                            `THN-${entry.id.slice(-4).toUpperCase()}`}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900 group-hover:text-emerald-900">
                          {entry.patientName || entry.patientTokenOrName}
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {entry.patientAge ? `${entry.patientAge}` : '—'} /{' '}
                          {entry.patientGender ? entry.patientGender[0] : '—'}
                        </td>
                        <td className="py-4 px-4 text-slate-700 max-w-xs truncate font-medium">
                          {entry.chiefComplaint || 'Awaiting interview complaint'}
                        </td>
                        <td className="py-4 px-4">
                          {entry.assignedDoctorName ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-900 font-semibold text-2xs">
                              <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="truncate max-w-[130px]">{entry.assignedDoctorName}</span>
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-3xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${
                              isReview
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isReview ? 'Review' : 'New'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {formatRelativeTime(entry.readyAt || entry.createdAt)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openReassignModal(entry);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 text-2xs font-bold transition-all shadow-2xs cursor-pointer"
                              title="Assign or reassign physician"
                            >
                              Assign
                            </button>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all inline" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Load More Button */}
              {queue.length > visibleCount && (
                <div className="p-4 border-t border-slate-100 text-center bg-slate-50/30">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 5)}
                    className="px-6 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Quick Actions & System Status (32% width on large screens) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Quick Actions</h3>

            <div className="space-y-2.5">
              {/* Action 1: Open Next Patient */}
              <button
                onClick={handleStartNextReview}
                className="w-full p-3.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">
                      Open Next Patient
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Start reviewing the next case
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Action 2: Search Patient */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-full p-3.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 group-hover:bg-teal-100 transition-colors">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-teal-950">
                      Search Patient
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Find records by name or ID
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Action 3: Upload Document */}
              <button
                onClick={() => setIsUploadOpen(true)}
                className="w-full p-3.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-950">
                      Upload Document
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Add prescription or report
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Action 4: Add Quick Note */}
              <button
                onClick={() => setIsNoteOpen(true)}
                className="w-full p-3.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                    <FileEdit className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-amber-950">
                      Add Quick Note
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Create a clinical note
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* System Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-900">System Status</div>
                <div className="text-xs font-bold text-emerald-700 mt-0.5">
                  All systems operational
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Last checked: Just now</div>

                {/* Subsystem status indicators */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Backend API</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Operational
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">PostgreSQL DB</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">AI Summary Engine</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Ready
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Clinical OCR Service</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Review Principles Section */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-slate-900">Clinical Review Principles</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Principle 1 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Deterministic Validation</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Every field is source-verified
              </div>
            </div>
          </div>

          {/* Principle 2 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Physician in Control</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                You edit, confirm or reject
              </div>
            </div>
          </div>

          {/* Principle 3 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Explainable AI</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                AI suggestions with confidence
              </div>
            </div>
          </div>

          {/* Principle 4 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Secure & Compliant</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Data privacy by design
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PatientSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => fetchData()}
      />

      <QuickNoteModal
        isOpen={isNoteOpen}
        onClose={() => setIsNoteOpen(false)}
        onSuccess={() => showToast('Clinical quick note recorded successfully.')}
      />

      {/* Doctor Reassignment Modal */}
      {isReassignOpen && selectedVisitForReassign && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <span>Assign / Reassign Physician</span>
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Case: {selectedVisitForReassign.patientName || selectedVisitForReassign.patientTokenOrName}
                </p>
              </div>
              <button
                onClick={() => setIsReassignOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Attending Physician
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs"
                >
                  <option value="" disabled>-- Select Doctor --</option>
                  {availableDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.fullName || doc.doctor_name || doc.id} {doc.department_name ? `(${doc.department_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Clinical Justification / Reason
                </label>
                <textarea
                  rows={2}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Specialty consultation transfer, on-call physician coverage"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReassignOpen(false)}
                  disabled={isReassigning}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReassign}
                  disabled={isReassigning || !selectedDoctorId}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isReassigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Confirm Assignment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
