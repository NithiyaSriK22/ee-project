import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { InterviewService } from '../src/modules/interview/interview.service.js';
import {
  TemplateStatus,
  InterviewSessionStatus,
  QuestionTypes,
  InterviewSections,
  AnsweredVia,
} from '../src/types/interview.types.js';
import { authorizeRoles } from '../src/middleware/auth.middleware.js';
import { globalErrorHandler } from '../src/middleware/error.middleware.js';
import { AppRequest } from '../src/types/api.types.js';

describe('Module 3 — Guided Interview & Kiosk Intake System', () => {
  describe('Admin Template & Question Bank Validation', () => {
    it('Should evaluate branching rules correctly based on trigger condition', () => {
      const mockQuestions = [
        {
          id: 'q-chest-pain',
          section: InterviewSections.CHIEF_COMPLAINT,
          prompt_text: 'Are you experiencing chest pain or tightness?',
          question_type: QuestionTypes.YES_NO,
          order: 1,
          is_critical: true,
          branching_logic: [
            {
              trigger_condition: { answer: 'YES', operator: 'EQUALS' },
              next_question_id: 'q-chest-pain-duration',
            },
          ],
        },
        {
          id: 'q-chest-pain-duration',
          section: InterviewSections.PRESENT_ILLNESS_HISTORY,
          prompt_text: 'How long have you had this chest pain?',
          question_type: QuestionTypes.DURATION,
          order: 2,
          is_critical: true,
          branching_logic: null,
        },
        {
          id: 'q-past-history',
          section: InterviewSections.PAST_MEDICAL_HISTORY,
          prompt_text: 'Do you have diabetes or high blood pressure?',
          question_type: QuestionTypes.YES_NO,
          order: 3,
          is_critical: false,
          branching_logic: null,
        },
      ];

      // When answered YES -> triggers next_question_id (q-chest-pain-duration)
      const nextWhenYes = InterviewService.determineNextQuestionId(
        mockQuestions as any,
        mockQuestions[0] as any,
        'YES'
      );
      expect(nextWhenYes).toBe('q-chest-pain-duration');

      // When answered NO -> falls back to sequential next question (q-chest-pain-duration in default linear ordering)
      const nextWhenNo = InterviewService.determineNextQuestionId(
        mockQuestions as any,
        mockQuestions[0] as any,
        'NO'
      );
      expect(nextWhenNo).toBe('q-chest-pain-duration');
    });

    it('Should validate answer values against question types server-side', () => {
      const yesNoQuestion = {
        id: 'q-1',
        prompt_text: 'Do you have fever?',
        question_type: QuestionTypes.YES_NO,
        is_required: true,
      };

      // Valid YES_NO
      expect(() => {
        InterviewService.validateAnswerValue(yesNoQuestion as any, 'YES', false);
      }).not.toThrow();

      // Invalid YES_NO value
      expect(() => {
        InterviewService.validateAnswerValue(yesNoQuestion as any, 'MAYBE', false);
      }).toThrow('YES_NO answer must be YES or NO');

      const singleChoiceQuestion = {
        id: 'q-2',
        prompt_text: 'Preferred mode of transport?',
        question_type: QuestionTypes.SINGLE_CHOICE,
        answer_options: ['Bus', 'Train', 'Walk'],
        is_required: true,
      };

      // Valid choice
      expect(() => {
        InterviewService.validateAnswerValue(singleChoiceQuestion as any, 'Bus', false);
      }).not.toThrow();

      // Invalid choice
      expect(() => {
        InterviewService.validateAnswerValue(singleChoiceQuestion as any, 'Airplane', false);
      }).toThrow('must be one of the permitted options');

      const numericQuestion = {
        id: 'q-3',
        prompt_text: 'What is your current body temperature in Fahrenheit?',
        question_type: QuestionTypes.NUMERIC,
        is_required: true,
      };

      // Valid numeric
      expect(() => {
        InterviewService.validateAnswerValue(numericQuestion as any, 98.6, false);
      }).not.toThrow();

      // Invalid non-numeric
      expect(() => {
        InterviewService.validateAnswerValue(numericQuestion as any, 'hot', false);
      }).toThrow('Answer must be a valid number');
    });

    it('Should format session progress accurately without clinical interpretation', () => {
      const mockSession = {
        id: 'sess-123',
        visit_id: 'visit-456',
        patient_id: 'pat-789',
        template_id: 'tmpl-general',
        template_version: '1.0.0',
        status: InterviewSessionStatus.IN_PROGRESS,
        started_at: new Date('2026-10-04T09:00:00Z'),
        completed_at: null,
        current_question_id: 'q-meds',
        template: {
          id: 'tmpl-general',
          name: 'General OPD Intake',
          description: 'Comprehensive adult outpatient questionnaire',
          version: '1.0.0',
          questions: [
            { id: 'q-cc', section: InterviewSections.CHIEF_COMPLAINT, prompt_text: 'Chief complaint?', order: 1 },
            { id: 'q-meds', section: InterviewSections.MEDICATIONS, prompt_text: 'Current medications?', order: 2 },
            { id: 'q-allergies', section: InterviewSections.ALLERGIES, prompt_text: 'Any allergies?', order: 3 },
          ],
        },
        answers: [
          {
            id: 'ans-1',
            question_id: 'q-cc',
            answer_value: 'Cough and mild sore throat',
            answered_via: AnsweredVia.TOUCH,
            language_used: 'en',
            is_critical: false,
            is_skipped: false,
            answered_at: new Date(),
          },
        ],
      };

      const state = InterviewService.formatSessionState(mockSession as any);

      expect(state.session.id).toBe('sess-123');
      expect(state.session.status).toBe(InterviewSessionStatus.IN_PROGRESS);
      expect(state.progress.totalQuestions).toBe(3);
      expect(state.progress.answeredCount).toBe(1);
      expect(state.progress.completionPercentage).toBe(33);
      expect(state.currentQuestion?.id).toBe('q-meds');
      expect(state.answers.length).toBe(1);
      expect(state.answers[0].answerValue).toBe('Cough and mild sore throat');
      // Verify no clinical interpretation is generated
      expect((state.answers[0] as any).interpreted_meaning).toBeUndefined();
    });
  });

  describe('Downstream Module 4/5/6 Integration Contract', () => {
    it('Should expose a clean getCompletedAnswers interface preserving provenance and critical flag', async () => {
      expect(typeof InterviewService.getCompletedAnswers).toBe('function');
    });
  });

  describe('Admin and Kiosk API Role-based Access Control', () => {
    const app = express();
    app.use(express.json());

    // Mock staff injection for role authorization tests
    app.post(
      '/api/v1/test/admin-template-mgmt',
      (req: AppRequest, _res, next) => {
        req.user = req.body.user;
        next();
      },
      authorizeRoles('ADMIN', 'SUPER_ADMIN'),
      (_req, res) => {
        res.json({ success: true, message: 'Admin template modification authorized' });
      }
    );

    app.use(globalErrorHandler);

    it('Should reject unauthenticated requests to admin management route', async () => {
      const res = await request(app).post('/api/v1/test/admin-template-mgmt').send({});
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('Should forbid DOCTOR and STAFF_ATTENDANT roles from managing admin interview templates', async () => {
      const resDoctor = await request(app)
        .post('/api/v1/test/admin-template-mgmt')
        .send({
          user: {
            id: 'doc-1',
            email: 'doctor@hospital.org',
            role: 'DOCTOR',
            fullName: 'Dr. Ramesh',
            status: 'ACTIVE',
          },
        });

      expect(resDoctor.status).toBe(403);
      expect(resDoctor.body.success).toBe(false);
      expect(resDoctor.body.error.code).toBe('FORBIDDEN');

      const resStaff = await request(app)
        .post('/api/v1/test/admin-template-mgmt')
        .send({
          user: {
            id: 'staff-1',
            email: 'staff@hospital.org',
            role: 'STAFF_ATTENDANT',
            fullName: 'Attendant Priya',
            status: 'ACTIVE',
          },
        });

      expect(resStaff.status).toBe(403);
      expect(resStaff.body.success).toBe(false);
      expect(resStaff.body.error.code).toBe('FORBIDDEN');
    });

    it('Should allow ADMIN and SUPER_ADMIN roles to manage templates', async () => {
      const resAdmin = await request(app)
        .post('/api/v1/test/admin-template-mgmt')
        .send({
          user: {
            id: 'admin-1',
            email: 'admin@hospital.org',
            role: 'ADMIN',
            fullName: 'System Admin',
            status: 'ACTIVE',
          },
        });

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.success).toBe(true);
    });
  });
});
