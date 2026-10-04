import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Doctor Portal Application & Authentication', () => {
  it('Renders the doctor portal authentication view when unauthenticated', async () => {
    render(<App />);

    // Brand, title and security tags
    expect(screen.getAllByText(/MediKiosk/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Staff Portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Physician \/ Staff Sign In/i)).toBeInTheDocument();

    // Form inputs and action buttons
    expect(screen.getByLabelText(/Institutional Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Clinical Workspace/i })).toBeInTheDocument();
  });
});
