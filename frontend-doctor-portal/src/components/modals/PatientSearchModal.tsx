import React, { useState, useEffect } from 'react';
import { Search, X, User, Phone, ArrowRight, Loader2, FileText } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { ApiResponse } from '../../types/api.types';
import { useNavigate } from 'react-router-dom';

interface Patient {
  id: string;
  hospitalRegistrationNumber: string;
  fullName: string;
  age?: number | null;
  dateOfBirth?: string | null;
  gender: string;
  contactNumber: string;
  preferredLanguage?: string;
  createdAt: string;
  recentVisits?: Array<{
    visitId: string;
    createdAt: string;
  }>;
}

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PatientSearchModal: React.FC<PatientSearchModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setPatients([]);
      setError(null);
      return;
    }
    fetchPatients('');
  }, [isOpen]);

  const fetchPatients = async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<{ total: number; patients: Patient[] }>>('/patients', {
        params: { search: query.trim() || undefined, limit: 20 },
      });
      if (res.data?.data?.patients) {
        setPatients(res.data.data.patients);
      } else {
        setPatients([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to search patients. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchTerm);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Search Patient Records</h3>
              <p className="text-xs text-slate-500">Search by patient name, registration ID, or mobile number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-6 pb-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter name, ID (e.g. THN-25-0412), or mobile number..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-sm text-slate-900 placeholder:text-slate-400"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2.5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
              <p className="text-xs font-medium">Searching patient records...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-600 bg-rose-50 rounded-xl p-4 text-xs font-medium border border-rose-200">
              {error}
            </div>
          ) : patients.length === 0 ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <User className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No patients found</p>
              <p className="text-xs text-slate-400 max-w-sm">
                No matching registered records found. Verify the registration ID or name.
              </p>
            </div>
          ) : (
            patients.map((patient) => {
              const latestVisit = patient.recentVisits?.[0];
              return (
                <div
                  key={patient.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-800/10 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {patient.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-teal-900">
                          {patient.fullName}
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                          {patient.hospitalRegistrationNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>
                          {patient.age ? `${patient.age} yrs` : 'Age N/A'} • {patient.gender || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {patient.contactNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {latestVisit ? (
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/review/${latestVisit.visitId}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <span>Open Case</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/patients');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>View Details</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Found {patients.length} matching patients</span>
          <button
            onClick={() => {
              onClose();
              navigate('/patients');
            }}
            className="text-teal-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Open Full Patient Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
