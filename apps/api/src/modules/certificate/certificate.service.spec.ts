import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { EnrollmentStatus } from '@repo/db';

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQRData'),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-verify-token-uuid'),
}));

describe('CertificateService', () => {
  let service: CertificateService;
  let prisma: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;

  const mockTx: any = {
    certificate: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      enrollment: { findUnique: jest.fn() },
      certificate: { findUnique: jest.fn(), findMany: jest.fn() },
      certificateVerification: { create: jest.fn() },
      traineeProfile: { findUnique: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
    };

    const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── issueCertificate() ───────────────────────────────────────────────────────

  describe('issueCertificate()', () => {
    it('should throw NotFoundException if enrollment not found', async () => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.issueCertificate('enroll-1', 'http://localhost', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if enrollment not completed', async () => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        status: EnrollmentStatus.in_progress,
        certificate: null,
      });
      await expect(
        service.issueCertificate('e1', 'http://localhost', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if certificate already issued', async () => {
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        status: EnrollmentStatus.completed,
        certificate: { id: 'cert-existing' },
      });
      await expect(
        service.issueCertificate('e1', 'http://localhost', 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should generate unique token, certificate number, and QR code', async () => {
      const mockEnrollment = {
        id: 'e1',
        status: EnrollmentStatus.completed,
        traineeId: 'tnp-1',
        courseId: 'c1',
        certificate: null,
        course: {
          trainerId: 'tp-1',
          trainer: { id: 'tp-1' },
        },
        trainee: { id: 'tnp-1' },
      };
      (prisma.enrollment.findUnique as jest.Mock).mockResolvedValue(mockEnrollment);

      const mockCertificate = {
        id: 'cert-1',
        certificateNumber: 'CC-20261201-ABCD1234',
        verificationToken: 'mock-verify-token-uuid',
        issuedAt: new Date(),
        trainee: { user: { email: 'trainee@test.com' } },
        course: { title: 'Test Course' },
        trainer: { user: { email: 'trainer@test.com' } },
      };
      mockTx.certificate.create.mockResolvedValue(mockCertificate);

      const result = await service.issueCertificate('e1', 'http://localhost:4000', 'admin-1');

      // Verify certificate number format CC-YYYYMMDD-XXXXXXXX
      expect(result.certificateNumber).toMatch(/^CC-\d{8}-[A-Z0-9]{8}$/);
      expect(result.verificationUrl).toContain('mock-verify-token-uuid');
      expect(result.verificationUrl).toContain('/api/v1/certificates/verify/');

      // Verify audit log was called
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'certificate.issued' }),
      );
    });
  });

  // ─── verifyCertificate() ──────────────────────────────────────────────────────

  describe('verifyCertificate()', () => {
    it('should return valid=false for unknown token', async () => {
      (prisma.certificate.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await service.verifyCertificate('bad-token');
      expect(result.valid).toBe(false);
    });

    it('should return sanitized certificate data without internal IDs', async () => {
      const mockCert = {
        id: 'cert-internal-id', // Internal ID — must NOT be exposed
        certificateNumber: 'CC-20261201-ABCD1234',
        issuedAt: new Date(),
        trainee: { user: { email: 'trainee@test.com' } },
        course: { title: 'Test Course' },
        trainer: { user: { email: 'trainer@test.com' } },
      };
      (prisma.certificate.findUnique as jest.Mock).mockResolvedValue(mockCert);
      (prisma.certificateVerification.create as jest.Mock).mockResolvedValue({});

      const result = await service.verifyCertificate('valid-token', '127.0.0.1');

      expect(result.valid).toBe(true);
      expect(result.certificateNumber).toBe('CC-20261201-ABCD1234');
      expect(result.trainee.email).toBe('trainee@test.com');
      expect(result.course.title).toBe('Test Course');
      // Internal IDs should NOT be present
      expect(result).not.toHaveProperty('id');
    });

    it('should record a verification event for audit trail', async () => {
      const mockCert = {
        id: 'cert-1',
        certificateNumber: 'CC-20261201-ABCD1234',
        issuedAt: new Date(),
        trainee: { user: { email: 'trainee@test.com' } },
        course: { title: 'Test Course' },
        trainer: { user: { email: 'trainer@test.com' } },
      };
      (prisma.certificate.findUnique as jest.Mock).mockResolvedValue(mockCert);
      (prisma.certificateVerification.create as jest.Mock).mockResolvedValue({});

      await service.verifyCertificate('valid-token', '192.168.1.1');

      expect(prisma.certificateVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            certificateId: 'cert-1',
            verifierIp: '192.168.1.1',
          }),
        }),
      );
    });
  });
});
