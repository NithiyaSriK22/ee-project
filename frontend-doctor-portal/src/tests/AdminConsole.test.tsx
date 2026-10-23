import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminShell } from '../features/admin/AdminShell';

// Mock useAuth
vi.mock('../features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_admin_1',
      fullName: 'Chief Medical Administrator',
      role: 'SUPER_ADMIN',
      email: 'admin@hospital.org',
    },
    isAuthenticated: true,
  }),
}));

// Mock adminConsoleApi
vi.mock('../features/admin/api/admin-console.api', () => ({
  adminConsoleApi: {
    getMetricsCatalog: vi.fn().mockResolvedValue([
      {
        metricKey: 'kiosk_intake_total',
        category: 'OPERATIONS',
        name: 'Total Patient Intakes Started',
        description: 'Count of patient intake flows started at kiosk',
        unit: 'count',
        isPilotPrimary: true,
      },
      {
        metricKey: 'doc_ocr_latency_ms',
        category: 'DOCUMENTS',
        name: 'Median OCR Processing Latency',
        description: 'Median latency from upload to OCR completion',
        unit: 'ms',
      },
    ]),
    getOperationsOverview: vi.fn().mockResolvedValue({
      metrics: {
        visitsStarted: { value: 1420, isSuppressed: false, displayValue: '1420' },
        visitsCompleted: { value: 1390, isSuppressed: false, displayValue: '1390' },
        interviewCompletionRate: { value: 97.8, isSuppressed: false, displayValue: '97.8%' },
        intakeDuration: { medianSeconds: 285, p90Seconds: 420 },
        summaries: { fallbackRatePercent: 4.2, llmMode: 958, fallbackMode: 42 },
        clinicalReviews: { opened: 1400, confirmed: 1390, medianDurationSeconds: 94 },
        triageAlerts: { raised: 42, medianAckTimeSeconds: 34 },
        kiosks: { online: 12, total: 12, offline: 0 },
      },
    }),
    getIntakeAnalytics: vi.fn().mockResolvedValue({
      hourlyDistribution: [{ hour: 9, count: 120 }],
      completionRate: 98.2,
      companionAssistedRate: 34.5,
      abandonmentRate: 1.8,
      abandonmentByStep: [{ step: 'ALLERGIES', count: 8 }],
      medianDurationSeconds: 280,
    }),
    getLanguageVoiceAnalytics: vi.fn().mockResolvedValue({
      languageDistribution: [
        { language: 'en', count: 800, percentage: 56.3 },
        { language: 'hi', count: 500, percentage: 35.2 },
      ],
      voiceInteraction: {
        voiceInputUsagePercentage: 42.1,
        fallbackToTouchCount: 38,
        fallbackRatePercentage: 6.4,
      },
      accessibilityUsage: {
        highContrastCount: 45,
        largeFontCount: 110,
        screenReaderCount: 12,
      },
    }),
    getDocumentsAnalytics: vi.fn().mockResolvedValue({
      uploadedByType: [{ type: 'PRESCRIPTION', count: 450 }],
      ocrPerformance: {
        medianProcessingTimeMs: 420,
        p95ProcessingTimeMs: 890,
        completedCount: 520,
      },
      fieldVerificationDistribution: {
        verifiedCount: 1800,
        flaggedCount: 45,
      },
      formularyVersionInUse: 'NLEM-2022-v3',
      documentsNeedingPhysicianReviewPercent: 12.4,
    }),
    getSummariesReviewAnalytics: vi.fn().mockResolvedValue({
      generationMetrics: {
        medianGenerationTimeMs: 310,
        totalGenerated: 1400,
        generationFailureRate: 0.1,
      },
      reviewOutcomes: {
        acceptedUnchanged: 820,
        acceptedWithEdits: 560,
        rejectedRedone: 20,
      },
      medianReviewTimeSeconds: 92,
      mustResolveResolvedRate: 100,
      activePromptVersion: 'SUMM-CLINICAL-v2.1',
    }),
    getAlertsOperationsMetrics: vi.fn().mockResolvedValue({
      totalAlerts: 42,
      deliveryLatency: {
        p50Ms: 120,
        p95Ms: 280,
        maxMs: 650,
      },
      unacknowledgedAlerts: 0,
      acknowledgmentLatency: {
        medianSeconds: 34,
        p95Seconds: 110,
      },
      ruleBreakdown: [{ ruleCode: 'RULE-CHEST-PAIN-01', count: 18 }],
    }),
    getAuditLogs: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'aud_1',
          sequenceNumber: 1,
          timestamp: '2026-10-23T04:00:00Z',
          action: 'DOCTOR_REVIEW_CONFIRMED',
          actorType: 'DOCTOR',
          actorId: 'doc_1',
          targetEntity: 'VISIT',
          targetId: 'v_101',
          result: 'SUCCESS',
          recordHash: 'a1b2c3d4e5f6',
        },
      ],
      total: 1,
    }),
    getAccessReports: vi.fn().mockResolvedValue({
      reportItems: [
        {
          id: 'acc_1',
          anomalyType: 'AFTER_HOURS_ACCESS',
          description: 'Access outside clinical hours (23:15 IST)',
          actorId: 'doc_night_1',
          department: 'EMERGENCY',
          timestamp: '2026-10-22T23:15:00Z',
        },
      ],
      summary: {
        outOfQueueCount: 0,
        crossDepartmentCount: 2,
        reviewTakeoversCount: 1,
        afterHoursCount: 1,
      },
    }),
    getSystemHealth: vi.fn().mockResolvedValue({
      overallStatus: 'HEALTHY',
      components: [
        {
          component: 'DATABASE_POSTGRESQL',
          status: 'HEALTHY',
          latencyMs: 8,
          details: 'Connected to primary read-write cluster',
        },
        {
          component: 'AUDIT_CHAIN_INTEGRITY',
          status: 'HEALTHY',
          latencyMs: 14,
          details: 'Continuous cryptographic hash chain verified intact',
        },
      ],
      checkedAt: '2026-10-23T04:00:00Z',
    }),
    getKioskFleet: vi.fn().mockResolvedValue({
      devices: [
        {
          deviceId: 'KIOSK-01',
          department: 'MAIN_OPD',
          status: 'ONLINE',
          appVersion: '2.4.0',
          lastHeartbeat: '2026-10-23T04:05:00Z',
          peripherals: {
            camera: 'OK',
            microphone: 'OK',
            printer: 'OK',
            touchscreen: 'OK',
          },
        },
      ],
      summary: {
        totalDevices: 1,
        onlineCount: 1,
        offlineCount: 0,
      },
    }),
    getReports: vi.fn().mockResolvedValue({
      reportRuns: [
        {
          id: 'rep_1',
          reportType: 'MONTHLY_OPERATIONS',
          dateRangePreset: '30days',
          createdAt: '2026-10-23T01:00:00Z',
          rowCount: 45,
          downloadUrl: '/api/v1/admin/reports/rep_1/download',
        },
      ],
      exportJobs: [],
    }),
    getRetentionSettings: vi.fn().mockResolvedValue({
      settings: [
        {
          key: 'AUDIT_LOG_RETENTION_DAYS',
          valueDays: 2555,
          category: 'AUDIT',
          governanceNotice: 'Statutory compliance retention (7 years)',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      legalHolds: [],
    }),
    getPilotBaselines: vi.fn().mockResolvedValue({
      baselines: [
        {
          id: 'base_1',
          metricKey: 'review_duration',
          baselineValue: 300,
          unit: 'seconds',
          sourceDescription: 'Pre-deployment time-motion study (50 visits)',
          recordedAt: '2026-08-01T00:00:00Z',
        },
      ],
      evaluationNotice: 'Section 26 measurement framework. "Time saved" claims are forbidden without a verified, documented pre-deployment baseline.',
    }),
    verifyAuditChain: vi.fn().mockResolvedValue({
      isValid: true,
      recordsChecked: 150,
      message: 'Cryptographic hash chain is valid and verified intact.',
    }),
  },
}));

