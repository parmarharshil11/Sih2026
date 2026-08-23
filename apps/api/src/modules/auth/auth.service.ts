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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto) {
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

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        status: 'pending',
        emailVerificationToken,
        userRoles: { create: { roleId: role.id } },
      },
    });

    // TODO: send verification email with emailVerificationToken
    return { message: 'Registration successful. Please verify your email.', userId: user.id };
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

  async login(dto: LoginDto, res: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'suspended') throw new UnauthorizedException('Account suspended');
    if (user.status === 'pending') throw new UnauthorizedException('Account pending verification or approval');

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.tokenService.generateAccessToken(user.id, user.email);
    const { token: refreshToken, jti } = this.tokenService.generateRefreshToken(user.id);

    // Store refresh token hash for reuse detection
    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.prisma.refreshToken.create({
      data: { id: jti, userId: user.id, tokenHash: refreshTokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    this.tokenService.setTokenCookies(res, accessToken, refreshToken);
    return { message: 'Login successful' };
  }

  async refresh(userId: string, jti: string, rawRefreshToken: string, res: any) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { id: jti } });
    if (!stored || stored.userId !== userId || stored.revoked) {
      // Reuse detected — revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId },
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

  async logout(userId: string, jti: string, res: any) {
    if (jti) {
      await this.prisma.refreshToken.update({ where: { id: jti }, data: { revoked: true } }).catch(() => {});
    }
    this.tokenService.clearTokenCookies(res);
    return { message: 'Logged out' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user) return { message: 'If that email exists, a reset link was sent.' };

    const resetToken = uuidv4();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
    // TODO: send reset email
    return { message: 'If that email exists, a reset link was sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
    });
    return { message: 'Password reset successful' };
  }
}
