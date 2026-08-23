import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { CourseStatus, EnrollmentStatus } from '@repo/db';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma: any = {
      traineeProfile: { count: jest.fn(), findUnique: jest.fn() },
      trainerProfile: { count: jest.fn() },
      course: { count: jest.fn(), findMany: jest.fn() },
      enrollment: { count: jest.fn() },
      certificate: { count: jest.fn(), findMany: jest.fn() },
      skillGapAnalysis: { groupBy: jest.fn() },
      traineeCompetency: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getAdminDashboard() ──────────────────────────────────────────────────────

  describe('getAdminDashboard()', () => {
    it('should return enrollment totals and completion rate', async () => {
      (prisma.traineeProfile.count as jest.Mock).mockResolvedValue(15);
      (prisma.trainerProfile.count as jest.Mock).mockResolvedValue(5);
      (prisma.course.count as jest.Mock)
        .mockResolvedValueOnce(10)  // totalCourses
        .mockResolvedValueOnce(8);  // publishedCourses
      (prisma.enrollment.count as jest.Mock)
        .mockResolvedValueOnce(50)  // totalEnrollments
        .mockResolvedValueOnce(30); // completedEnrollments
      (prisma.certificate.count as jest.Mock).mockResolvedValue(30);
      (prisma.skillGapAnalysis.groupBy as jest.Mock).mockResolvedValue([
        { gapClassification: 'critical', _count: { _all: 5 } },
      ]);

      const result = await service.getAdminDashboard();

      expect(result.users.trainees).toBe(15);
      expect(result.users.trainers).toBe(5);
      expect(result.courses.total).toBe(10);
      expect(result.courses.published).toBe(8);
      expect(result.enrollments.total).toBe(50);
      expect(result.enrollments.completed).toBe(30);
      expect(result.enrollments.completionRate).toBe(60); // 30/50 * 100
      expect(result.certificates).toBe(30);
    });

    it('should return 0 completionRate when no enrollments', async () => {
      (prisma.traineeProfile.count as jest.Mock).mockResolvedValue(0);
      (prisma.trainerProfile.count as jest.Mock).mockResolvedValue(0);
      (prisma.course.count as jest.Mock).mockResolvedValue(0).mockResolvedValue(0);
      (prisma.enrollment.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      (prisma.certificate.count as jest.Mock).mockResolvedValue(0);
      (prisma.skillGapAnalysis.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await service.getAdminDashboard();
      expect(result.enrollments.completionRate).toBe(0);
    });
  });

  // ─── getTraineeDashboard() ────────────────────────────────────────────────────

  describe('getTraineeDashboard()', () => {
    it('should throw NotFoundException if trainee profile not found', async () => {
      (prisma.traineeProfile.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getTraineeDashboard('user-1')).rejects.toThrow(NotFoundException);
    });

    it('should return competencyStats with gap calculation', async () => {
      (prisma.traineeProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tnp-1' });
      (prisma.enrollment.count as jest.Mock)
        .mockResolvedValueOnce(3)  // active
        .mockResolvedValueOnce(2); // completed
      (prisma.certificate.count as jest.Mock).mockResolvedValue(2);
      (prisma.traineeCompetency.findMany as jest.Mock).mockResolvedValue([
        { currentLevel: 2, requiredLevel: 4 },
        { currentLevel: 3, requiredLevel: 5 },
      ]);

      const result = await service.getTraineeDashboard('user-1');

      expect(result.activeEnrollments).toBe(3);
      expect(result.completedEnrollments).toBe(2);
      expect(result.certificates).toBe(2);
      expect(result.competencyStats.assessedSkills).toBe(2);
      expect(result.competencyStats.avgCurrentLevel).toBe(2.5); // (2+3)/2
      expect(result.competencyStats.avgRequiredLevel).toBe(4.5); // (4+5)/2
      expect(result.competencyStats.overallGap).toBe(2); // 4.5-2.5
    });
  });

  // ─── getHeatmap() ─────────────────────────────────────────────────────────────

  describe('getHeatmap()', () => {
    it('should return heatmap array with department and skills structure', async () => {
      (prisma.traineeCompetency.findMany as jest.Mock).mockResolvedValue([
        {
          currentLevel: 3,
          requiredLevel: 5,
          traineeProfile: { department: { name: 'Engineering' } },
          competency: {
            competencySkills: [
              { skill: { name: 'Cloud Architecture' } },
            ],
          },
        },
      ]);

      const result = await service.getHeatmap();

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('department', 'Engineering');
      expect(result[0].skills[0]).toHaveProperty('skill', 'Cloud Architecture');
      expect(result[0].skills[0]).toHaveProperty('avgCurrentLevel', 3);
      expect(result[0].skills[0]).toHaveProperty('avgRequiredLevel', 5);
    });

    it('should return empty array when no competency data', async () => {
      (prisma.traineeCompetency.findMany as jest.Mock).mockResolvedValue([]);
      const result = await service.getHeatmap();
      expect(result).toEqual([]);
    });
  });
});
