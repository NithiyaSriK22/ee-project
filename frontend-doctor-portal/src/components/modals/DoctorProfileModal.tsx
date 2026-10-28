import React from 'react';
import { Mail, Award, Stethoscope, Building2, Phone, ShieldCheck, X, Briefcase, Calendar } from 'lucide-react';
import { StaffUser } from '../../features/auth/types/auth.types';

interface DoctorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StaffUser | null;
}

export const DoctorProfileModal: React.FC<DoctorProfileModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  const doctorName = user?.fullName || 'Dr. Arun Kumar';
  const email = user?.email || 'arun@medbrief.test';
  const specialization = user?.specialization || user?.hospitalDepartment || 'General Medicine';
  const qualification = user?.qualification || 'MBBS, MD';
  const experienceYears = user?.experienceYears !== undefined && user?.experienceYears !== null ? `${user.experienceYears} Years` : '10 Years';
  const regNumber = user?.medicalRegistrationNumber || 'TNMC-65432';
  const hospitalOrClinic = user?.hospitalName || user?.clinicName || 'Apollo Hospitals / MEDBRIEF Clinic';
  const designation = user?.designation || 'Senior Consultant Physician';
  const phoneNumber = user?.phoneNumber || '+91 98401 23456';
  const accountStatus = user?.accountStatus || user?.status || 'ACTIVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#064e3b] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-emerald-200">
              {doctorName.replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{doctorName}</h3>
              <p className="text-xs text-emerald-800 font-semibold">{specialization}</p>
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

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700">
          {/* Top Status & Role Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="font-semibold text-slate-700">Account Status:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                {accountStatus}
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
              {user?.role || 'DOCTOR'}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email */}
            <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Email Address</span>
              </div>
              <p className="font-mono font-bold text-slate-900 text-xs truncate" title={email}>
                {email}
              </p>
            </div>

            {/* Medical Reg Number */}
            <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Medical Reg. No.</span>
              </div>
              <p className="font-mono font-bold text-slate-900 text-xs truncate" title={regNumber}>
                {regNumber}
              </p>
            </div>

            {/* Qualification */}
            <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>Qualification</span>
              </div>
              <p className="font-bold text-slate-900 text-xs truncate" title={qualification}>
                {qualification}
              </p>
            </div>

            {/* Experience */}
            <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Clinical Experience</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">
                {experienceYears}
              </p>
            </div>

            {/* Designation */}
            <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-2xs space-y-1 sm:col-span-2">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                <span>Designation</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">
                {designation}
              </p>
            </div>

            {/* Hospital / Clinic */}
            <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-2xs space-y-1 sm:col-span-2">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Affiliated Hospital / Clinic</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">
                {hospitalOrClinic}
              </p>
            </div>

            {/* Phone Number */}
            {phoneNumber && (
              <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-2xs space-y-1 sm:col-span-2">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Contact Phone</span>
                </div>
                <p className="font-mono font-bold text-slate-900 text-xs">
                  {phoneNumber}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#064e3b] text-white rounded-xl text-xs font-bold hover:bg-[#053d2e] transition-colors cursor-pointer shadow-xs"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
