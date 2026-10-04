import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Doctor Portal Application Foundation', () => {
  it('Renders the doctor portal layout and clinical review dashboard components', () => {
    render(<App />);

    // Brand and header
    expect(screen.getByText(/MediKiosk/i)).toBeInTheDocument();
    expect(screen.getByText(/Doctor Review Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/OPD Consultation Queue & Case Reviews/i)).toBeInTheDocument();

    // Clinical provenance demonstration
    expect(screen.getByText(/Clinical Provenance & Explainability Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Chief Complaint/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Medication/i)).toBeInTheDocument();
  });
});
