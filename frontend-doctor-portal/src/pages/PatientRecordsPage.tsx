import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  ArrowRight,
  Loader2,
  User,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { ApiResponse } from '../types/api.types';

interface PatientItem {
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
    isCompanionAssisted?: boolean;
    companionName?: string | null;
    preferredLanguage?: string;
    createdAt: string;
  }>;
}

export const PatientRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async (query: string = '', refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<ApiResponse<{ total: number; patients: PatientItem[] }>>('/patients', {
        params: { search: query.trim() || undefined, limit: 50 },
      });
      if (res.data?.data) {
        setPatients(res.data.data.patients || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to retrieve patient records from backend.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPatients(search);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(search);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Patient Directory & Master Records</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified clinical records registered via Kiosk intake, authenticated login, and hospital admissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPatients(search, true)}
            disabled={isRefreshing || isLoading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-700' : ''}`} />
            <span>Refresh Directory</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Patient Name, Hospital Reg ID (e.g. THN-25-0412), or Mobile number..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Registered Patients</h2>
            <p className="text-xs text-slate-500">Showing {patients.length} of {total} registered patient identities</p>
          </div>
          <span className="text-xs font-mono font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
            {total} Total Patients
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
            <p className="text-xs font-medium">Loading verified patient records from database...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="inline-block p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium max-w-md">
              {error}
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <User className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No patient records found</p>
            <p className="text-xs text-slate-400 max-w-sm">
              {search ? 'No patients matched your search criteria.' : 'Patients registered via Kiosk will automatically appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">#</th>
                  <th className="py-3 px-5">Patient ID</th>
                  <th className="py-3 px-5">Full Name</th>
                  <th className="py-3 px-5">Age / Gender</th>
                  <th className="py-3 px-5">Contact</th>
                  <th className="py-3 px-5">Language</th>
                  <th className="py-3 px-5">Registered Date</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {patients.map((patient, index) => {
                  const latestVisit = patient.recentVisits?.[0];
                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-teal-50/20 transition-colors group"
                    >
                      <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px] font-bold">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-800">
                        {patient.hospitalRegistrationNumber}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-slate-900 group-hover:text-teal-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-800/10 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {patient.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{patient.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">
                        {patient.age ? `${patient.age} yrs` : '—'} / {patient.gender || '—'}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 font-mono">
                        {patient.contactNumber || '—'}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 uppercase font-mono text-[11px]">
                        {patient.preferredLanguage || 'en'}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">
                        {formatDate(patient.createdAt)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {latestVisit ? (
                          <button
                            onClick={() => navigate(`/review/${latestVisit.visitId}`)}
                            className="px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                          >
                            <span>Open Visit</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No Active Visit</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
