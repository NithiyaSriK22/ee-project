import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Doctor Portal Application & Authentication', () => {
  it('Renders the doctor portal authentication view when unauthenticated', async () => {
    render(<App />);

    // Brand, title and security tags
    expect(screen.getAllByText(/MEDBRIEF/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();

    // Form inputs and action buttons with placeholders
    const emailInput = screen.getByLabelText(/^Email Address$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('placeholder', 'Enter your email address');
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
    expect(screen.getByRole('button', { name: /Sign In to Clinical Workspace/i })).toBeInTheDocument();

    // Verify Google and Microsoft SSO buttons and divider are absent
    expect(screen.queryByText(/OR SIGN IN WITH/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Microsoft/i })).not.toBeInTheDocument();

    // Verify Sign Up link is present and Request Pro Demo is removed
    const signUpBtn = screen.getByRole('button', { name: /Sign Up/i });
    expect(signUpBtn).toBeInTheDocument();
    expect(screen.queryByText(/Request Pro Demo/i)).not.toBeInTheDocument();
  });

  it('Renders the doctor registration view with empty inputs and correct placeholders', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<App />);

    // Switch to registration mode
    const signUpBtn = screen.getByRole('button', { name: /Sign Up/i });
    fireEvent.click(signUpBtn);

    // Verify mode heading
    expect(screen.getByText(/Doctor Registration/i)).toBeInTheDocument();

    // Check all inputs start empty and have correct placeholders
    const fullNameInput = screen.getByPlaceholderText('Enter your full name');
    expect(fullNameInput).toBeInTheDocument();
    expect(fullNameInput).toHaveValue('');

    const emailInput = screen.getByPlaceholderText('Enter your email address');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveValue('');

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveValue('');

    const confirmPasswordInput = screen.getByPlaceholderText('Re-enter your password');
    expect(confirmPasswordInput).toBeInTheDocument();
    expect(confirmPasswordInput).toHaveValue('');

    const medRegInput = screen.getByPlaceholderText('Enter your medical registration number');
    expect(medRegInput).toBeInTheDocument();
    expect(medRegInput).toHaveValue('');

    const specSelect = screen.getByLabelText(/Specialization \*/i);
    expect(specSelect).toBeInTheDocument();
    expect(specSelect).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Select your specialization' })).toBeInTheDocument();

    const qualInput = screen.getByPlaceholderText('Enter your qualifications (e.g., MBBS, MD)');
    expect(qualInput).toBeInTheDocument();
    expect(qualInput).toHaveValue('');

    expect(screen.getByText('Experience (Years)')).toBeInTheDocument();
    const expInput = screen.getByPlaceholderText('Enter your years of experience');
    expect(expInput).toBeInTheDocument();
    expect(expInput).toHaveValue(null); // empty number input

    const hospInput = screen.getByPlaceholderText('Enter your hospital or clinic name');
    expect(hospInput).toBeInTheDocument();
    expect(hospInput).toHaveValue('');

    // Verify Generate Short Email button
    expect(screen.getByRole('button', { name: /Generate Short Email/i })).toBeInTheDocument();

    // Verify submit button
    expect(screen.getByRole('button', { name: /Complete Doctor Registration/i })).toBeInTheDocument();
  });
});
