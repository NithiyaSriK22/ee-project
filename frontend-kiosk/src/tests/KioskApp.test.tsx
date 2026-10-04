import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Kiosk Application Foundation', () => {
  it('Renders the MediKiosk brand header and welcoming intake cards', () => {
    render(<App />);

    // Brand and subtitle
    expect(screen.getAllByText(/MediKiosk/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Self Intake \(Patient\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Companion \/ Staff Assisted/i)).toBeInTheDocument();

    // Accessibility controls present
    expect(screen.getByText(/High Contrast/i)).toBeInTheDocument();
    expect(screen.getByText(/Larger Text/i)).toBeInTheDocument();
  });
});
