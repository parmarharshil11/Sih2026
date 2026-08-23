import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CompetencyService } from './competency.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpsertTraineeCompetencyDto } from './dto/upsert-trainee-competency.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { CreateCompetencyDto } from './dto/create-competency.dto';

@Controller('api/v1')
export class CompetencyController {
  constructor(private readonly competencyService: CompetencyService) {}

  // ─── Skills ───────────────────────────────────────────────────────────────────

  @Get('skills')
  @UseGuards(JwtAuthGuard)
  listSkills(@Query('category') category?: string): Promise<any> {
    return this.competencyService.listSkills(category);
  }

  @Post('skills')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  createSkill(@Body() dto: CreateSkillDto): Promise<any> {
    return this.competencyService.createSkill(dto);
  }

  // ─── Competencies ─────────────────────────────────────────────────────────────

  @Get('competencies')
  @UseGuards(JwtAuthGuard)
  listCompetencies(@Query('category') category?: string): Promise<any> {
    return this.competencyService.listCompetencies(category);
  }

  @Post('competencies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  createCompetency(@Body() dto: CreateCompetencyDto): Promise<any> {
    return this.competencyService.createCompetency(dto);
  }

  // ─── Trainee Competencies (self) ──────────────────────────────────────────────

  @Get('me/competencies')
  @UseGuards(JwtAuthGuard)
  getMyCompetencies(@CurrentUser('id') userId: string): Promise<any> {
    return this.competencyService.getTraineeCompetencies(userId);
  }

  @Put('me/competencies')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  upsertMyCompetency(
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertTraineeCompetencyDto,
  ): Promise<any> {
    return this.competencyService.upsertTraineeCompetency(userId, dto);
  }

  // ─── Skill Gap Report ─────────────────────────────────────────────────────────

  /** Full skill gap report — recomputes all gaps, sorted by severity */
  @Get('me/skill-gap-report')
  @UseGuards(JwtAuthGuard)
  getMySkillGapReport(@CurrentUser('id') userId: string): Promise<any> {
    return this.competencyService.computeSkillGapReport(userId);
  }

  /** Only gaps at or above minLevel (default: medium) */
  @Get('me/critical-gaps')
  @UseGuards(JwtAuthGuard)
  getMyCriticalGaps(
    @CurrentUser('id') userId: string,
    @Query('minLevel') minLevel?: string,
  ): Promise<any> {
    const validLevels = ['none', 'low', 'medium', 'high', 'critical'];
    const min = validLevels.includes(minLevel) ? (minLevel as any) : undefined;
    return this.competencyService.getCriticalGaps(userId, min);
  }

  // ─── Admin / Trainer: view any trainee's gap report ───────────────────────────

  @Get('trainees/:userId/skill-gap-report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'trainer')
  getTraineeSkillGapReport(@Param('userId') userId: string): Promise<any> {
    return this.competencyService.computeSkillGapReport(userId);
  }
}
