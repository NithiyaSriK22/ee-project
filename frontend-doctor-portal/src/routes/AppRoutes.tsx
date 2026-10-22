import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { DoctorLayout } from '../layouts/DoctorLayout';
import { DoctorDashboardPage } from '../pages/DoctorDashboardPage';
import { DoctorLoginPage } from '../features/auth/pages/DoctorLoginPage';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { InterviewTemplateManagerPage } from '../features/admin/pages/InterviewTemplateManagerPage';
import { SummaryPreviewPage } from '../features/summary';
import {
  TriageQueuePage,
  RuleListPage,
  RuleEditorPage,
  RuleTestRunner,
  ClinicalReviewPage,
} from '../features/redflags';
import {
  ReviewWorkspacePage,
  RawViewPage,
  ConfirmedRecordPage,
} from '../features/doctor-review';
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
          <ProtectedRoute allowedRoles={['DOCTOR', 'STAFF_ATTENDANT', 'ADMIN', 'SUPER_ADMIN']}>
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorDashboardPage />} />
        
        {/* Module 5 Clinical Summary Draft Preview (Foundation) */}
        <Route path="visits/:visitId/summary" element={<SummaryPreviewPage />} />

        {/* Module 7 Doctor Review & Confirmation Workflow */}
        <Route path="review" element={<ReviewWorkspacePage />} />
        <Route path="review/:visitId" element={<ReviewWorkspacePage />} />
        <Route path="review/:visitId/raw" element={<RawViewPage />} />
        <Route path="confirmed-records/:id" element={<ConfirmedRecordPage />} />

        {/* Module 6 Emergency Triage Alert Queue & Rule Governance */}
        <Route path="redflags" element={<TriageQueuePage />} />
        <Route path="redflags/rules" element={<RuleListPage />} />
        <Route path="redflags/rules/new" element={<RuleEditorPage />} />
        <Route path="redflags/rules/:id/tests" element={<RuleTestRunner />} />
        <Route path="redflags/rules/:id/review" element={<ClinicalReviewPage />} />

        {/* Module 3 Admin Template & Question Bank Manager */}
        <Route
          path="admin/templates"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
              <InterviewTemplateManagerPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
