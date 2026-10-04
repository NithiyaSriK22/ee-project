import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { DoctorLayout } from '../layouts/DoctorLayout';
import { DoctorDashboardPage } from '../pages/DoctorDashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<DoctorLayout />}>
        <Route index element={<DoctorDashboardPage />} />
        {/* Future routes will be connected in Modules 2, 5, 6, 7, 9:
          <Route path="login" element={<DoctorLoginPage />} />
          <Route path="queue" element={<DoctorQueuePage />} />
          <Route path="summary/:patientId" element={<PatientSummaryReviewPage />} />
          <Route path="redflags" element={<RedFlagAlertsPage />} />
          <Route path="formulary" element={<FormularyDatabasePage />} />
          <Route path="audit" element={<ClinicalAuditLogPage />} />
        */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
