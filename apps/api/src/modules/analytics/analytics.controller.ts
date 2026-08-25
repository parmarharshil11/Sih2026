import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('admin-dashboard')
  @Roles('admin')
  getAdminDashboard(): Promise<any> {
    return this.analyticsService.getAdminDashboard();
  }

  @Get('trainee-dashboard')
  @Roles('trainee')
  getTraineeDashboard(@CurrentUser('id') userId: string): Promise<any> {
    return this.analyticsService.getTraineeDashboard(userId);
  }

  @Get('heatmap')
  @Roles('admin', 'trainer')
  getHeatmap(): Promise<any> {
    return this.analyticsService.getHeatmap();
  }

  @Get('reports/courses')
  @Roles('admin')
  getCoursesReport(): Promise<any> {
    return this.analyticsService.getCoursesReport();
  }

  @Get('critical-gap-feed')
  @Roles('admin')
  getCriticalGapFeed(): Promise<any> {
    return this.analyticsService.getCriticalGapFeed();
  }

  @Get('difficult-assessments')
  @Roles('admin')
  getDifficultAssessments(): Promise<any> {
    return this.analyticsService.getDifficultAssessments();
  }
}
