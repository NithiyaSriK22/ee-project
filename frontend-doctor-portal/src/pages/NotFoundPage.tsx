import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <div className="text-6xl font-bold text-teal-700 mb-3">404</div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">Clinical Portal Page Not Found</h1>
      <p className="text-sm text-slate-600 max-w-md mb-6">
        The requested clinical dashboard route is not available.
      </p>
      <Button
        variant="primary"
        onClick={() => navigate('/')}
        leftIcon={<Home className="w-4 h-4" />}
      >
        Back to Dashboard
      </Button>
    </div>
  );
};
