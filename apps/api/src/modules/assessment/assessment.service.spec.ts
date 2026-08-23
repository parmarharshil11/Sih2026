import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';

describe('AssessmentService', () => {
  let service: AssessmentService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;

  const mockTx: any = {
    assessment: { create: jest.fn() },
    assessmentQuestion: { create: jest.fn() },
    assessmentAttempt: { update: jest.fn() },
    assessmentAnswer: { createMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      assessment: { findUnique: jest.fn(), create: jest.fn() },
      assessmentQuestion: { findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      assessmentAttempt: { count: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      assessmentOption: { findMany: jest.fn() },
      trainerProfile: { findUnique: jest.fn() },
      traineeProfile: { findUnique: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
    };

    const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AssessmentService>(AssessmentService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getAssessment() — never exposes isCorrect ────────────────────────────────

  describe('getAssessment()', () => {
    it('should throw NotFoundException if assessment not found', async () => {
      (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getAssessment('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return assessment without isCorrect on options', async () => {
      const mockAssessment = {
        id: 'a1',
        timeLimitMinutes: 30,
        passScorePct: 60,
        questions: [
          {
            id: 'q1',
            questionText: 'What is X?',
            questionType: 'single_mcq',
            options: [
              { id: 'o1', optionText: 'Option A' },  // isCorrect NOT present — Prisma select excludes it
              { id: 'o2', optionText: 'Option B' },
            ],
          },
        ],
        _count: { questions: 1, attempts: 0 },
      };
      (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(mockAssessment);

      const result = await service.getAssessment('a1');
      // Verify isCorrect is NOT present in options
      result.questions.forEach((q: any) => {
        q.options.forEach((o: any) => {
          expect(o).not.toHaveProperty('isCorrect');
        });
      });
    });
  });

  // ─── startAttempt() ───────────────────────────────────────────────────────────

  describe('startAttempt()', () => {
    it('should throw NotFoundException if trainee profile not found', async () => {
      (prisma.traineeProfile.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.startAttempt('user-1', 'assessment-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if assessment not found', async () => {
      (prisma.traineeProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tnp-1' });
      (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.startAttempt('user-1', 'assessment-1')).rejects.toThrow(NotFoundException);
    });

    it('should create attempt and return questions WITHOUT isCorrect', async () => {
      (prisma.traineeProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tnp-1' });
      (prisma.assessment.findUnique as jest.Mock).mockResolvedValue({
        id: 'a1',
        timeLimitMinutes: 30,
        passScorePct: 60,
        randomizeQuestions: false,
        randomizeOptions: false,
      });
      (prisma.assessmentAttempt.count as jest.Mock).mockResolvedValue(0);
      (prisma.assessmentAttempt.create as jest.Mock).mockResolvedValue({
        id: 'attempt-1',
        attemptNumber: 1,
        startedAt: new Date(),
      });
      (prisma.assessmentQuestion.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'q1',
          questionType: 'single_mcq',
          questionText: 'What is 2+2?',
          difficulty: 'easy',
          points: 1,
          options: [
            { id: 'o1', optionText: '3', isCorrect: false },
            { id: 'o2', optionText: '4', isCorrect: true },
          ],
        },
      ]);

      const result = await service.startAttempt('user-1', 'a1');

      expect(result.attemptId).toBe('attempt-1');
      expect(result.questions).toHaveLength(1);

      // CRITICAL SECURITY CHECK: isCorrect must not appear in client payload
      result.questions.forEach((q: any) => {
        q.options.forEach((o: any) => {
          expect(o).not.toHaveProperty('isCorrect');
        });
      });
    });
  });

  // ─── submitAttempt() ──────────────────────────────────────────────────────────

  describe('submitAttempt()', () => {
    it('should throw NotFoundException if attempt not found', async () => {
      (prisma.traineeProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tnp-1' });
      (prisma.assessmentAttempt.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.submitAttempt('user-1', 'assessment-1', 'attempt-1', { answers: [] } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if attempt already submitted', async () => {
      (prisma.traineeProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tnp-1' });
      (prisma.assessmentAttempt.findFirst as jest.Mock).mockResolvedValue({
        id: 'attempt-1',
        submittedAt: new Date(),
        assessment: { timeLimitMinutes: 30, passScorePct: 60, startedAt: new Date() },
      });
      await expect(
        service.submitAttempt('user-1', 'assessment-1', 'attempt-1', { answers: [] } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
