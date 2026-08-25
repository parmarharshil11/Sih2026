import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
    private auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress: string | null = null) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!role) throw new BadRequestException('Invalid role');

    const emailVerificationToken = uuidv4();

    const isDev = process.env.NODE_ENV !== 'production';

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          status: isDev ? 'active' : 'pending',
          emailVerifiedAt: isDev ? new Date() : null,
          emailVerificationToken: isDev ? null : emailVerificationToken,
          userRoles: { create: { roleId: role.id } },
        },
      });

      await this.auditService.log({
        actorUserId: user.id,
        action: 'auth.register',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        metadata: { role: dto.role, autoActivated: isDev },
        prisma: tx,
      });

      if (isDev) {
        return { message: 'Registration successful. Auto-activated for development.', userId: user.id };
      }

      // TODO: send verification email with emailVerificationToken
      return { message: 'Registration successful. Please verify your email.', userId: user.id };
    });
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });
    if (!user) throw new NotFoundException('Invalid or expired verification token');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        status: 'active',
        emailVerificationToken: null,
      },
    });
    return { message: 'Email verified successfully' };
  }

  async login(dto: LoginDto, res: any, ipAddress: string | null = null) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    if (user.status === 'suspended') throw new UnauthorizedException('Account suspended');
    if (user.status === 'pending') throw new UnauthorizedException('Account pending verification or approval');

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const lockData: any = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        lockData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      }
      await this.prisma.user.update({ where: { id: user.id }, data: lockData });
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
      });

      const accessToken = this.tokenService.generateAccessToken(user.id, user.email);
      const { token: refreshToken, jti } = this.tokenService.generateRefreshToken(user.id);

      const refreshTokenHash = await argon2.hash(refreshToken);
      await tx.refreshToken.create({
        data: { id: jti, userId: user.id, tokenHash: refreshTokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });

      await this.auditService.log({
        actorUserId: user.id,
        action: 'auth.login',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        metadata: null,
        prisma: tx,
      });

      this.tokenService.setTokenCookies(res, accessToken, refreshToken);
      
      const roles = user.userRoles.map((ur) => ur.role.name);
      
      // Also return tokens in response body so frontend clients (SPA) can persist them
      return { message: 'Login successful', accessToken, userId: user.id, roles };
    });
  }

  async refresh(userId: string, jti: string, rawRefreshToken: string, res: any) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { id: jti } });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    if (stored.userId !== userId) throw new UnauthorizedException('Token ownership mismatch');
    
    if (stored.revoked) {
      // Reuse detected — revoke all tokens for the STORED token's user (not the request param)
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Refresh token reuse detected. Please log in again.');
    }

    const tokenValid = await argon2.verify(stored.tokenHash, rawRefreshToken);
    if (!tokenValid) throw new UnauthorizedException('Invalid refresh token');

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({ where: { id: jti }, data: { revoked: true } });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const newAccessToken = this.tokenService.generateAccessToken(user.id, user.email);
    const { token: newRefreshToken, jti: newJti } = this.tokenService.generateRefreshToken(user.id);
    const newHash = await argon2.hash(newRefreshToken);
    await this.prisma.refreshToken.create({
      data: { id: newJti, userId: user.id, tokenHash: newHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    this.tokenService.setTokenCookies(res, newAccessToken, newRefreshToken);
    return { message: 'Token refreshed' };
  }

  async logout(userId: string, jti: string, res: any, ipAddress: string | null = null) {
    if (jti) {
      await this.prisma.refreshToken.update({ where: { id: jti }, data: { revoked: true } }).catch(() => {});
    }
    this.tokenService.clearTokenCookies(res);
    await this.auditService.log({
      actorUserId: userId,
      action: 'auth.logout',
      entityType: 'User',
      entityId: userId,
      ipAddress,
      metadata: null,
    });
    return { message: 'Logged out' };
  }

  async forgotPassword(email: string, ipAddress: string | null = null) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If that email exists, a reset link was sent.' };

    const resetToken = uuidv4();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });
      await this.auditService.log({
        actorUserId: user.id,
        action: 'auth.password_reset_requested',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        metadata: null,
        prisma: tx,
      });
    });
    // TODO: send reset email
    return { message: 'If that email exists, a reset link was sent.' };
  }

  async resetPassword(token: string, newPassword: string, ipAddress: string | null = null) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
      });
      await this.auditService.log({
        actorUserId: user.id,
        action: 'auth.password_reset_completed',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        metadata: null,
        prisma: tx,
      });
      return { message: 'Password reset successful' };
    });
  }
}
