import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/v1')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  // ─── Trainee: compute & retrieve trainer matches ──────────────────────────────

  /** Recompute trainer matches for the authenticated trainee */
  @Post('me/match-trainers')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  computeMyMatches(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.matchingService.computeMatchesForTrainee(
      userId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /** Get cached trainer matches for the authenticated trainee */
  @Get('me/trainer-matches')
  @UseGuards(JwtAuthGuard)
  getMyMatches(@CurrentUser('id') userId: string): Promise<any> {
    return this.matchingService.getCachedMatches(userId);
  }

  // ─── Admin/Trainer: course-to-trainer matching ────────────────────────────────

  /** Find best trainers for a given course's skill requirements */
  @Post('courses/:courseId/match-trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'trainer')
  @HttpCode(HttpStatus.OK)
  matchTrainersForCourse(
    @Param('courseId') courseId: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.matchingService.matchTrainersForCourse(
      courseId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  // ─── Admin: compute matches for any trainee ───────────────────────────────────

  @Post('trainees/:userId/match-trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  computeMatchesForTrainee(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.matchingService.computeMatchesForTrainee(
      userId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}

