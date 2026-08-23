import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CourseStatus, EnrollmentStatus } from '@repo/db';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admin dashboard metrics overview
   */
  async getAdminDashboard(): Promise<any> {
    const [
      totalTrainees,
      totalTrainers,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      completedEnrollments,
      totalCertificates,
    ] = await Promise.all([
      this.prisma.traineeProfile.count(),
      this.prisma.trainerProfile.count(),
      this.prisma.course.count(),
      this.prisma.course.count({ where: { status: CourseStatus.published } }),
      this.prisma.enrollment.count(),
      this.prisma.enrollment.count({ where: { status: EnrollmentStatus.completed } }),
      this.prisma.certificate.count(),
    ]);

    // Top critical skill gaps across the org
    const topGaps = await this.prisma.skillGapAnalysis.groupBy({
      by: ['gapClassification'],
      _count: { _all: true },
    });

    return {
      users: {
        trainees: totalTrainees,
        trainers: totalTrainers,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
      },
      enrollments: {
        total: totalEnrollments,
        completed: completedEnrollments,
        completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0,
      },
      certificates: totalCertificates,
      skillGaps: topGaps,
    };
  }

  /**
   * Trainee personal dashboard stats
   */
  async getTraineeDashboard(userId: string): Promise<any> {
    const profile = await this.prisma.traineeProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Trainee profile not found');

    const [
      activeEnrollments,
      completedEnrollments,
      certificates,
      competencies,
    ] = await Promise.all([
      this.prisma.enrollment.count({
        where: { traineeId: profile.id, status: { in: [EnrollmentStatus.started, EnrollmentStatus.in_progress] } },
      }),
      this.prisma.enrollment.count({
        where: { traineeId: profile.id, status: EnrollmentStatus.completed },
      }),
      this.prisma.certificate.count({
        where: { traineeId: profile.id },
      }),
      this.prisma.traineeCompetency.findMany({
        where: { traineeProfileId: profile.id },
        select: { currentLevel: true, requiredLevel: true },
      }),
    ]);

    let avgCurrent = 0;
    let avgRequired = 0;
    if (competencies.length > 0) {
      avgCurrent = competencies.reduce((acc, c) => acc + c.currentLevel, 0) / competencies.length;
      avgRequired = competencies.reduce((acc, c) => acc + c.requiredLevel, 0) / competencies.length;
    }

    return {
      activeEnrollments,
      completedEnrollments,
      certificates,
      competencyStats: {
        assessedSkills: competencies.length,
        avgCurrentLevel: avgCurrent,
        avgRequiredLevel: avgRequired,
        overallGap: Math.max(0, avgRequired - avgCurrent),
      },
    };
  }

  /**
   * Organization-wide Competency Heatmap
   * Returns a matrix of departments and average skill levels
   */
  async getHeatmap(): Promise<any> {
    // Note: In Prisma, grouping with joined tables can be tricky, 
    // so we fetch trainee competencies with department and skill data and aggregate in memory.
    const competencies = await this.prisma.traineeCompetency.findMany({
      include: {
        traineeProfile: {
          include: { department: true }
        },
        competency: {
          include: { competencySkills: { include: { skill: true } } }
        }
      }
    });

    const heatmap = new Map<string, Map<string, { totalCurrent: number, totalRequired: number, count: number }>>();

    for (const comp of competencies) {
      const deptName = comp.traineeProfile.department?.name || 'Unassigned';
      
      if (!heatmap.has(deptName)) {
        heatmap.set(deptName, new Map());
      }
      
      const deptMap = heatmap.get(deptName)!;

      for (const cs of comp.competency.competencySkills) {
        const skillName = cs.skill.name;
        
        if (!deptMap.has(skillName)) {
          deptMap.set(skillName, { totalCurrent: 0, totalRequired: 0, count: 0 });
        }
        
        const stats = deptMap.get(skillName)!;
        stats.totalCurrent += comp.currentLevel;
        stats.totalRequired += comp.requiredLevel;
        stats.count += 1;
      }
    }

    // Convert Map to a JSON serializable array structure
    const result = [];
    for (const [dept, skillsMap] of heatmap.entries()) {
      const skills = [];
      for (const [skill, stats] of skillsMap.entries()) {
        skills.push({
          skill,
          avgCurrentLevel: stats.count > 0 ? stats.totalCurrent / stats.count : 0,
          avgRequiredLevel: stats.count > 0 ? stats.totalRequired / stats.count : 0,
          count: stats.count
        });
      }
      result.push({
        department: dept,
        skills,
      });
    }

    return result;
  }

  /**
   * Reports - Courses (returns JSON suitable for CSV export on the client)
   */
  async getCoursesReport(): Promise<any> {
    const courses = await this.prisma.course.findMany({
      include: {
        category: true,
        trainer: { include: { user: true } },
        _count: {
          select: { enrollments: true, certificates: true, modules: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return courses.map(c => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      category: c.category.name,
      trainerEmail: c.trainer.user.email,
      difficulty: c.difficulty,
      status: c.status,
      moduleCount: c._count.modules,
      enrollmentCount: c._count.enrollments,
      certificateCount: c._count.certificates,
      completionRatePct: c._count.enrollments > 0 ? (c._count.certificates / c._count.enrollments) * 100 : 0,
      createdAt: c.createdAt,
    }));
  }
}
