import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStatus } from '@repo/db';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Weights for the multi-signal matching algorithm.
 * Sum = 1.0 — each factor contributes a normalised 0-1 sub-score.
 */
const WEIGHTS = {
  skillOverlap: 0.35,     // % of trainee's gap-skills covered by trainer
  proficiencyDelta: 0.20, // how far above required level the trainer is
  availability: 0.15,     // trainer has declared availability slots
  experience: 0.10,       // years of experience (capped at 20)
  rating: 0.10,           // trainer average rating (0-5 scale)
  certification: 0.10,    // % of matched skills where trainer is certified
};

interface MatchResult {
  trainerId: string;
  trainerUserId: string;
  trainerName?: string;
  matchScore: number;
  reasons: string[];
  breakdown: Record<string, number>;
}

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute match scores for a trainee against all verified trainers.
   * Persists results to TrainerMatchScore table and returns ranked list.
   */
  async computeMatchesForTrainee(
    userId: string,
    limit: number = 10,
  ): Promise<any> {
    const traineeProfile = await this.prisma.traineeProfile.findUnique({
      where: { userId },
      include: {
        traineeCompetencies: {
          include: {
            competency: {
              include: { competencySkills: true },
            },
            skillGaps: { orderBy: { computedAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    if (!traineeProfile) {
      throw new NotFoundException(`TraineeProfile not found for user ${userId}`);
    }

    // Collect all skill IDs the trainee needs (from competencies with a gap > 0)
    const neededSkillIds = new Set<string>();
    for (const tc of traineeProfile.traineeCompetencies) {
      if (tc.currentLevel < tc.requiredLevel) {
        for (const cs of tc.competency.competencySkills) {
          neededSkillIds.add(cs.skillId);
        }
      }
    }

    if (neededSkillIds.size === 0) {
      return {
        traineeProfileId: traineeProfile.id,
        neededSkills: 0,
        matches: [],
        message: 'No skill gaps found — no matching needed.',
      };
    }

    // Fetch all verified trainers with their expertise & availability
    const trainers = await this.prisma.trainerProfile.findMany({
      where: { verificationStatus: VerificationStatus.verified },
      include: {
        user: { select: { id: true, email: true } },
        expertise: { include: { skill: true } },
        availability: true,
        ratings: true,
      },
    });

    // Score each trainer
    const results: MatchResult[] = [];

    for (const trainer of trainers) {
      const { score, reasons, breakdown } = this._scoreTrainer(
        trainer,
        neededSkillIds,
        traineeProfile.traineeCompetencies,
      );

      if (score > 0) {
        results.push({
          trainerId: trainer.id,
          trainerUserId: trainer.userId,
          trainerName: trainer.user?.email,
          matchScore: Math.round(score * 10000) / 10000, // 4 decimal places
          reasons,
          breakdown,
        });
      }
    }

    // Sort descending by matchScore
    results.sort((a, b) => b.matchScore - a.matchScore);
    const topResults = results.slice(0, limit);

    // Persist match scores (delete old ones for this trainee first)
    await this.prisma.trainerMatchScore.deleteMany({
      where: { traineeId: traineeProfile.id },
    });

    if (topResults.length > 0) {
      await this.prisma.trainerMatchScore.createMany({
        data: topResults.map((r) => ({
          traineeId: traineeProfile.id,
          trainerId: r.trainerId,
          matchScore: new Decimal(r.matchScore),
          reasons: r.reasons,
        })),
      });
    }

    return {
      traineeProfileId: traineeProfile.id,
      neededSkills: neededSkillIds.size,
      totalTrainersEvaluated: trainers.length,
      matches: topResults,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Get the most recent cached match results for a trainee.
   */
  async getCachedMatches(userId: string): Promise<any> {
    const profile = await this.prisma.traineeProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(`TraineeProfile not found for user ${userId}`);
    }

    const matches = await this.prisma.trainerMatchScore.findMany({
      where: { traineeId: profile.id },
      include: {
        trainer: {
          include: {
            user: { select: { email: true } },
            expertise: { include: { skill: true } },
            ratings: true,
          },
        },
      },
      orderBy: { matchScore: 'desc' },
    });

    return {
      traineeProfileId: profile.id,
      matches: matches.map((m) => ({
        trainerId: m.trainerId,
        trainerEmail: m.trainer?.user?.email,
        matchScore: Number(m.matchScore),
        reasons: m.reasons,
        computedAt: m.computedAt,
        trainerRating: m.trainer?.ratings
          ? Number(m.trainer.ratings.avgRating)
          : null,
      })),
    };
  }

  /**
   * Admin/trainer: find best trainers for a specific course's skill requirements.
   */
  async matchTrainersForCourse(
    courseId: string,
    limit: number = 10,
  ): Promise<any> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { courseSkills: true },
    });
    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    const courseSkillIds = new Set(course.courseSkills.map((cs) => cs.skillId));
    if (courseSkillIds.size === 0) {
      return {
        courseId,
        matches: [],
        message: 'Course has no skills defined.',
      };
    }

    const trainers = await this.prisma.trainerProfile.findMany({
      where: { verificationStatus: VerificationStatus.verified },
      include: {
        user: { select: { id: true, email: true } },
        expertise: { include: { skill: true } },
        availability: true,
        ratings: true,
      },
    });

    const results: MatchResult[] = [];
    for (const trainer of trainers) {
      const { score, reasons, breakdown } = this._scoreTrainerForSkills(
        trainer,
        courseSkillIds,
      );
      if (score > 0) {
        results.push({
          trainerId: trainer.id,
          trainerUserId: trainer.userId,
          trainerName: trainer.user?.email,
          matchScore: Math.round(score * 10000) / 10000,
          reasons,
          breakdown,
        });
      }
    }

    results.sort((a, b) => b.matchScore - a.matchScore);
    const topResults = results.slice(0, limit);

    // Persist course-level match scores
    await this.prisma.trainerMatchScore.deleteMany({
      where: { courseId },
    });
    if (topResults.length > 0) {
      await this.prisma.trainerMatchScore.createMany({
        data: topResults.map((r) => ({
          courseId,
          trainerId: r.trainerId,
          matchScore: new Decimal(r.matchScore),
          reasons: r.reasons,
        })),
      });
    }

    return {
      courseId,
      courseTitle: course.title,
      requiredSkills: courseSkillIds.size,
      totalTrainersEvaluated: trainers.length,
      matches: topResults,
      computedAt: new Date().toISOString(),
    };
  }

  // ─── Private Scoring Logic ──────────────────────────────────────────────────

  private _scoreTrainer(
    trainer: any,
    neededSkillIds: Set<string>,
    traineeCompetencies: any[],
  ): { score: number; reasons: string[]; breakdown: Record<string, number> } {
    const reasons: string[] = [];
    const trainerSkillMap = new Map<string, any>();
    for (const exp of trainer.expertise) {
      trainerSkillMap.set(exp.skillId, exp);
    }

    // 1. Skill Overlap: % of needed skills covered
    const matchedSkills = [...neededSkillIds].filter((id) =>
      trainerSkillMap.has(id),
    );
    const skillOverlapScore =
      neededSkillIds.size > 0
        ? matchedSkills.length / neededSkillIds.size
        : 0;
    if (matchedSkills.length > 0) {
      reasons.push(
        `Covers ${matchedSkills.length}/${neededSkillIds.size} needed skills`,
      );
    }

    // 2. Proficiency Delta: avg (trainerLevel - requiredLevel) / 4, clamped 0-1
    let profDeltaSum = 0;
    let profCount = 0;
    for (const tc of traineeCompetencies) {
      for (const cs of tc.competency.competencySkills) {
        const exp = trainerSkillMap.get(cs.skillId);
        if (exp) {
          profDeltaSum += Math.max(0, exp.proficiencyLevel - tc.requiredLevel);
          profCount++;
        }
      }
    }
    const profDeltaScore =
      profCount > 0
        ? Math.min(1, profDeltaSum / profCount / 4)
        : 0;
    if (profDeltaScore > 0.5) {
      reasons.push('Expertise significantly above required levels');
    }

    // 3. Availability: has declared any slots = 1, none = 0
    const availabilityScore = trainer.availability.length > 0 ? 1 : 0;
    if (availabilityScore > 0) {
      reasons.push(
        `${trainer.availability.length} availability slot(s) declared`,
      );
    }

    // 4. Experience: years / 20, capped at 1
    const experienceScore = Math.min(1, trainer.yearsExperience / 20);
    if (trainer.yearsExperience >= 5) {
      reasons.push(`${trainer.yearsExperience} years of experience`);
    }

    // 5. Rating: avg / 5
    const avgRating = trainer.ratings
      ? Number(trainer.ratings.avgRating)
      : 0;
    const ratingScore = avgRating / 5;
    if (avgRating >= 4) {
      reasons.push(`Rated ${avgRating.toFixed(1)}/5`);
    }

    // 6. Certification: % of matched skills where trainer is certified
    const certifiedCount = matchedSkills.filter(
      (id) => trainerSkillMap.get(id)?.certified,
    ).length;
    const certScore =
      matchedSkills.length > 0
        ? certifiedCount / matchedSkills.length
        : 0;
    if (certifiedCount > 0) {
      reasons.push(`Certified in ${certifiedCount} matched skill(s)`);
    }

    // Weighted sum
    const breakdown = {
      skillOverlap: skillOverlapScore,
      proficiencyDelta: profDeltaScore,
      availability: availabilityScore,
      experience: experienceScore,
      rating: ratingScore,
      certification: certScore,
    };

    const score =
      WEIGHTS.skillOverlap * skillOverlapScore +
      WEIGHTS.proficiencyDelta * profDeltaScore +
      WEIGHTS.availability * availabilityScore +
      WEIGHTS.experience * experienceScore +
      WEIGHTS.rating * ratingScore +
      WEIGHTS.certification * certScore;

    const clampedScore = Math.min(1, Math.max(0, score));

    return { score: clampedScore, reasons, breakdown };
  }

  /**
   * Simplified scorer for course-to-trainer matching (no trainee context).
   */
  private _scoreTrainerForSkills(
    trainer: any,
    requiredSkillIds: Set<string>,
  ): { score: number; reasons: string[]; breakdown: Record<string, number> } {
    const reasons: string[] = [];
    const trainerSkillMap = new Map<string, any>();
    for (const exp of trainer.expertise) {
      trainerSkillMap.set(exp.skillId, exp);
    }

    const matchedSkills = [...requiredSkillIds].filter((id) =>
      trainerSkillMap.has(id),
    );
    const skillOverlapScore =
      requiredSkillIds.size > 0
        ? matchedSkills.length / requiredSkillIds.size
        : 0;
    if (matchedSkills.length > 0) {
      reasons.push(
        `Covers ${matchedSkills.length}/${requiredSkillIds.size} course skills`,
      );
    }

    // Avg proficiency of matched skills / 5
    let profSum = 0;
    for (const id of matchedSkills) {
      profSum += trainerSkillMap.get(id)?.proficiencyLevel ?? 0;
    }
    const profScore =
      matchedSkills.length > 0
        ? Math.min(1, profSum / matchedSkills.length / 5)
        : 0;

    const availabilityScore = trainer.availability.length > 0 ? 1 : 0;
    if (availabilityScore > 0) {
      reasons.push(`${trainer.availability.length} availability slot(s)`);
    }

    const experienceScore = Math.min(1, trainer.yearsExperience / 20);
    if (trainer.yearsExperience >= 5) {
      reasons.push(`${trainer.yearsExperience} years experience`);
    }

    const avgRating = trainer.ratings
      ? Number(trainer.ratings.avgRating)
      : 0;
    const ratingScore = avgRating / 5;
    if (avgRating >= 4) {
      reasons.push(`Rated ${avgRating.toFixed(1)}/5`);
    }

    const certifiedCount = matchedSkills.filter(
      (id) => trainerSkillMap.get(id)?.certified,
    ).length;
    const certScore =
      matchedSkills.length > 0
        ? certifiedCount / matchedSkills.length
        : 0;
    if (certifiedCount > 0) {
      reasons.push(`Certified in ${certifiedCount} skill(s)`);
    }

    const breakdown = {
      skillOverlap: skillOverlapScore,
      proficiency: profScore,
      availability: availabilityScore,
      experience: experienceScore,
      rating: ratingScore,
      certification: certScore,
    };

    const score =
      WEIGHTS.skillOverlap * skillOverlapScore +
      WEIGHTS.proficiencyDelta * profScore +
      WEIGHTS.availability * availabilityScore +
      WEIGHTS.experience * experienceScore +
      WEIGHTS.rating * ratingScore +
      WEIGHTS.certification * certScore;

    const clampedScore = Math.min(1, Math.max(0, score));

    return { score: clampedScore, reasons, breakdown };
  }
}

