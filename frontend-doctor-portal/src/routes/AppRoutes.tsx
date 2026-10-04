import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { DoctorLayout } from '../layouts/DoctorLayout';
import { DoctorDashboardPage } from '../pages/DoctorDashboardPage';
import { DoctorLoginPage } from '../features/auth/pages/DoctorLoginPage';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { InterviewTemplateManagerPage } from '../features/admin/pages/InterviewTemplateManagerPage';
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
