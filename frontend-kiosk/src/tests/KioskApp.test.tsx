import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('Kiosk Application Foundation', () => {
  it('Renders the THUNAI brand header and welcoming intake cards', () => {
    render(<App />);

    // Brand and subtitle
    expect(screen.getAllByText(/THUNAI/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Self Intake \(Patient\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Companion \/ Staff Assisted/i)).toBeInTheDocument();

    // Accessibility controls present (Module 8 Accessibility Modes)
    const a11yButton = screen.getByText(/Accessibility Modes/i);
    expect(a11yButton).toBeInTheDocument();

    // P3.1 Remote Mobile Patient Entry Callout present on homepage
    expect(screen.getByText(/Prefer Using Your Own Smartphone\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Mobile Portal/i)).toBeInTheDocument();
  });

  it('Renders the standalone remote mobile patient portal entry view', () => {
    window.history.pushState({}, 'Remote Patient Portal', '/portal');
    render(<App />);

    expect(screen.getByText(/Patient Portal Entry/i)).toBeInTheDocument();
    expect(screen.getByText(/Returning Patient \(UHID\)/i)).toBeInTheDocument();
    expect(screen.getByText(/New Patient Registration/i)).toBeInTheDocument();
    expect(screen.getByText(/Access Patient Portal/i)).toBeInTheDocument();
  });

  it('Switches fully between English and Tamil with zero language mixing', async () => {
    window.history.pushState({}, 'Kiosk Home', '/');
    render(<App />);

    // Initially in English
    expect(screen.getByText('Guide')).toBeInTheDocument();
    expect(screen.getByText('I Need Help')).toBeInTheDocument();
    expect(screen.getByText('Accessibility Modes')).toBeInTheDocument();
    expect(screen.queryByText('வழிகாட்டி')).not.toBeInTheDocument();
    expect(screen.queryByText('உதவி தேவை')).not.toBeInTheDocument();

    // Toggle to Tamil
    const tamilButton = screen.getByRole('button', { name: 'தமிழ்' });
    fireEvent.click(tamilButton);

    // Should now show pure Tamil
    expect(screen.getByText('வழிகாட்டி')).toBeInTheDocument();
    expect(screen.getByText('உதவி தேவை')).toBeInTheDocument();
    expect(screen.getByText('அணுகல்தன்மை முறைகள்')).toBeInTheDocument();
    expect(screen.queryByText('Guide')).not.toBeInTheDocument();
    expect(screen.queryByText('I Need Help')).not.toBeInTheDocument();
    expect(screen.queryByText('Accessibility Modes')).not.toBeInTheDocument();
  });

  it('Renders registration steps in 100% English and switches to 100% Tamil without mixing', () => {
    window.history.pushState({}, 'Registration', '/register');
    render(<App />);

    // In English
    expect(screen.getByText('1. Welcome')).toBeInTheDocument();
    expect(screen.getByText('2. Identity')).toBeInTheDocument();
    expect(screen.getByText('3. Language')).toBeInTheDocument();
    expect(screen.getByText('4. Consent')).toBeInTheDocument();
    expect(screen.getByText('5. Ready')).toBeInTheDocument();
    expect(screen.getByText('New Patient')).toBeInTheDocument();
    expect(screen.getByText('Returning Patient')).toBeInTheDocument();

    // Toggle to Tamil
    const tamilButton = screen.getByRole('button', { name: 'தமிழ்' });
    fireEvent.click(tamilButton);

    // In Tamil
    expect(screen.getByText('1. வரவேற்பு')).toBeInTheDocument();
    expect(screen.getByText('2. அடையாளம்')).toBeInTheDocument();
    expect(screen.getByText('3. மொழி')).toBeInTheDocument();
    expect(screen.getByText('4. ஒப்புதல்')).toBeInTheDocument();
    expect(screen.getByText('5. தயார்')).toBeInTheDocument();
    expect(screen.getByText('புதிய நோயாளி')).toBeInTheDocument();
    expect(screen.getByText('ஏற்கனவே பதிவு செய்தவர்')).toBeInTheDocument();

    // English strings must be completely gone
    expect(screen.queryByText('1. Welcome')).not.toBeInTheDocument();
    expect(screen.queryByText('New Patient')).not.toBeInTheDocument();
    expect(screen.queryByText('Returning Patient')).not.toBeInTheDocument();
  });
});
