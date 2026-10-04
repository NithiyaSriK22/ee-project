import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
      <div className="text-8xl font-extrabold text-sky-600 mb-4">404</div>
      <h1 className="text-kiosk-2xl font-bold text-slate-900 mb-3">Page Not Found</h1>
      <p className="text-kiosk-base text-slate-600 max-w-md mb-8">
        The kiosk screen you requested does not exist or has moved.
      </p>
      <Button
        variant="primary"
        size="kiosk-touch"
        onClick={() => navigate('/')}
        leftIcon={<Home className="w-6 h-6" />}
      >
        Return to Home Screen
      </Button>
    </div>
  );
};
