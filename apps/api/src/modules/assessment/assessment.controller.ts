import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Controller('api/v1')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  // ─── Assessment Management (Trainer) ──────────────────────────────────────────

  @Post('assessments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer', 'admin')
  @HttpCode(HttpStatus.CREATED)
  createAssessment(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAssessmentDto,
  ): Promise<any> {
    return this.assessmentService.createAssessment(userId, dto);
  }

  @Get('assessments/:id')
  @UseGuards(JwtAuthGuard)
  getAssessment(@Param('id') id: string): Promise<any> {
    return this.assessmentService.getAssessment(id);
  }

  @Post('assessments/:id/questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer', 'admin')
  @HttpCode(HttpStatus.CREATED)
  addQuestion(
    @CurrentUser('id') userId: string,
    @Param('id') assessmentId: string,
    @Body() dto: AddQuestionDto,
  ): Promise<any> {
    return this.assessmentService.addQuestion(userId, assessmentId, dto);
  }

  @Delete('assessments/:id/questions/:questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteQuestion(
    @CurrentUser('id') userId: string,
    @Param('id') assessmentId: string,
    @Param('questionId') questionId: string,
  ): Promise<any> {
    return this.assessmentService.deleteQuestion(userId, assessmentId, questionId);
  }

  // ─── Attempt Endpoints (Trainee) ──────────────────────────────────────────────

  /**
   * Start attempt — returns shuffled questions WITHOUT isCorrect fields.
   */
  @Post('assessments/:id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainee')
  @HttpCode(HttpStatus.CREATED)
  startAttempt(
    @CurrentUser('id') userId: string,
    @Param('id') assessmentId: string,
  ): Promise<any> {
    return this.assessmentService.startAttempt(userId, assessmentId);
  }

  /**
   * Submit attempt answers — graded server-side, returns score + pass/fail.
   */
  @Post('assessments/:id/attempts/:attemptId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainee')
  @HttpCode(HttpStatus.OK)
  submitAttempt(
    @CurrentUser('id') userId: string,
    @Param('id') assessmentId: string,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitAttemptDto,
  ): Promise<any> {
    return this.assessmentService.submitAttempt(userId, assessmentId, attemptId, dto);
  }

  @Get('assessments/:id/attempts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainee')
  getMyAttempts(
    @CurrentUser('id') userId: string,
    @Param('id') assessmentId: string,
  ): Promise<any> {
    return this.assessmentService.getMyAttempts(userId, assessmentId);
  }

  @Get('assessments/:id/attempts/:attemptId/results')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainee')
  getAttemptResult(
    @CurrentUser('id') userId: string,
    @Param('id') assessmentId: string,
    @Param('attemptId') attemptId: string,
  ): Promise<any> {
    return this.assessmentService.getAttemptResult(userId, assessmentId, attemptId);
  }

  // ─── Pre/Post-Test Intelligence ────────────────────────────────────────────────

  @Get('courses/:courseId/pre-post-delta')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainee')
  getPrePostDelta(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
  ): Promise<any> {
    return this.assessmentService.getPrePostDelta(userId, courseId);
  }

  // ─── Admin/Trainer: All Results ────────────────────────────────────────────────

  @Get('assessments/:id/admin-results')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'trainer')
  getAdminResults(@Param('id') assessmentId: string): Promise<any> {
    return this.assessmentService.getAdminResults(assessmentId);
  }
}
