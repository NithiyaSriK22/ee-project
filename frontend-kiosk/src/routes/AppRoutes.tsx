import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { KioskLayout } from '../layouts/KioskLayout';
import { HomePage } from '../pages/HomePage';
import { KioskRegistrationPage } from '../features/registration/pages/KioskRegistrationPage';
import { GuidedInterviewPage } from '../features/interview/pages/GuidedInterviewPage';
import { DocumentScanPage, DocumentReviewPage } from '../features/documents';
import { KioskProtectedRoute } from '../features/registration/components/KioskProtectedRoute';
import { RemotePortalLayout } from '../layouts/RemotePortalLayout';
import { RemotePatientPortalPage } from '../features/portal/RemotePatientPortalPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export { KioskProtectedRoute };

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Physical Terminal Kiosk Shell */}
      <Route path="/" element={<KioskLayout />}>
        <Route index element={<HomePage />} />
        <Route path="register" element={<KioskRegistrationPage />} />
        <Route
          path="interview"
          element={
            <KioskProtectedRoute>
              <GuidedInterviewPage />
            </KioskProtectedRoute>
          }
        />
        <Route
          path="documents/scan"
          element={
            <KioskProtectedRoute>
              <DocumentScanPage />
            </KioskProtectedRoute>
          }
        />
        <Route
          path="documents/review"
          element={
            <KioskProtectedRoute>
              <DocumentReviewPage />
            </KioskProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Standalone Remote Mobile-Responsive Patient Portal (P3.1) */}
      <Route path="/portal" element={<RemotePortalLayout />}>
        <Route index element={<RemotePatientPortalPage />} />
      </Route>
    </Routes>
  );
};

