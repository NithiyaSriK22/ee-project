import { describe, it, expect } from 'vitest';
import { PatientsService } from '../src/modules/patients/patients.service.js';
import { ConsentTypes } from '../src/types/auth.types.js';

describe('Module 2 — Patient Profile & Completion Logic', () => {
  it('Should accurately calculate incomplete profile when required fields are missing', () => {
    const incompletePatient = {
      full_name: '',
      gender: '',
      contact_number: '',
    };
    const visitProfile = {
      preferred_language: 'ta',
      is_companion_assisted: false,
    };
    const consents: Array<{ consent_type: string; granted: boolean }> = [];

    const completion = PatientsService.calculateCompletion(incompletePatient as any, visitProfile, consents);

    expect(completion.isComplete).toBe(false);
    expect(completion.readyForInterview).toBe(false);
    expect(completion.missingFields).toContain('fullName');
    expect(completion.missingFields).toContain('gender');
    expect(completion.missingFields).toContain('contactNumber');
    expect(completion.missingFields).toContain('consent_VISIT_DATA_COLLECTION');
    expect(completion.completionPercentage).toBeLessThan(50);
  });

  it('Should mark profile complete when all required fields and consent are present', () => {
    const completePatient = {
      full_name: 'Rajesh Kumar',
      age: 48,
      gender: 'MALE',
      contact_number: '9876543210',
    };
    const visitProfile = {
      preferred_language: 'hi',
      is_companion_assisted: true,
      companion_name: 'Suresh Kumar (Son)',
    };
    const consents = [
      {
        consent_type: ConsentTypes.VISIT_DATA_COLLECTION,
        granted: true,
      },
    ];

    const completion = PatientsService.calculateCompletion(completePatient, visitProfile, consents);

    expect(completion.isComplete).toBe(true);
    expect(completion.readyForInterview).toBe(true);
    expect(completion.missingFields.length).toBe(0);
    expect(completion.completionPercentage).toBe(100);
  });

  it('Should require companion name when companion assisted is checked', () => {
    const assistedPatient = {
      full_name: 'Lakshmi Ammal',
      age: 72,
      gender: 'FEMALE',
      contact_number: '9841029384',
    };
    const visitProfileWithoutName = {
      preferred_language: 'ta',
      is_companion_assisted: true,
      companion_name: null,
    };
    const consents = [
      {
        consent_type: ConsentTypes.VISIT_DATA_COLLECTION,
        granted: true,
      },
    ];

    const completion = PatientsService.calculateCompletion(assistedPatient, visitProfileWithoutName, consents);

    expect(completion.isComplete).toBe(false);
    expect(completion.missingFields).toContain('companionName');
  });
});
