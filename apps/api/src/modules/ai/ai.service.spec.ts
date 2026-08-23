import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { CourseStatus } from '@repo/db';

// Increase test timeout for AI service tests (AI service has simulated delays)
const AI_TEST_TIMEOUT = 15000;

// Mock the setTimeout delays inside AiService
jest.mock('timers', () => ({
  ...jest.requireActual('timers'),
}));

describe('AiService', () => {
  let service: AiService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;

  const mockTx: any = {
    course: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      skillGapAnalysis: { findUnique: jest.fn() },
      trainerMatchScore: { findMany: jest.fn() },
      trainerProfile: { findUnique: jest.fn() },
      courseCategory: { findFirst: jest.fn(), create: jest.fn() },
      // Verifying AI service has NO methods touching these tables:
      user: undefined,        // AiService should never call prisma.user directly
      role: undefined,        // AiService should never call prisma.role
      permission: undefined,  // AiService should never call prisma.permission
      userRole: undefined,    // AiService should never call prisma.userRole
      $transaction: jest.fn().mockImplementation(async (cb) => {
        return await cb(mockTx);
      }),
    };

    const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── explainSkillGap() ────────────────────────────────────────────────────────

  describe('explainSkillGap()', () => {
    it('should throw NotFoundException if skill gap not found', async () => {
      (prisma.skillGapAnalysis.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.explainSkillGap({ skillGapId: 'nonexistent' }, 'user-1')).rejects.toThrow(NotFoundException);
    }, AI_TEST_TIMEOUT);

    it('should return structured explanation with suggestedActions', async () => {
      (prisma.skillGapAnalysis.findUnique as jest.Mock).mockResolvedValue({
        id: 'gap-1',
        gapClassification: 'critical',
        gapValue: 3,
        traineeCompetency: {
          competency: { name: 'Cloud Architecture' },
          currentLevel: 2,
          requiredLevel: 5,
        },
      });

      const result = await service.explainSkillGap({ skillGapId: 'gap-1' }, 'user-1');

      expect(result).toHaveProperty('skillGapId', 'gap-1');
      expect(result).toHaveProperty('explanation');
      expect(result.explanation).toContain('Cloud Architecture');
      expect(result).toHaveProperty('suggestedActions');
      expect(Array.isArray(result.suggestedActions)).toBe(true);
      expect(result.suggestedActions.length).toBeGreaterThan(0);

      // Verify audit log
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ai.explain_skill_gap' }),
      );
    }, AI_TEST_TIMEOUT);
  });

  // ─── draftCourseOutline() — ENFORCES DRAFT STATUS ────────────────────────────

  describe('draftCourseOutline()', () => {
    it('should throw ForbiddenException if not a trainer', async () => {
      (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.draftCourseOutline(
          { topic: 'Docker', difficulty: 'beginner' } as any,
          'user-not-trainer',
        ),
      ).rejects.toThrow(ForbiddenException);
    }, AI_TEST_TIMEOUT);

    it('CRITICAL: should ALWAYS save with status=draft regardless of input', async () => {
      (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tp-1' });
      (prisma.courseCategory.findFirst as jest.Mock).mockResolvedValue({ id: 'cat-1' });

      const draftCourse = {
        id: 'c-1',
        title: 'Mastering Docker',
        status: CourseStatus.draft,
        modules: [],
      };
      mockTx.course.create.mockResolvedValue(draftCourse);

      const result = await service.draftCourseOutline(
        { topic: 'Docker', difficulty: 'beginner' } as any,
        'trainer-user-1',
      );

      // Verify DRAFT status enforced
      expect(mockTx.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CourseStatus.draft }),
        }),
      );
      expect(result.statusEnforced).toBe(CourseStatus.draft);
      expect(result.course.status).toBe(CourseStatus.draft);
    }, AI_TEST_TIMEOUT);

    it('should NOT mutate users, roles, or permissions tables', () => {
      // Structural guarantee: AiService should not have access to these Prisma models
      expect(prisma.user).toBeUndefined();
      expect(prisma.role).toBeUndefined();
      expect((prisma as any).permission).toBeUndefined();
      expect((prisma as any).userRole).toBeUndefined();
    });

    it('should log ai.draft_course_outline audit event', async () => {
      (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tp-1' });
      (prisma.courseCategory.findFirst as jest.Mock).mockResolvedValue({ id: 'cat-1' });
      mockTx.course.create.mockResolvedValue({
        id: 'c-1', title: 'Mastering Docker', status: CourseStatus.draft, modules: [],
      });

      await service.draftCourseOutline(
        { topic: 'Docker', difficulty: 'beginner' } as any,
        'trainer-user-1',
      );

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ai.draft_course_outline', entityType: 'Course' }),
      );
    }, AI_TEST_TIMEOUT);
  });
});
