import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CourseStatus, EnrollmentStatus, ProgressStatus } from '@repo/db';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateModuleDto, UpdateModuleDto } from './dto/create-module.dto';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Categories ───────────────────────────────────────────────────────────────

  async listCategories(): Promise<any> {
    return this.prisma.courseCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto): Promise<any> {
    return this.prisma.courseCategory.create({ data: { name: dto.name } });
  }

  // ─── Course CRUD ──────────────────────────────────────────────────────────────

  /**
   * List published courses with optional filters.
   * Admins and trainers may pass status filter to see draft/pending courses.
   */
  async listCourses(filters: {
    status?: CourseStatus;
    categoryId?: string;
    difficulty?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      status: filters.status ?? CourseStatus.published,
    };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          category: true,
          trainer: { select: { id: true, user: { select: { email: true } } } },
          courseSkills: { include: { skill: true } },
          _count: { select: { enrollments: true, modules: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async getCourse(id: string): Promise<any> {
    const course = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        trainer: {
          select: {
            id: true,
            bio: true,
            yearsExperience: true,
            trainerRatingAvg: true,
            user: { select: { email: true } },
          },
        },
        courseSkills: { include: { skill: true } },
        prerequisites: {
          include: {
            prerequisite: { select: { id: true, title: true, slug: true } },
          },
        },
        modules: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            resources: {
              where: { deletedAt: null },
              select: {
                id: true,
                title: true,
                type: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
              },
            },
          },
        },
        assessments: {
          select: {
            id: true,
            subject: true,
            type: true,
            timeLimitMinutes: true,
            passScorePct: true,
            _count: { select: { questions: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async createCourse(
    trainerUserId: string,
    dto: CreateCourseDto,
    ipAddress: string | null = null,
  ): Promise<any> {
    const trainerProfile = await this._requireTrainerProfile(trainerUserId);
    const slug = this._slugify(dto.title) + '-' + Date.now();
    const { skillIds, ...courseData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          ...courseData,
          slug,
          trainerId: trainerProfile.id,
          status: CourseStatus.draft,
          ...(skillIds?.length
            ? {
                courseSkills: {
                  create: skillIds.map((skillId) => ({ skillId })),
                },
              }
            : {}),
        },
        include: { category: true, courseSkills: { include: { skill: true } } },
      });

      await this.auditService.log({
        actorUserId: trainerUserId,
        action: 'course.created',
        entityType: 'Course',
        entityId: course.id,
        ipAddress,
        metadata: { title: dto.title },
        prisma: tx,
      });

      return course;
    });
  }

  async updateCourse(
    trainerUserId: string,
    courseId: string,
    dto: UpdateCourseDto,
    isAdmin = false,
    ipAddress: string | null = null,
  ): Promise<any> {
    const course = await this._requireCourse(courseId);
    if (!isAdmin) {
      await this._assertCourseOwner(trainerUserId, course);
    }
    if (
      !isAdmin &&
      course.status !== CourseStatus.draft &&
      course.status !== CourseStatus.pending_approval
    ) {
      throw new ForbiddenException(
        'Cannot edit a published or archived course. Archive it first.',
      );
    }

    const { skillIds, ...courseData } = dto;
    if ('status' in courseData) {
      delete (courseData as any).status;
    }

    return this.prisma.$transaction(async (tx) => {
      if (skillIds !== undefined) {
        await tx.courseSkill.deleteMany({ where: { courseId } });
      }

      const updatedCourse = await tx.course.update({
        where: { id: courseId },
        data: {
          ...courseData,
          ...(skillIds?.length
            ? {
                courseSkills: {
                  create: skillIds.map((skillId) => ({ skillId })),
                },
              }
            : {}),
        },
        include: { category: true, courseSkills: { include: { skill: true } } },
      });

      await this.auditService.log({
        actorUserId: trainerUserId,
        action: 'course.updated',
        entityType: 'Course',
        entityId: courseId,
        ipAddress,
        metadata: { fieldsUpdated: Object.keys(dto) },
        prisma: tx,
      });

      return updatedCourse;
    });
  }

  async deleteCourse(
    userId: string,
    courseId: string,
    isAdmin = false,
    ipAddress: string | null = null,
  ): Promise<any> {
    const course = await this._requireCourse(courseId);
    if (!isAdmin) {
      await this._assertCourseOwner(userId, course);
    }
    return this.prisma.$transaction(async (tx) => {
      const deletedCourse = await tx.course.update({
        where: { id: courseId },
        data: { deletedAt: new Date() },
      });

      await this.auditService.log({
        actorUserId: userId,
        action: 'course.deleted',
        entityType: 'Course',
        entityId: courseId,
        ipAddress,
        metadata: null,
        prisma: tx,
      });

      return deletedCourse;
    });
  }

  async archiveCourse(
    userId: string,
    courseId: string,
    isAdmin = false,
    ipAddress: string | null = null,
  ): Promise<any> {
    const course = await this._requireCourse(courseId);
    if (!isAdmin) {
      await this._assertCourseOwner(userId, course);
    }
    if (course.status !== CourseStatus.published) {
      throw new BadRequestException('Only published courses can be archived');
    }
    return this.prisma.$transaction(async (tx) => {
      const updatedCourse = await tx.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.archived },
      });

      await this.auditService.log({
        actorUserId: userId,
        action: 'course.status_changed',
        entityType: 'Course',
        entityId: courseId,
        ipAddress,
        metadata: { newStatus: CourseStatus.archived },
        prisma: tx,
      });

      return updatedCourse;
    });
  }

  async submitForApproval(trainerUserId: string, courseId: string, ipAddress: string | null = null): Promise<any> {
    const course = await this._requireCourse(courseId);
    await this._assertCourseOwner(trainerUserId, course);

    if (course.status !== CourseStatus.draft) {
      throw new BadRequestException(
        'Only draft courses can be submitted for approval',
      );
    }

    const moduleCount = await this.prisma.courseModule.count({
      where: { courseId },
    });
    if (moduleCount === 0) {
      throw new BadRequestException(
        'Course must have at least one module before submission',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedCourse = await tx.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.pending_approval },
      });

      await this.auditService.log({
        actorUserId: trainerUserId,
        action: 'course.status_changed',
        entityType: 'Course',
        entityId: courseId,
        ipAddress,
        metadata: { newStatus: CourseStatus.pending_approval },
        prisma: tx,
      });

      return updatedCourse;
    });
  }

  async approveCourse(adminUserId: string, courseId: string, ipAddress: string | null = null): Promise<any> {
    const course = await this._requireCourse(courseId);
    if (course.status !== CourseStatus.pending_approval) {
      throw new BadRequestException('Course is not pending approval');
    }
    return this.prisma.$transaction(async (tx) => {
      const updatedCourse = await tx.course.update({
        where: { id: courseId },
        data: {
          status: CourseStatus.published,
          approvedById: adminUserId,
          approvedAt: new Date(),
        },
      });

      await this.auditService.log({
        actorUserId: adminUserId,
        action: 'course.status_changed',
        entityType: 'Course',
        entityId: courseId,
        ipAddress,
        metadata: { newStatus: CourseStatus.published },
        prisma: tx,
      });

      return updatedCourse;
    });
  }

  async rejectCourse(adminUserId: string, courseId: string, ipAddress: string | null = null): Promise<any> {
    const course = await this._requireCourse(courseId);
    if (course.status !== CourseStatus.pending_approval) {
      throw new BadRequestException('Course is not pending approval');
    }
    return this.prisma.$transaction(async (tx) => {
      const updatedCourse = await tx.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.draft },
      });

      await this.auditService.log({
        actorUserId: adminUserId,
        action: 'course.status_changed',
        entityType: 'Course',
        entityId: courseId,
        ipAddress,
        metadata: { newStatus: CourseStatus.draft },
        prisma: tx,
      });

      return updatedCourse;
    });
  }

  // ─── Modules ──────────────────────────────────────────────────────────────────

  async addModule(
    trainerUserId: string,
    courseId: string,
    dto: CreateModuleDto,
  ): Promise<any> {
    const course = await this._requireCourse(courseId);
    await this._assertCourseOwner(trainerUserId, course);

    return this.prisma.courseModule.create({
      data: {
        courseId,
        title: dto.title,
        sequenceOrder: dto.sequenceOrder,
      },
    });
  }

  async updateModule(
    trainerUserId: string,
    courseId: string,
    moduleId: string,
    dto: UpdateModuleDto,
  ): Promise<any> {
    const course = await this._requireCourse(courseId);
    await this._assertCourseOwner(trainerUserId, course);

    const mod = await this.prisma.courseModule.findFirst({
      where: { id: moduleId, courseId },
    });
    if (!mod) throw new NotFoundException('Module not found');

    return this.prisma.courseModule.update({
      where: { id: moduleId },
      data: dto,
    });
  }

  async deleteModule(
    trainerUserId: string,
    courseId: string,
    moduleId: string,
  ): Promise<any> {
    const course = await this._requireCourse(courseId);
    await this._assertCourseOwner(trainerUserId, course);

    const mod = await this.prisma.courseModule.findFirst({
      where: { id: moduleId, courseId },
    });
    if (!mod) throw new NotFoundException('Module not found');

    return this.prisma.courseModule.delete({ where: { id: moduleId } });
  }

  // ─── Enrollment & Progress ────────────────────────────────────────────────────

  async enroll(traineeUserId: string, dto: EnrollCourseDto, ipAddress: string | null = null): Promise<any> {
    const traineeProfile = await this._requireTraineeProfile(traineeUserId);
    const course = await this._requireCourse(dto.courseId);

    if (course.status !== CourseStatus.published) {
      throw new BadRequestException('Can only enroll in published courses');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.enrollment.findUnique({
        where: {
          traineeId_courseId: {
            traineeId: traineeProfile.id,
            courseId: dto.courseId,
          },
        },
      });
      if (existing) throw new ConflictException('Already enrolled in this course');

      const enrollment = await tx.enrollment.create({
        data: {
          traineeId: traineeProfile.id,
          courseId: dto.courseId,
          status: EnrollmentStatus.started,
        },
        include: { course: { select: { title: true, slug: true } } },
      });

      const modules = await tx.courseModule.findMany({
        where: { courseId: dto.courseId },
      });
      if (modules.length) {
        await tx.courseProgress.createMany({
          data: modules.map((m) => ({
            enrollmentId: enrollment.id,
            moduleId: m.id,
            status: ProgressStatus.not_started,
            progressPct: 0,
          })),
          skipDuplicates: true,
        });
      }

      await this.auditService.log({
        actorUserId: traineeUserId,
        action: 'course.enrolled',
        entityType: 'Enrollment',
        entityId: enrollment.id,
        ipAddress,
        metadata: { courseId: dto.courseId },
        prisma: tx,
      });

      return enrollment;
    });
  }

  async getMyEnrollments(traineeUserId: string): Promise<any> {
    const traineeProfile = await this._requireTraineeProfile(traineeUserId);
    return this.prisma.enrollment.findMany({
      where: { traineeId: traineeProfile.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            difficulty: true,
            durationMinutes: true,
            category: true,
          },
        },
        progress: true,
        certificate: { select: { id: true, certificateNumber: true, issuedAt: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async getEnrollment(enrollmentId: string, userId: string): Promise<any> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            modules: { orderBy: { sequenceOrder: 'asc' } },
          },
        },
        progress: true,
        trainee: { select: { userId: true } },
        certificate: {
          select: { id: true, certificateNumber: true, issuedAt: true, verificationToken: true },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    // Trainee can only see their own; trainers/admins resolved at controller level
    return enrollment;
  }

  async updateProgress(
    traineeUserId: string,
    enrollmentId: string,
    dto: UpdateProgressDto,
  ): Promise<any> {
    const traineeProfile = await this._requireTraineeProfile(traineeUserId);

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, traineeId: traineeProfile.id },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    if (
      enrollment.status === EnrollmentStatus.completed ||
      enrollment.status === EnrollmentStatus.abandoned
    ) {
      throw new BadRequestException('Cannot update progress on a closed enrollment');
    }

    const status: ProgressStatus =
      dto.progressPct >= 100
        ? ProgressStatus.completed
        : dto.progressPct > 0
          ? ProgressStatus.in_progress
          : ProgressStatus.not_started;

    const progress = await this.prisma.courseProgress.upsert({
      where: {
        enrollmentId_moduleId: {
          enrollmentId,
          moduleId: dto.moduleId,
        },
      },
      create: {
        enrollmentId,
        moduleId: dto.moduleId,
        progressPct: dto.progressPct,
        status,
        lastAccessedAt: new Date(),
      },
      update: {
        progressPct: dto.progressPct,
        status,
        lastAccessedAt: new Date(),
      },
    });

    // Check if all modules are complete → auto-complete enrollment
    await this._checkAndCompleteEnrollment(enrollmentId);

    return progress;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async _checkAndCompleteEnrollment(
    enrollmentId: string,
  ): Promise<void> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: { include: { modules: true } }, progress: true },
    });
    if (!enrollment || enrollment.status === EnrollmentStatus.completed) return;

    const totalModules = enrollment.course.modules.length;
    if (totalModules === 0) return;

    const completedModules = enrollment.progress.filter(
      (p) => p.status === ProgressStatus.completed,
    ).length;

    if (completedModules >= totalModules) {
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: EnrollmentStatus.completed, completedAt: new Date() },
      });
    } else if (enrollment.status === EnrollmentStatus.started) {
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: EnrollmentStatus.in_progress },
      });
    }
  }

  private async _requireCourse(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  private async _requireTrainerProfile(userId: string) {
    const profile = await this.prisma.trainerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Trainer profile not found');
    return profile;
  }

  private async _requireTraineeProfile(userId: string) {
    const profile = await this.prisma.traineeProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Trainee profile not found');
    return profile;
  }

  private async _assertCourseOwner(userId: string, course: any): Promise<void> {
    const trainerProfile = await this.prisma.trainerProfile.findUnique({
      where: { userId },
    });
    if (!trainerProfile || course.trainerId !== trainerProfile.id) {
      throw new ForbiddenException('You do not own this course');
    }
  }

  private _slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
