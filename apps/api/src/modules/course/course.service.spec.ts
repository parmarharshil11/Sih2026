import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, EnrollmentStatus } from '@repo/db';
import { CourseService } from './course.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';

describe('CourseService', () => {
  let service: CourseService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;

  // Transaction callback executor
  const mockTx: any = {
    course: { create: jest.fn(), update: jest.fn() },
    courseSkill: { deleteMany: jest.fn() },
    enrollment: { findUnique: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
    courseModule: { findMany: jest.fn() },
    courseProgress: { createMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      course: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
      courseModule: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      courseCategory: { findMany: jest.fn(), create: jest.fn() },
      trainerProfile: { findUnique: jest.fn() },
      traineeProfile: { findUnique: jest.fn() },
      enrollment: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      courseProgress: { upsert: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
    };

    const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createCourse() ───────────────────────────────────────────────────────────

  describe('createCourse()', () => {
    it('should throw NotFoundException if trainer profile not found', async () => {
      (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.createCourse('user-1', { title: 'Test', description: 'Desc', difficulty: 'beginner' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should always create course in DRAFT status', async () => {
      (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tp-1', userId: 'user-1' });
      const createdCourse = { id: 'course-1', status: CourseStatus.draft, title: 'Test' };
      mockTx.course.create.mockResolvedValue(createdCourse);

      const result = await service.createCourse(
        'user-1',
        { title: 'Test', description: 'Desc', difficulty: 'beginner' } as any,
      );

      expect(mockTx.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CourseStatus.draft }),
        }),
      );
      expect(result.status).toBe(CourseStatus.draft);
    });

    it('should log course.created audit event', async () => {
      (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tp-1' });
      mockTx.course.create.mockResolvedValue({ id: 'course-1', status: CourseStatus.draft });

      await service.createCourse('user-1', { title: 'Test', description: 'Desc', difficulty: 'beginner' } as any);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'course.created', entityType: 'Course' }),
      );
    });
  });

  // ─── submitForApproval() ──────────────────────────────────────────────────────

  describe('submitForApproval()', () => {
    it('should throw NotFoundException if course not found', async () => {
      (prisma.course.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.submitForApproval('user-1', 'course-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not course owner', async () => {
      const course = { id: 'course-1', status: CourseStatus.draft, trainerId: 'tp-other' };
      (prisma.course.findFirst as jest.Mock).mockResolvedValue(course);
      (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tp-mine' });

      await expect(service.submitForApproval('user-1', 'course-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if course is not in draft status', async () => {
      const course = { id: 'course-1', status: CourseStatus.published, trainerId: 'tp-1' };
      (prisma.course.findFirst as jest.Mock).mockResolvedValue(course);
      (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tp-1' });

      await expect(service.submitForApproval('user-1', 'course-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if course has no modules', async () => {
      const course = { id: 'course-1', status: CourseStatus.draft, trainerId: 'tp-1' };
      (prisma.course.findFirst as jest.Mock).mockResolvedValue(course);
      (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tp-1' });
      (prisma.courseModule.count as jest.Mock).mockResolvedValue(0);

      await expect(service.submitForApproval('user-1', 'course-1')).rejects.toThrow(BadRequestException);
    });

    it('should move course to pending_approval status', async () => {
      const course = { id: 'course-1', status: CourseStatus.draft, trainerId: 'tp-1' };
      (prisma.course.findFirst as jest.Mock).mockResolvedValue(course);
      (prisma.trainerProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tp-1' });
      (prisma.courseModule.count as jest.Mock).mockResolvedValue(2);
      const updatedCourse = { ...course, status: CourseStatus.pending_approval };
      mockTx.course.update.mockResolvedValue(updatedCourse);

      const result = await service.submitForApproval('user-1', 'course-1');

      expect(mockTx.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CourseStatus.pending_approval }),
        }),
      );
      expect(result.status).toBe(CourseStatus.pending_approval);
    });
  });

  // ─── approveCourse() ──────────────────────────────────────────────────────────

  describe('approveCourse()', () => {
    it('should throw BadRequestException if course is not pending_approval', async () => {
      (prisma.course.findFirst as jest.Mock).mockResolvedValue({ id: 'c1', status: CourseStatus.draft, deletedAt: null });
      await expect(service.approveCourse('admin-1', 'c1')).rejects.toThrow(BadRequestException);
    });

    it('should set status to published and record approvedById', async () => {
      (prisma.course.findFirst as jest.Mock).mockResolvedValue({ id: 'c1', status: CourseStatus.pending_approval, deletedAt: null });
      const publishedCourse = { id: 'c1', status: CourseStatus.published, approvedById: 'admin-1' };
      mockTx.course.update.mockResolvedValue(publishedCourse);

      const result = await service.approveCourse('admin-1', 'c1');

      expect(mockTx.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: CourseStatus.published,
            approvedById: 'admin-1',
            approvedAt: expect.any(Date),
          }),
        }),
      );
      expect(result.status).toBe(CourseStatus.published);
    });
  });

  // ─── enroll() ─────────────────────────────────────────────────────────────────

  describe('enroll()', () => {
    it('should throw BadRequestException if course is not published', async () => {
      (prisma.traineeProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tnp-1' });
      (prisma.course.findFirst as jest.Mock).mockResolvedValue({ id: 'c1', status: CourseStatus.draft, deletedAt: null });

      await expect(
        service.enroll('user-1', { courseId: 'c1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on double enrollment', async () => {
      (prisma.traineeProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tnp-1' });
      (prisma.course.findFirst as jest.Mock).mockResolvedValue({ id: 'c1', status: CourseStatus.published, deletedAt: null });
      mockTx.enrollment.findUnique.mockResolvedValue({ id: 'existing-enrollment' });

      await expect(
        service.enroll('user-1', { courseId: 'c1' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create enrollment with started status', async () => {
      (prisma.traineeProfile.findUnique as jest.Mock).mockResolvedValue({ id: 'tnp-1' });
      (prisma.course.findFirst as jest.Mock).mockResolvedValue({ id: 'c1', status: CourseStatus.published, deletedAt: null });
      mockTx.enrollment.findUnique.mockResolvedValue(null);
      mockTx.enrollment.create.mockResolvedValue({ id: 'enroll-1', status: EnrollmentStatus.started });
      mockTx.courseModule.findMany.mockResolvedValue([]);

      const result = await service.enroll('user-1', { courseId: 'c1' } as any);

      expect(mockTx.enrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: EnrollmentStatus.started }),
        }),
      );
      expect(result.status).toBe(EnrollmentStatus.started);
    });
  });
});
