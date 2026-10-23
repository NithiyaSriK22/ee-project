import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/query-client';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { KioskSessionProvider } from './features/registration/context/KioskSessionContext';
import { LanguageProvider } from './features/language/useLanguage';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LanguageProvider>
            <KioskSessionProvider>
              <AppRoutes />
            </KioskSessionProvider>
          </LanguageProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
