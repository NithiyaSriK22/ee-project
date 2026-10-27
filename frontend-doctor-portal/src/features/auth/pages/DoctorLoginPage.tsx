import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  BackgroundLayer,
  BrandHeader,
  HeroSection,
  FeatureCards,
  LoginCard,
  PageFooter,
} from '../../../components/login';

export const DoctorLoginPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  return (
    <div className="relative min-h-screen w-full bg-cream text-navy antialiased overflow-hidden selection:bg-brand selection:text-white flex flex-col justify-between">
      {/* 1. Background Visual Graphics Layer */}
      <BackgroundLayer />

      {/* 2. Main Content Canvas */}
      <div className="relative z-10 w-full max-w-[1536px] mx-auto min-h-screen flex flex-col justify-between px-8 sm:px-12 lg:px-16 py-6 sm:py-8 lg:py-10">
        {/* Brand Header */}
        <BrandHeader />

        {/* Split Columns: Left (~55%) and Right (~40%) */}
        <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-6 lg:py-0">
          {/* Left Column (~55%) */}
          <section className="lg:col-span-7 flex flex-col justify-center max-w-[580px] lg:pr-4">
            <HeroSection />
            <FeatureCards />
          </section>

          {/* Right Column (~40%) */}
          <section className="lg:col-span-5 flex items-center justify-center lg:justify-end w-full relative">
            <LoginCard />
          </section>
        </main>

        {/* Page Footer */}
        <PageFooter />
      </div>
    </div>
  );
};
