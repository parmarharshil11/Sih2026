import { Controller, Get, Patch, Param, Body, Query, UseGuards, ParseUUIDPipe, Req } from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { extractIp } from '../../common/utils/extract-ip';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateTrainerVerificationDto } from './dto/update-trainer-verification.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(@Query() query: PaginationQueryDto) {
    return this.adminService.getUsers(query.page || 1, query.limit || 10);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ): Promise<any> {
    return this.adminService.updateUserStatus(id, updateUserStatusDto.status, adminId, extractIp(req));
  }

  @Get('trainers/pending')
  getPendingTrainers(@Query() query: PaginationQueryDto): Promise<any> {
    return this.adminService.getPendingTrainers(query.page || 1, query.limit || 10);
  }

  @Patch('trainers/:id/verify')
  updateTrainerVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTrainerVerificationDto: UpdateTrainerVerificationDto,
    @CurrentUser('id') adminId: string,
    @Req() req: Request,
  ): Promise<any> {
    return this.adminService.updateTrainerVerification(id, updateTrainerVerificationDto.status, adminId, extractIp(req));
  }

  @Get('audit-logs')
  getAuditLogs(@Query() query: PaginationQueryDto): Promise<any> {
    return this.adminService.getAuditLogs(query.page || 1, query.limit || 20);
  }
}