describe('Module 9 Administration, Analytics, Audit & Monitoring Console', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('renders the Admin Console header, timezone indicator, and date presets', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminShell />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Administration, Analytics & System Monitoring/i)).toBeInTheDocument();
    expect(screen.getByText(/Asia\/Kolkata \(IST\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Small-Group Suppression Active/i)).toBeInTheDocument();

    // Presets
    expect(screen.getByRole('button', { name: /^Today$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^7D$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^30D$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^90D$/i })).toBeInTheDocument();
  });

  it('renders and switches between administration tabs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminShell />
      </QueryClientProvider>
    );

    // Initial tab is Overview
    await waitFor(() => {
      expect(screen.getAllByText(/Visits Started/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/1420/i).length).toBeGreaterThan(0);
    });

    // Switch to System Health tab
    const healthTab = screen.getByRole('button', { name: /System Health/i });
    fireEvent.click(healthTab);

    await waitFor(() => {
      expect(screen.getByText(/Platform Subsystem Health Monitoring/i)).toBeInTheDocument();
      expect(screen.getByText(/DATABASE POSTGRESQL/i)).toBeInTheDocument();
    });

    // Switch to Audit Trail tab
    const auditTab = screen.getByRole('button', { name: /Audit Trail/i });
    fireEvent.click(auditTab);

    await waitFor(() => {
      expect(screen.getByText(/Tamper-Evident Audit Trail/i)).toBeInTheDocument();
    });
  });

  it('opens the Metric Catalog drawer and displays metric definitions', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminShell />
      </QueryClientProvider>
    );

    const catalogButton = screen.getByRole('button', { name: /Metric Catalog/i });
    fireEvent.click(catalogButton);

    await waitFor(() => {
      expect(screen.getByText(/Central Metric Catalog/i)).toBeInTheDocument();
      expect(screen.getAllByText(/visit_started/i).length).toBeGreaterThan(0);
    });
  });

  it('renders the Pilot Evaluation view with honest baseline notice and no unverified claims', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AdminShell />
      </QueryClientProvider>
    );

    const pilotTab = screen.getByRole('button', { name: /Pilot Evaluation/i });
    fireEvent.click(pilotTab);

    await waitFor(() => {
      expect(screen.getByText(/Honest Pilot Evaluation & Documented Baselines/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Section 26 measurement framework/i).length).toBeGreaterThan(0);
    });
  });
});
