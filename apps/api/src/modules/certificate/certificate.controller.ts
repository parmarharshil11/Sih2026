import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Optional,
} from '@nestjs/common';
import { Request } from 'express';
import { CertificateService } from './certificate.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { extractIp } from '../../common/utils/extract-ip';

class IssueCertificateDto {
  @IsUUID()
  @IsNotEmpty()
  enrollmentId: string;
}

@Controller('api/v1/certificates')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  /**
   * PUBLIC endpoint — no authentication required.
   * Returns only sanitized cert info; records verification event.
   */
  @Get('verify/:token')
  verifyCertificate(
    @Param('token') token: string,
    @Req() req: Request,
  ): Promise<any> {
    return this.certificateService.verifyCertificate(token, extractIp(req));
  }

  /**
   * Issue a certificate for a completed enrollment.
   * Admin or the trainee who owns the enrollment may call this.
   */
  @Post('issue')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  issueCertificate(
    @Body() dto: IssueCertificateDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<any> {
    const baseUrl =
      process.env.API_BASE_URL ??
      `${req.protocol}://${req.get('host')}`;
    return this.certificateService.issueCertificate(dto.enrollmentId, baseUrl, userId, extractIp(req));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainee')
  getMyCertificates(@CurrentUser('id') userId: string): Promise<any> {
    return this.certificateService.getMyCertificates(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getCertificate(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.certificateService.getCertificate(id, user);
  }
}
