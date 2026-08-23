import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { Request } from 'express';
import { extractIp } from '../../common/utils/extract-ip';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExplainSkillGapDto, RecommendTrainersDto, DraftCourseOutlineDto } from './dto/ai-request.dto';

@Controller('api/v1/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ ai: { limit: 10, ttl: 60000 } })
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('explain-skill-gap')
  @Roles('trainee', 'trainer', 'admin')
  @HttpCode(HttpStatus.OK)
  explainSkillGap(
    @Body() dto: ExplainSkillGapDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<any> {
    return this.aiService.explainSkillGap(dto, userId, extractIp(req));
  }

  @Post('recommend-trainers')
  @Roles('trainee', 'admin')
  @HttpCode(HttpStatus.OK)
  recommendTrainers(
    @Body() dto: RecommendTrainersDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<any> {
    return this.aiService.recommendTrainers(dto, userId, extractIp(req));
  }

  @Post('draft-course-outline')
  @Roles('trainer')
  @HttpCode(HttpStatus.CREATED)
  draftCourseOutline(
    @Body() dto: DraftCourseOutlineDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<any> {
    return this.aiService.draftCourseOutline(dto, userId, extractIp(req));
  }
}
