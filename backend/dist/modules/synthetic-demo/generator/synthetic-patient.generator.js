"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyntheticPatientGenerator = void 0;
const prng_js_1 = require("./prng.js");
const NAME_DICTIONARIES = [
    {
        language: 'en',
        firstNamesMale: ['David', 'James', 'Michael', 'Robert', 'John', 'William'],
        firstNamesFemale: ['Sarah', 'Emily', 'Rachel', 'Jessica', 'Amanda', 'Laura'],
        lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller'],
    },
    {
        language: 'hi',
        firstNamesMale: ['Aarav', 'Vihaan', 'Aditya', 'Rohan', 'Kabir', 'Aryan', 'Ishaan'],
        firstNamesFemale: ['Ananya', 'Diya', 'Ishita', 'Pooja', 'Neha', 'Kavya', 'Saanvi'],
        lastNames: ['Sharma', 'Verma', 'Gupta', 'Singh', 'Malhotra', 'Mehta', 'Chopra'],
    },
    {
        language: 'ta',
        firstNamesMale: ['Karthik', 'Murugan', 'Saravanan', 'Arun', 'Senthil', 'Vijay', 'Muthu'],
        firstNamesFemale: ['Priya', 'Lakshmi', 'Meenakshi', 'Deepa', 'Revathi', 'Kavitha'],
        lastNames: ['Sundaram', 'Ramaswamy', 'Natarajan', 'Subramanian', 'Krishnan', 'Pillai'],
    },
    {
        language: 'te',
        firstNamesMale: ['Srinivas', 'Chaitanya', 'Venkat', 'Kalyan', 'Naresh', 'Prasad'],
        firstNamesFemale: ['Sravani', 'Bhavani', 'Sirisha', 'Swathi', 'Anuradha', 'Pallavi'],
        lastNames: ['Rao', 'Reddy', 'Chowdary', 'Varma', 'Naidu', 'Sastry'],
    },
    {
        language: 'mr',
        firstNamesMale: ['Sachin', 'Amol', 'Makarand', 'Sanjay', 'Ganesh', 'Prashant'],
        firstNamesFemale: ['Gauri', 'Aparna', 'Snehal', 'Prajakta', 'Madhuri', 'Ashwini'],
        lastNames: ['Deshmukh', 'Kulkarni', 'Patil', 'Jadhav', 'Shinde', 'Gaikwad'],
    },
    {
        language: 'bn',
        firstNamesMale: ['Sourav', 'Subhash', 'Debabrata', 'Anirban', 'Prasenjit', 'Amit'],
        firstNamesFemale: ['Moumita', 'Debjani', 'Sharmila', 'Madhulika', 'Ruma', 'Soma'],
        lastNames: ['Banerjee', 'Chatterjee', 'Mukherjee', 'Bose', 'Dutta', 'Sengupta'],
    },
];
const DEPARTMENTS = [
    { code: 'GENMED', name: 'General Medicine' },
    { code: 'PEDIATRICS', name: 'Pediatrics' },
    { code: 'CARDIOLOGY', name: 'Cardiology' },
    { code: 'ORTHOPEDICS', name: 'Orthopedics' },
    { code: 'ENT', name: 'Otorhinolaryngology (ENT)' },
    { code: 'DERMATOLOGY', name: 'Dermatology' },
];
class SyntheticPatientGenerator {
    static RESERVED_PREFIX = 'SYN-HRN-';
    /**
     * Generates a deterministic synthetic patient based on a seed.
     */
    static generatePatient(seed = 1001, persona = 'normal_adult') {
        const prng = new prng_js_1.SeededPRNG(seed);
        // Pick language and name dictionary
        const dict = prng.pickOne(NAME_DICTIONARIES);
        const gender = prng.pickWeighted(['MALE', 'FEMALE'], [50, 50]);
        const firstName = gender === 'MALE' ? prng.pickOne(dict.firstNamesMale) : prng.pickOne(dict.firstNamesFemale);
        const lastName = prng.pickOne(dict.lastNames);
        const fullName = `${firstName} ${lastName}`;
        // Age distribution depending on persona
        let age;
        if (persona === 'pediatric_minor') {
            age = prng.nextInt(3, 11);
        }
        else if (persona === 'surrogate_incapacitated' || persona === 'companion_assisted') {
            age = prng.nextInt(68, 85);
        }
        else {
            age = prng.nextInt(22, 64);
        }
        const birthYear = 2026 - age;
        const birthMonth = String(prng.nextInt(1, 12)).padStart(2, '0');
        const birthDay = String(prng.nextInt(1, 28)).padStart(2, '0');
        const dateOfBirth = `${birthYear}-${birthMonth}-${birthDay}`;
        // Synthetic registration number using reserved prefix
        const regNumberSuffix = String(prng.nextInt(100000, 999999));
        const hospitalRegistrationNumber = `${this.RESERVED_PREFIX}${regNumberSuffix}`;
        // Reserved non-routable synthetic contact phone
        const contactSuffix = String(prng.nextInt(100000, 999999));
        const contactNumber = `+9199999${contactSuffix.slice(0, 5)}`;
        return {
            id: `syn_pat_${seed}_${regNumberSuffix}`,
            hospitalRegistrationNumber,
            fullName,
            preferredLanguage: dict.language,
            dateOfBirth,
            age,
            gender,
            contactNumber,
            isSynthetic: true,
            provenance: 'SYNTHETIC_GENERATOR',
            seed,
            persona,
        };
    }
    /**
     * Generates a synthetic visit tied to a synthetic patient.
     */
    static generateVisit(patient, seed = 2001, identityState = 'CONFIRMED') {
        const prng = new prng_js_1.SeededPRNG(seed);
        const dept = prng.pickOne(DEPARTMENTS);
        const tokenIndex = prng.nextInt(1, 99);
        const tokenNumber = `${dept.code}-${String(tokenIndex).padStart(2, '0')}`;
        return {
            visitId: `vis_syn_${patient.seed}_${prng.nextInt(1000, 9999)}`,
            patientId: patient.id,
            tokenNumber,
            departmentCode: dept.code,
            departmentName: dept.name,
            status: 'INTAKE_IN_PROGRESS',
            identityState,
            isSynthetic: true,
            createdAt: new Date().toISOString(),
        };
    }
    /**
     * Batch generator for synthetic cohorts.
     */
    static generateCohort(count = 10, startingSeed = 1000, personaFilter) {
        const cohort = [];
        const personas = [
            'normal_adult',
            'declines_intake',
            'skips_optional',
            'contradictory',
            'companion_assisted',
            'pediatric_minor',
            'surrogate_incapacitated',
            'sensitive_mental_health',
        ];
        for (let i = 0; i < count; i++) {
            const seed = startingSeed + i;
            const persona = personaFilter || personas[i % personas.length];
            const patient = this.generatePatient(seed, persona);
            const visit = this.generateVisit(patient, seed + 5000);
            cohort.push({ patient, visit });
        }
        return cohort;
    }
}
exports.SyntheticPatientGenerator = SyntheticPatientGenerator;
