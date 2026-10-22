import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmBar } from '../features/doctor-review/components/ConfirmBar';
import { MustResolveCard } from '../features/doctor-review/components/MustResolveCard';
import { StatementRow } from '../features/doctor-review/components/StatementRow';
import { AlertBanner } from '../features/doctor-review/components/AlertBanner';
import {
  MustResolveItem,
  WorkspaceStatementItem,
  WorkspaceAlertItem,
} from '../features/doctor-review/types/doctor-review.types';

describe('Module 7 Doctor Review Frontend Components', () => {
  describe('ConfirmBar & Server-Gated Confirmation UI', () => {
    it('disables confirm button and indicates outstanding items when unresolvedCount > 0', () => {
      const mockConfirm = vi.fn();
      const items: MustResolveItem[] = [
        {
          itemRef: 'doc_field_allergy',
          itemType: 'DOCUMENT_FIELD',
          title: 'Unreadable Allergy Field',
          description: 'Allergy section was unreadable in prescription',
          sourceType: 'DOCUMENT',
          sourceRef: 'doc_1:allergy',
          sourceHash: 'hash1',
          isResolved: false,
        },
      ];

      render(
        <ConfirmBar
          unresolvedCount={1}
          mustResolveItems={items}
          passiveFlags={[]}
          attestationText="I verify all entries."
          attestationVersion="ATTEST-v1.0.0"
          isConfirming={false}
          onConfirm={mockConfirm}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /Confirm Locked/i });
      expect(confirmBtn).toBeDisabled();
      expect(screen.getByText(/1 critical item.*require your resolution/i)).toBeInTheDocument();
    });

    it('enables confirm button only when unresolvedCount is 0 AND attestation checkbox is checked', () => {
      const mockConfirm = vi.fn();

      render(
        <ConfirmBar
          unresolvedCount={0}
          mustResolveItems={[]}
          passiveFlags={[]}
          attestationText="I verify all clinical entries as treating physician."
          attestationVersion="ATTEST-v1.0.0"
          isConfirming={false}
          onConfirm={mockConfirm}
        />
      );

      // Initially disabled because attestation not checked
      const confirmBtn = screen.getByRole('button', { name: /Accept Attestation to Confirm/i });
      expect(confirmBtn).toBeDisabled();

      // Check attestation
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Now enabled
      const enabledBtn = screen.getByRole('button', { name: /Confirm & Sign Clinical Record/i });
      expect(enabledBtn).not.toBeDisabled();

      fireEvent.click(enabledBtn);
      expect(mockConfirm).toHaveBeenCalledWith(true);
    });
  });

  describe('MustResolveCard & Explicit Resolution Workflow', () => {
    it('requires explicit selection of resolution action and does not allow one-click dismiss', () => {
      const mockResolve = vi.fn();
      const item: MustResolveItem = {
        itemRef: 'mismatch_drug_2',
        itemType: 'DOCUMENT_FIELD',
        title: 'Mismatched Drug Dosage',
        description: 'Document extraction conflicts with formulary',
        sourceType: 'DOCUMENT',
        sourceRef: 'doc_1:drug_2',
        sourceHash: 'hash2',
        isResolved: false,
      };

      render(
        <MustResolveCard
          item={item}
          reviewId="rev_1"
          onResolve={mockResolve}
        />
      );

      expect(screen.getByText(/Mismatched Drug Dosage/i)).toBeInTheDocument();
      expect(screen.getByText('VERIFIED_AGAINST_SOURCE')).toBeInTheDocument();
      expect(screen.getByText('CORRECTED')).toBeInTheDocument();
      expect(screen.getByText('MARKED_NOT_AVAILABLE')).toBeInTheDocument();
      expect(screen.getByText('DEFER_TO_CONSULTATION')).toBeInTheDocument();

      // Click VERIFIED_AGAINST_SOURCE
      fireEvent.click(screen.getByText('VERIFIED_AGAINST_SOURCE'));
      fireEvent.click(screen.getByRole('button', { name: /Record Resolution/i }));

      expect(mockResolve).toHaveBeenCalledWith(
        'mismatch_drug_2',
        'VERIFIED_AGAINST_SOURCE',
        undefined,
        false
      );
    });
  });

  describe('StatementRow & Visual Distinction', () => {
    it('renders unconfirmed AI draft text with distinct badge and style', () => {
      const statement: WorkspaceStatementItem = {
        id: 'stmt_1',
        section: 'CHIEF_COMPLAINT',
        text: 'Patient reports productive cough for 5 days.',
        origin: 'MODEL',
        order: 1,
        sources: [{ sourceType: 'INTERVIEW', sourceRef: 'q1' }],
        isEdited: false,
        isDoctorAdded: false,
        isRemoved: false,
      };

      render(
        <StatementRow
          statement={statement}
          isSelected={false}
          onSelect={vi.fn()}
          onEdit={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText(/AI Draft — Not Confirmed/i)).toBeInTheDocument();
      expect(screen.getByText('Patient reports productive cough for 5 days.')).toBeInTheDocument();
    });

    it('renders placeholder with distinct warning label', () => {
      const statement: WorkspaceStatementItem = {
        id: 'stmt_placeholder',
        section: 'MEDICATIONS_AND_ALLERGIES',
        text: '[Illegible in original — verify manually]',
        origin: 'CODE_TEMPLATE',
        order: 2,
        sources: [{ sourceType: 'DOCUMENT', sourceRef: 'doc_1:allergy' }],
        isEdited: false,
        isDoctorAdded: false,
        isRemoved: false,
      };

      render(
        <StatementRow
          statement={statement}
          isSelected={false}
          onSelect={vi.fn()}
          onEdit={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText(/Placeholder — Verify Manually/i)).toBeInTheDocument();
    });
  });

  describe('AlertBanner & Safety Disclaimer', () => {
    it('displays active emergency red-flag alert and safety disclaimer', () => {
      const alerts: WorkspaceAlertItem[] = [
        {
          id: 'alert_1',
          severityTier: 'IMMEDIATE',
          status: 'OPEN',
          kioskLocation: 'Kiosk-1',
          ruleCode: 'CHEST_PAIN_DIAPHORESIS',
          raisedAt: new Date().toISOString(),
        },
      ];

      render(
        <AlertBanner
          alerts={alerts}
          alertDisclaimer="Clinical judgment takes priority over automated decision support."
        />
      );

      expect(screen.getByText(/IMMEDIATE RED-FLAG ALERT/i)).toBeInTheDocument();
      expect(screen.getByText(/Unacknowledged/i)).toBeInTheDocument();
      expect(screen.getByText(/Clinical judgment takes priority/i)).toBeInTheDocument();
    });
  });
});
