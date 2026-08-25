import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  generateAccessToken(userId: string, email: string): string {
    return this.jwt.sign(
      { sub: userId, email },
      {
        secret: this.config.get<string>('auth.jwtSecret'),
        expiresIn: this.config.get<string>('auth.jwtExpiresIn'),
      },
    );
  }

  generateRefreshToken(userId: string): { token: string; jti: string } {
    const jti = uuidv4(); // unique token ID for reuse detection
    const token = this.jwt.sign(
      { sub: userId, jti },
      {
        secret: this.config.get<string>('auth.jwtRefreshSecret'),
        expiresIn: this.config.get<string>('auth.jwtRefreshExpiresIn'),
      },
    );
    return { token, jti };
  }

  setTokenCookies(
    res: any,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  clearTokenCookies(res: any): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}
