import { Controller, Get, Patch, Param, Body, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateTrainerVerificationDto } from './dto/update-trainer-verification.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getUsers(page, limit);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ): Promise<any> {
    return this.adminService.updateUserStatus(id, updateUserStatusDto.status);
  }

  @Get('trainers/pending')
  getPendingTrainers(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<any> {
    return this.adminService.getPendingTrainers(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Patch('trainers/:id/verify')
  updateTrainerVerification(
    @Param('id') id: string,
    @Body() updateTrainerVerificationDto: UpdateTrainerVerificationDto,
  ): Promise<any> {
    return this.adminService.updateTrainerVerification(id, updateTrainerVerificationDto.status);
  }

  @Get('audit-logs')
  getAuditLogs(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<any> {
    return this.adminService.getAuditLogs(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
