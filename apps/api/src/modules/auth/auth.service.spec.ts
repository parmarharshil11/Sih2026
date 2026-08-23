import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { AuditService } from '../../common/services/audit.service';

// ─── Argon2 mock ──────────────────────────────────────────────────────────────
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  verify: jest.fn().mockResolvedValue(true),
  argon2id: 2,
}));

// ─── UUID mock ────────────────────────────────────────────────────────────────
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('mock-uuid-1234') }));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let tokenService: jest.Mocked<TokenService>;
  let auditService: jest.Mocked<AuditService>;

  const mockTx = {
    user: { create: jest.fn(), update: jest.fn() },
    refreshToken: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      role: { findUnique: jest.fn() },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
    };

    const mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('access-token'),
      generateRefreshToken: jest.fn().mockReturnValue({ token: 'refresh-token', jti: 'jti-123' }),
      setTokenCookies: jest.fn(),
      clearTokenCookies: jest.fn(),
    };

    const mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TokenService, useValue: mockTokenService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    tokenService = module.get(TokenService);
    auditService = module.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── register() ───────────────────────────────────────────────────────────────

  describe('register()', () => {
    const dto = { email: 'test@example.com', password: 'Password123!', role: 'trainee' as const };

    it('should throw ConflictException if email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if role is invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should create user and return success message', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role-1', name: 'trainee' });
      mockTx.user.create.mockResolvedValue({ id: 'new-user-id', email: dto.email });

      const result = await service.register(dto, '127.0.0.1');

      expect(result).toEqual(expect.objectContaining({ message: expect.stringContaining('Registration') }));
      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            status: 'pending',
          }),
        }),
      );
    });

    it('should log auth.register audit event on success', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role-1', name: 'trainee' });
      mockTx.user.create.mockResolvedValue({ id: 'new-user-id' });

      await service.register(dto);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.register' }),
      );
    });
  });

  // ─── verifyEmail() ────────────────────────────────────────────────────────────

  describe('verifyEmail()', () => {
    it('should throw NotFoundException for invalid token', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.verifyEmail('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('should set emailVerifiedAt and status=active on valid token', async () => {
      const mockUser = { id: 'u1', emailVerificationToken: 'valid-token' };
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, status: 'active' });

      const result = await service.verifyEmail('valid-token');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailVerifiedAt: expect.any(Date),
            status: 'active',
            emailVerificationToken: null,
          }),
        }),
      );
      expect(result).toEqual({ message: 'Email verified successfully' });
    });
  });

  // ─── login() ──────────────────────────────────────────────────────────────────

  describe('login()', () => {
    const dto = { email: 'test@example.com', password: 'Password123!' };
    const mockRes = {};

    it('should throw UnauthorizedException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.login(dto, mockRes)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for suspended accounts', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', status: 'suspended', passwordHash: 'hash' });
      await expect(service.login(dto, mockRes)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for pending accounts', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', status: 'pending', passwordHash: 'hash' });
      await expect(service.login(dto, mockRes)).rejects.toThrow(UnauthorizedException);
    });

    it('should return success message and set cookies on valid credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1', email: dto.email, status: 'active', passwordHash: 'hash',
      });
      mockTx.user.update = jest.fn().mockResolvedValue({});
      mockTx.refreshToken.create = jest.fn().mockResolvedValue({});

      const result = await service.login(dto, mockRes, '127.0.0.1');

      expect(result).toEqual({ message: 'Login successful' });
      expect(tokenService.setTokenCookies).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login' }),
      );
    });
  });
});
