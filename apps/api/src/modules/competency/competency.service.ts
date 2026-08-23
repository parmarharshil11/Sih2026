import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GapClassification } from '@repo/db';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertTraineeCompetencyDto } from './dto/upsert-trainee-competency.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { CreateCompetencyDto } from './dto/create-competency.dto';

@Injectable()
export class CompetencyService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Skills ──────────────────────────────────────────────────────────────────

  async listSkills(category?: string): Promise<any> {
    return this.prisma.skill.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createSkill(dto: CreateSkillDto): Promise<any> {
    return this.prisma.skill.create({ data: dto });
  }

  // ─── Competencies ─────────────────────────────────────────────────────────────

  async listCompetencies(category?: string): Promise<any> {
    return this.prisma.competency.findMany({
      where: category ? { category } : undefined,
      include: {
        competencySkills: { include: { skill: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCompetency(dto: CreateCompetencyDto): Promise<any> {
    const { skillIds, ...competencyData } = dto;
    return this.prisma.competency.create({
      data: {
        ...competencyData,
        ...(skillIds?.length
          ? {
              competencySkills: {
                create: skillIds.map((skillId) => ({ skillId })),
              },
            }
          : {}),
      },
      include: { competencySkills: { include: { skill: true } } },
    });
  }

  // ─── Trainee Competencies ─────────────────────────────────────────────────────

  async getTraineeCompetencies(userId: string): Promise<any> {
    const profile = await this._requireTraineeProfile(userId);
    return this.prisma.traineeCompetency.findMany({
      where: { traineeProfileId: profile.id },
      include: {
        competency: {
          include: { competencySkills: { include: { skill: true } } },
        },
        skillGaps: { orderBy: { computedAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertTraineeCompetency(
    userId: string,
    dto: UpsertTraineeCompetencyDto,
  ): Promise<any> {
    const profile = await this._requireTraineeProfile(userId);

    const competency = await this.prisma.competency.findUnique({
      where: { id: dto.competencyId },
    });
    if (!competency) {
      throw new NotFoundException(`Competency ${dto.competencyId} not found`);
    }

    const record = await this.prisma.traineeCompetency.upsert({
      where: {
        traineeProfileId_competencyId: {
          traineeProfileId: profile.id,
          competencyId: dto.competencyId,
        },
      },
      create: {
        traineeProfileId: profile.id,
        competencyId: dto.competencyId,
        currentLevel: dto.currentLevel,
        requiredLevel: dto.requiredLevel,
        targetLevel: dto.targetLevel,
        evidenceUrl: dto.evidenceUrl,
      },
      update: {
        currentLevel: dto.currentLevel,
        requiredLevel: dto.requiredLevel,
        targetLevel: dto.targetLevel,
        evidenceUrl: dto.evidenceUrl,
        lastAssessedAt: new Date(),
      },
      include: { competency: true },
    });

    // Immediately recompute gap after upsert
    const gap = await this._computeAndPersistGap(
      record.id,
      record.currentLevel,
      record.requiredLevel,
    );
    return { ...record, latestGap: gap };
  }

  // ─── Skill Gap Calculator ─────────────────────────────────────────────────────

  /**
   * Recomputes skill gaps for ALL competencies of a trainee and returns
   * a full gap report ordered by severity (critical → none).
   */
  async computeSkillGapReport(userId: string): Promise<any> {
    const profile = await this._requireTraineeProfile(userId);

    const competencies = await this.prisma.traineeCompetency.findMany({
      where: { traineeProfileId: profile.id },
      include: {
        competency: {
          include: { competencySkills: { include: { skill: true } } },
        },
      },
    });

    if (competencies.length === 0) {
      return {
        traineeProfileId: profile.id,
        summary: { total: 0, none: 0, low: 0, medium: 0, high: 0, critical: 0 },
        gaps: [],
        computedAt: new Date().toISOString(),
      };
    }

    // Recompute all gaps in parallel
    const gapResults = await Promise.all(
      competencies.map(async (tc) => {
        const gap = await this._computeAndPersistGap(
          tc.id,
          tc.currentLevel,
          tc.requiredLevel,
        );
        return {
          traineeCompetencyId: tc.id,
          competencyName: tc.competency.name,
          category: tc.competency.category,
          currentLevel: tc.currentLevel,
          requiredLevel: tc.requiredLevel,
          targetLevel: tc.targetLevel,
          skills: tc.competency.competencySkills.map((cs) => cs.skill.name),
          gapValue: gap.gapValue,
          gapClassification: gap.gapClassification,
          computedAt: gap.computedAt,
        };
      }),
    );

    // Sort by severity (critical first)
    const severityOrder: Record<GapClassification, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      none: 4,
    };
    gapResults.sort(
      (a, b) =>
        severityOrder[a.gapClassification] - severityOrder[b.gapClassification],
    );

    // Build summary counts
    const summary = gapResults.reduce(
      (acc, g) => {
        acc[g.gapClassification]++;
        acc.total++;
        return acc;
      },
      { total: 0, none: 0, low: 0, medium: 0, high: 0, critical: 0 },
    );

    return {
      traineeProfileId: profile.id,
      summary,
      gaps: gapResults,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Returns only competencies with a gap at or above a threshold classification.
   * Useful for targeted recommendation feeds.
   */
  async getCriticalGaps(
    userId: string,
    minClassification: GapClassification = GapClassification.medium,
  ): Promise<any> {
    const report = await this.computeSkillGapReport(userId);
    const thresholds: Record<GapClassification, number> = {
      none: 0, low: 1, medium: 2, high: 3, critical: 4,
    };
    const minScore = thresholds[minClassification];
    return {
      ...report,
      gaps: report.gaps.filter(
        (g: any) => thresholds[g.gapClassification] >= minScore,
      ),
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async _requireTraineeProfile(userId: string): Promise<any> {
    const profile = await this.prisma.traineeProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(
        `TraineeProfile not found for user ${userId}`,
      );
    }
    return profile;
  }

  /**
   * Core gap formula: gapValue = max(0, requiredLevel - currentLevel)
   * Maps numeric gap → GapClassification enum:
   *   0 → none | 1 → low | 2 → medium | 3 → high | 4+ → critical
   */
  private async _computeAndPersistGap(
    traineeCompetencyId: string,
    currentLevel: number,
    requiredLevel: number,
  ): Promise<any> {
    const gapValue = Math.max(0, requiredLevel - currentLevel);

    const classificationMap: Record<number, GapClassification> = {
      0: GapClassification.none,
      1: GapClassification.low,
      2: GapClassification.medium,
      3: GapClassification.high,
    };
    const gapClassification: GapClassification =
      gapValue >= 4 ? GapClassification.critical : classificationMap[gapValue];

    return this.prisma.skillGapAnalysis.create({
      data: { traineeCompetencyId, gapValue, gapClassification },
    });
  }
}

