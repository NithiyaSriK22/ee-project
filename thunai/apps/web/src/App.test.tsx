import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { App } from './App';

describe('Thunai Web Client Shell', () => {
  it('renders Thunai title, Tamil name, and tagline', () => {
    // Mock fetch for health and scenarios
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url === '/api/health') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'HEALTHY' }),
        });
      }
      if (url === '/api/demo/scenarios') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ scenarios: [] }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    }));

    render(<App />);

    const thunaiElements = screen.getAllByText(/Thunai/i);
    expect(thunaiElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/The companion before the doctor/i)).toBeDefined();
    expect(screen.getByText(/HACKATHON DEMO SLICE/i)).toBeDefined();
    expect(screen.getByText(/Scenario A: Routine/i)).toBeDefined();
    expect(screen.getByText(/Scenario B: Gate Errors/i)).toBeDefined();
    expect(screen.getByText(/Scenario C: Red Flag/i)).toBeDefined();
  });
});
