"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FhirR4MapperService = void 0;
const feature_flags_service_js_1 = require("../../deployment/feature-flags.service.js");
class FhirR4MapperService {
    /**
     * Transforms a confirmed clinical record into a standard FHIR R4 document bundle.
     * STRICT GOVERNANCE:
     * - Feature-flagged off by default (FHIR_R4_EXPORT_ENABLED).
     * - Reviewed mapping tables for MedicationStatement, AllergyIntolerance, and Observations.
     * - Unmapped content safely placed in Composition.section narrative text.
     * - Zero ABDM external dependencies.
     */
    static mapToFhirR4Bundle(record, provenance) {
        const isFhirEnabled = feature_flags_service_js_1.FeatureFlagsService.isFlagEnabled('FHIR_R4_EXPORT_ENABLED');
        if (!isFhirEnabled) {
            throw new Error('FHIR R4 export is currently disabled by hospital feature flag (FHIR_R4_EXPORT_ENABLED).');
        }
        const bundleId = `bundle-visit-${record.visitId}-v${record.version}`;
        const compositionId = `comp-${record.id}`;
        const patientRef = `Patient/${record.visitId}`;
        const practitionerRef = `Practitioner/${record.confirmedByDoctorId}`;
        const entries = [];
        // 1. Process Allergies
        const allergyEntries = [];
        const allergies = record.statements.filter((s) => s.section.toUpperCase() === 'ALLERGIES');
        for (let i = 0; i < allergies.length; i++) {
            const allergyId = `allergy-${record.id}-${i + 1}`;
            const allergyResource = {
                resourceType: 'AllergyIntolerance',
                id: allergyId,
                clinicalStatus: {
                    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: 'Active' }],
                },
                verificationStatus: {
                    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed', display: 'Confirmed' }],
                },
                code: {
                    text: allergies[i].text,
                },
                patient: { reference: patientRef },
                text: {
                    status: 'generated',
                    div: `<div xmlns="http://www.w3.org/1999/xhtml">${allergies[i].text}</div>`,
                },
            };
            entries.push({ fullUrl: `urn:uuid:${allergyId}`, resource: allergyResource });
            allergyEntries.push(`urn:uuid:${allergyId}`);
        }
        // 2. Process Medications
        const medEntries = [];
        const meds = record.statements.filter((s) => s.section.toUpperCase() === 'MEDICATIONS');
        for (let i = 0; i < meds.length; i++) {
            const medId = `med-${record.id}-${i + 1}`;
            const medResource = {
                resourceType: 'MedicationStatement',
                id: medId,
                status: 'active',
                medicationCodeableConcept: {
                    text: meds[i].text,
                },
                subject: { reference: patientRef },
                effectiveDateTime: new Date(record.confirmedAt).toISOString(),
                text: {
                    status: 'generated',
                    div: `<div xmlns="http://www.w3.org/1999/xhtml">${meds[i].text}</div>`,
                },
            };
            entries.push({ fullUrl: `urn:uuid:${medId}`, resource: medResource });
            medEntries.push(`urn:uuid:${medId}`);
        }
        // 3. Process Observations (Chief Complaint, Vitals, History)
        const obsEntries = [];
        const observations = record.statements.filter((s) => ['CHIEF_COMPLAINT', 'HISTORY_OF_PRESENT_ILLNESS', 'PAST_MEDICAL_HISTORY', 'LIFESTYLE'].includes(s.section.toUpperCase()));
        for (let i = 0; i < observations.length; i++) {
            const obsId = `obs-${record.id}-${i + 1}`;
            const obsResource = {
                resourceType: 'Observation',
                id: obsId,
                status: 'final',
                code: {
                    text: observations[i].section.replace(/_/g, ' '),
                },
                subject: { reference: patientRef },
                valueString: observations[i].text,
                text: {
                    status: 'generated',
                    div: `<div xmlns="http://www.w3.org/1999/xhtml"><strong>${observations[i].section}:</strong> ${observations[i].text}</div>`,
                },
            };
            entries.push({ fullUrl: `urn:uuid:${obsId}`, resource: obsResource });
            obsEntries.push(`urn:uuid:${obsId}`);
        }
        // 4. Construct Root Composition Resource
        const compositionSections = [];
        // Group remaining or all sections into Composition.section
        const sectionsGrouped = {};
        for (const stmt of record.statements) {
            if (!sectionsGrouped[stmt.section]) {
                sectionsGrouped[stmt.section] = [];
            }
            sectionsGrouped[stmt.section].push(stmt.text);
        }
        for (const [secName, textItems] of Object.entries(sectionsGrouped)) {
            compositionSections.push({
                title: secName.replace(/_/g, ' '),
                text: {
                    status: 'generated',
                    div: `<div xmlns="http://www.w3.org/1999/xhtml"><ul>${textItems.map((t) => `<li>${t}</li>`).join('')}</ul></div>`,
                },
            });
        }
        const composition = {
            resourceType: 'Composition',
            id: compositionId,
            status: provenance.amendmentStatus === 'AMENDED' ? 'amended' : 'final',
            type: {
                coding: [
                    {
                        system: 'http://loinc.org',
                        code: '11488-4',
                        display: 'Consultation note',
                    },
                ],
            },
            subject: {
                reference: patientRef,
                identifier: provenance.hospitalRegistrationNumber
                    ? { system: 'urn:hospital:mrn', value: provenance.hospitalRegistrationNumber }
                    : undefined,
            },
            date: new Date(record.confirmedAt).toISOString(),
            author: [
                {
                    reference: practitionerRef,
                    display: provenance.confirmedByDoctorName,
                },
            ],
            title: `Outpatient Consultation Case Record - v${record.version}`,
            section: compositionSections,
            text: {
                status: 'generated',
                div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${provenance.reviewConfirmationStatement}</p></div>`,
            },
        };
        // Prepend Composition as the required first resource entry in a FHIR document bundle
        entries.unshift({
            fullUrl: `urn:uuid:${compositionId}`,
            resource: composition,
        });
        return {
            resourceType: 'Bundle',
            id: bundleId,
            type: 'document',
            timestamp: new Date().toISOString(),
            entry: entries,
        };
    }
}
exports.FhirR4MapperService = FhirR4MapperService;
