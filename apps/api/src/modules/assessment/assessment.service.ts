import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AssessmentType } from '@repo/db';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class AssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Assessment CRUD ──────────────────────────────────────────────────────────

  async createAssessment(
    creatorUserId: string,
    dto: CreateAssessmentDto,
    ipAddress: string | null = null,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          courseId: dto.courseId,
          subject: dto.subject,
          type: dto.type,
          timeLimitMinutes: dto.timeLimitMinutes,
          passScorePct: dto.passScorePct ?? 60,
          randomizeQuestions: dto.randomizeQuestions ?? true,
          randomizeOptions: dto.randomizeOptions ?? true,
          createdById: creatorUserId,
        },
      });

      await this.auditService.log({
        actorUserId: creatorUserId,
        action: 'assessment.created',
        entityType: 'Assessment',
        entityId: assessment.id,
        ipAddress,
        metadata: { courseId: dto.courseId, type: dto.type },
        prisma: tx,
      });

      return assessment;
    });
  }

  /**
   * Get assessment metadata. NEVER returns isCorrect on options.
   */
  async getAssessment(assessmentId: string): Promise<any> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: { select: { id: true, title: true } },
        questions: {
          include: {
            options: {
              select: {
                id: true,
                optionText: true,
                // isCorrect intentionally excluded for security
              },
            },
          },
        },
        _count: { select: { questions: true, attempts: true } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  // ─── Question Management (Trainer) ────────────────────────────────────────────

  async addQuestion(
    trainerUserId: string,
    assessmentId: string,
    dto: AddQuestionDto,
    ipAddress: string | null = null,
  ): Promise<any> {
    const assessment = await this._requireAssessment(assessmentId);
    await this._assertAssessmentOwner(trainerUserId, assessment);

    const correctCount = dto.options.filter((o) => o.isCorrect).length;
    if (dto.questionType === 'single_mcq' || dto.questionType === 'true_false') {
      if (correctCount !== 1) {
        throw new BadRequestException(
          `${dto.questionType} question must have exactly 1 correct answer`,
        );
      }
    }
    if (dto.questionType === 'multi_mcq' && correctCount < 1) {
      throw new BadRequestException(
        'multi_mcq question must have at least 1 correct answer',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const question = await tx.assessmentQuestion.create({
        data: {
          assessmentId,
          questionType: dto.questionType,
          questionText: dto.questionText,
          difficulty: dto.difficulty,
          points: dto.points,
          options: {
            create: dto.options.map((o) => ({
              optionText: o.optionText,
              isCorrect: o.isCorrect,
            })),
          },
        },
        include: {
          options: { select: { id: true, optionText: true } },
        },
      });

      await this.auditService.log({
        actorUserId: trainerUserId,
        action: 'assessment.question_added',
        entityType: 'AssessmentQuestion',
        entityId: question.id,
        ipAddress,
        metadata: { assessmentId, questionType: dto.questionType },
        prisma: tx,
      });

      return question;
    });
  }

  async deleteQuestion(
    trainerUserId: string,
    assessmentId: string,
    questionId: string,
  ): Promise<any> {
    const assessment = await this._requireAssessment(assessmentId);
    await this._assertAssessmentOwner(trainerUserId, assessment);

    const question = await this.prisma.assessmentQuestion.findFirst({
      where: { id: questionId, assessmentId },
    });
    if (!question) throw new NotFoundException('Question not found');

    return this.prisma.assessmentQuestion.delete({ where: { id: questionId } });
  }

  // ─── Attempt Engine (Trainee) ─────────────────────────────────────────────────

  /**
   * Start an attempt. Returns shuffled questions with shuffled options.
   * isCorrect is NEVER included in the response — security enforced here.
   */
  async startAttempt(traineeUserId: string, assessmentId: string): Promise<any> {
    const traineeProfile = await this._requireTraineeProfile(traineeUserId);
    const assessment = await this._requireAssessment(assessmentId);

    // Determine attempt number
    const prevAttempts = await this.prisma.assessmentAttempt.count({
      where: {
        assessmentId,
        traineeId: traineeProfile.id,
      },
    });

    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        traineeId: traineeProfile.id,
        startedAt: new Date(),
        attemptNumber: prevAttempts + 1,
      },
    });

    // Fetch questions from DB (with correct answers for server grading reference)
    const questions = await this.prisma.assessmentQuestion.findMany({
      where: { assessmentId },
      include: { options: true },
    });

    // Shuffle questions if configured
    let orderedQuestions = assessment.randomizeQuestions
      ? this._shuffle([...questions])
      : questions;

    // Build client-safe response: strip isCorrect from options
    const clientQuestions = orderedQuestions.map((q) => ({
      id: q.id,
      questionType: q.questionType,
      questionText: q.questionText,
      difficulty: q.difficulty,
      points: q.points,
      options: assessment.randomizeOptions
        ? this._shuffle(
            q.options.map((o) => ({
              id: o.id,
              optionText: o.optionText,
              // isCorrect intentionally excluded
            })),
          )
        : q.options.map((o) => ({
            id: o.id,
            optionText: o.optionText,
          })),
    }));

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
      passScorePct: assessment.passScorePct,
      totalQuestions: clientQuestions.length,
      questions: clientQuestions,
    };
  }

  /**
   * Submit answers. Server grades, enforces time limits, persists results.
   */
  async submitAttempt(
    traineeUserId: string,
    assessmentId: string,
    attemptId: string,
    dto: SubmitAttemptDto,
    ipAddress: string | null = null,
  ): Promise<any> {
    const traineeProfile = await this._requireTraineeProfile(traineeUserId);

    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        assessmentId,
        traineeId: traineeProfile.id,
      },
      include: { assessment: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.submittedAt) {
      throw new BadRequestException('Attempt already submitted');
    }

    if (attempt.assessment.timeLimitMinutes) {
      const elapsedMs = Date.now() - attempt.startedAt.getTime();
      const limitMs = attempt.assessment.timeLimitMinutes * 60 * 1000;
      if (elapsedMs > limitMs + 30_000) {
        throw new BadRequestException('Time limit exceeded');
      }
    }

    const questions = await this.prisma.assessmentQuestion.findMany({
      where: { assessmentId },
      include: { options: { where: { isCorrect: true } } },
    });

    const correctMap = new Map<string, Set<string>>();
    let totalPoints = 0;
    for (const q of questions) {
      const correctIds = new Set(q.options.map((o) => o.id));
      correctMap.set(q.id, correctIds);
      totalPoints += q.points;
    }

    let earnedPoints = 0;
    const answerRecords: any[] = [];

    for (const answer of dto.answers) {
      const correctIds = correctMap.get(answer.questionId);
      if (!correctIds) continue;

      const selected = new Set(answer.selectedOptionIds);
      const isCorrect =
        selected.size === correctIds.size &&
        [...selected].every((id) => correctIds.has(id));

      const question = questions.find((q) => q.id === answer.questionId);
      if (isCorrect && question) {
        earnedPoints += question.points;
      }

      answerRecords.push({
        attemptId,
        questionId: answer.questionId,
        selectedOptionIds: answer.selectedOptionIds,
        isCorrect,
      });
    }

    const scorePct = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = scorePct >= attempt.assessment.passScorePct;
    const submittedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.assessmentAnswer.createMany({ data: answerRecords });
      await tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          submittedAt,
          scorePct,
          passed,
        },
      });

      await this.auditService.log({
        actorUserId: traineeUserId,
        action: 'assessment.attempt_submitted',
        entityType: 'AssessmentAttempt',
        entityId: attemptId,
        ipAddress,
        metadata: { scorePct, passed },
        prisma: tx,
      });

      return {
        attemptId,
        scorePct: Math.round(scorePct * 100) / 100,
        passed,
        earnedPoints,
        totalPoints,
        passScorePct: attempt.assessment.passScorePct,
        submittedAt,
      };
    });
  }

  async getMyAttempts(
    traineeUserId: string,
    assessmentId: string,
  ): Promise<any> {
    const traineeProfile = await this._requireTraineeProfile(traineeUserId);
    return this.prisma.assessmentAttempt.findMany({
      where: { assessmentId, traineeId: traineeProfile.id },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        attemptNumber: true,
        startedAt: true,
        submittedAt: true,
        scorePct: true,
        passed: true,
      },
    });
  }

  async getAttemptResult(
    traineeUserId: string,
    assessmentId: string,
    attemptId: string,
  ): Promise<any> {
    const traineeProfile = await this._requireTraineeProfile(traineeUserId);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, assessmentId, traineeId: traineeProfile.id },
      include: {
        answers: {
          include: {
            question: {
              include: {
                options: { select: { id: true, optionText: true, isCorrect: true } },
              },
            },
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (!attempt.submittedAt) {
      throw new BadRequestException('Attempt not yet submitted');
    }
    return attempt;
  }

  /**
   * Pre/post-test delta: compares earliest pre_test score vs latest post_test score
   * for a trainee on a given course, computing absolute and percentage improvement.
   */
  async getPrePostDelta(
    traineeUserId: string,
    courseId: string,
  ): Promise<any> {
    const traineeProfile = await this._requireTraineeProfile(traineeUserId);

    const assessments = await this.prisma.assessment.findMany({
      where: { courseId },
      select: { id: true, type: true },
    });

    const preTestIds = assessments
      .filter((a) => a.type === AssessmentType.pre_test)
      .map((a) => a.id);
    const postTestIds = assessments
      .filter((a) => a.type === AssessmentType.post_test)
      .map((a) => a.id);

    const [preAttempt, postAttempt] = await Promise.all([
      this.prisma.assessmentAttempt.findFirst({
        where: {
          assessmentId: { in: preTestIds },
          traineeId: traineeProfile.id,
          submittedAt: { not: null },
        },
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.assessmentAttempt.findFirst({
        where: {
          assessmentId: { in: postTestIds },
          traineeId: traineeProfile.id,
          submittedAt: { not: null },
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    if (!preAttempt) {
      return { hasPreTest: false, hasPostTest: !!postAttempt, delta: null };
    }

    const prePct = Number(preAttempt.scorePct ?? 0);
    const postPct = postAttempt ? Number(postAttempt.scorePct ?? 0) : null;
    const absoluteDelta = postPct !== null ? postPct - prePct : null;
    const percentageImprovement =
      prePct > 0 && absoluteDelta !== null
        ? ((absoluteDelta / prePct) * 100).toFixed(1)
        : null;

    return {
      hasPreTest: true,
      hasPostTest: !!postAttempt,
      preTestScore: prePct,
      postTestScore: postPct,
      absoluteDelta: absoluteDelta !== null ? Math.round(absoluteDelta * 100) / 100 : null,
      percentageImprovement,
      interpretation:
        absoluteDelta === null
          ? 'Post-test not yet taken'
          : absoluteDelta > 0
            ? 'Improvement detected'
            : absoluteDelta === 0
              ? 'No change'
              : 'Performance declined',
    };
  }

  async getAdminResults(assessmentId: string): Promise<any> {
    const assessment = await this._requireAssessment(assessmentId);
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { assessmentId },
      include: {
        trainee: {
          select: { id: true, user: { select: { email: true } } },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const submitted = attempts.filter((a) => a.submittedAt);
    const scores = submitted.map((a) => Number(a.scorePct ?? 0));
    const avgScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const passRate =
      submitted.length > 0
        ? (submitted.filter((a) => a.passed).length / submitted.length) * 100
        : null;

    return {
      assessment: {
        id: assessment.id,
        subject: assessment.subject,
        type: assessment.type,
        passScorePct: assessment.passScorePct,
      },
      stats: {
        totalAttempts: attempts.length,
        submittedAttempts: submitted.length,
        avgScore: avgScore !== null ? Math.round(avgScore * 100) / 100 : null,
        passRate: passRate !== null ? Math.round(passRate * 10) / 10 : null,
      },
      attempts,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async _requireAssessment(assessmentId: string) {
    const a = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!a) throw new NotFoundException('Assessment not found');
    return a;
  }

  private async _assertAssessmentOwner(
    userId: string,
    assessment: any,
  ): Promise<void> {
    if (assessment.createdById !== userId) {
      // Check if it's the trainer's own assessment via trainer profile
      const trainer = await this.prisma.trainerProfile.findUnique({
        where: { userId },
      });
      if (!trainer) throw new ForbiddenException('Access denied');
      // If assessment was created by this trainer (userId = createdById), pass
      if (assessment.createdById !== userId) {
        throw new ForbiddenException('You do not own this assessment');
      }
    }
  }

  private async _requireTraineeProfile(userId: string) {
    const profile = await this.prisma.traineeProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Trainee profile not found');
    return profile;
  }

  /** Fisher-Yates shuffle */
  private _shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
