import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { KioskLayout } from '../layouts/KioskLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<KioskLayout />}>
        <Route index element={<HomePage />} />
        {/* Future routes will be connected in Modules 2-4:
          <Route path="register" element={<PatientRegistrationPage />} />
          <Route path="interview" element={<GuidedInterviewPage />} />
          <Route path="documents" element={<DocumentScanPage />} />
          <Route path="consent" element={<ConsentPage />} />
          <Route path="session-complete" element={<SessionCompletePage />} />
        */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
