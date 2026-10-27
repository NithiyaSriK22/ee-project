import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DoctorLayout } from '../layouts/DoctorLayout';
import { DoctorDashboardPage } from '../pages/DoctorDashboardPage';
import { PatientRecordsPage } from '../pages/PatientRecordsPage';
import { DoctorLoginPage } from '../features/auth/pages/DoctorLoginPage';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { InterviewTemplateManagerPage, AdminShell } from '../features/admin';
import { SummaryPreviewPage } from '../features/summary';
import {
  ReviewWorkspacePage,
  RawViewPage,
  ConfirmedRecordPage,
} from '../features/doctor-review';
import { NotificationListPage } from '../features/notifications';
import { TranslationsAdminPage } from '../features/translation-admin';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<DoctorLoginPage />} />

      {/* Protected Clinical & Admin Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN', 'ANALYST', 'AUDITOR']}>
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorDashboardPage />} />
        <Route path="patients" element={<PatientRecordsPage />} />
        
        {/* Module 5 Clinical Summary Draft Preview (Foundation) */}
        <Route path="visits/:visitId/summary" element={<SummaryPreviewPage />} />

        {/* Module 7 Doctor Review & Confirmation Workflow */}
        <Route path="review" element={<ReviewWorkspacePage />} />
        <Route path="review/:visitId" element={<ReviewWorkspacePage />} />
        <Route path="review/:visitId/raw" element={<RawViewPage />} />
        <Route path="confirmed-records/:id" element={<ConfirmedRecordPage />} />

        {/* Emergency Triage & Alerts disabled per configuration */}
        <Route path="redflags/*" element={<Navigate to="/" replace />} />
        <Route path="redflags" element={<Navigate to="/" replace />} />

        {/* Module 8 Operational Notifications */}
        <Route path="notifications" element={<NotificationListPage />} />

        {/* Module 8 Multilingual Translations & Clinical Governance */}
        <Route
          path="admin/translations"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'DOCTOR']}>
              <TranslationsAdminPage />
            </ProtectedRoute>
          }
        />

        {/* Module 3 Admin Template & Question Bank Manager */}
        <Route
          path="admin/templates"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
              <InterviewTemplateManagerPage />
            </ProtectedRoute>
          }
        />

        {/* Module 9 Administration, Analytics, Audit & Monitoring Console */}
        <Route
          path="admin/analytics"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR']}>
              <AdminShell />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR']}>
              <AdminShell />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'AUDITOR']}>
              <AdminShell />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
