import React from 'react';
import { WorkspaceAlertItem } from '../types/doctor-review.types';

interface AlertBannerProps {
  alerts?: WorkspaceAlertItem[];
  alertDisclaimer?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = () => {
  // Emergency triage alerts feature disabled per configuration
  return null;
};
