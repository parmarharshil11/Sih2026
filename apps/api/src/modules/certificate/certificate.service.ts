import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { EnrollmentStatus } from '@repo/db';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class CertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Issue a certificate for a completed enrollment.
   * - Validates enrollment is completed
   * - Generates unique certificate number (CC-YYYYMMDD-{8 hex chars})
   * - Generates cryptographically unique verification token (UUID v4)
   * - Generates QR code as base64 data URL encoding the public verification URL
   */
  async issueCertificate(enrollmentId: string, baseUrl: string, issuerUserId: string, ipAddress: string | null = null): Promise<any> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: { include: { trainer: true } },
        trainee: true,
        certificate: true,
      },
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    if (enrollment.status !== EnrollmentStatus.completed) {
      throw new BadRequestException(
        'Certificate can only be issued for completed enrollments',
      );
    }

    if (enrollment.certificate) {
      throw new ConflictException(
        'Certificate already issued for this enrollment',
      );
    }

    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const hexSuffix = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const certificateNumber = `CC-${dateStr}-${hexSuffix}`;

    const verificationToken = uuidv4();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify/${verificationToken}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      width: 300,
    });

    return this.prisma.$transaction(async (tx) => {
      const certificate = await tx.certificate.create({
        data: {
          enrollmentId,
          certificateNumber,
          traineeId: enrollment.traineeId,
          courseId: enrollment.courseId,
          trainerId: enrollment.course.trainerId,
          issuedAt: now,
          qrPayloadUrl: qrDataUrl,
          verificationToken,
        },
        include: {
          trainee: {
            select: { id: true, user: { select: { email: true } } },
          },
          course: { select: { id: true, title: true, slug: true } },
          trainer: {
            select: {
              id: true,
              user: { select: { email: true } },
            },
          },
        },
      });

      await this.auditService.log({
        actorUserId: issuerUserId,
        action: 'certificate.issued',
        entityType: 'Certificate',
        entityId: certificate.id,
        ipAddress,
        metadata: { certificateNumber, enrollmentId },
        prisma: tx,
      });

      return {
        ...certificate,
        verificationUrl,
      };
    });
  }

  /**
   * Public endpoint — NO authentication required.
   * Returns sanitized certificate info (no extra PII).
   * Records a verification event for auditing.
   */
  async verifyCertificate(
    token: string,
    verifierIp?: string,
  ): Promise<any> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationToken: token },
      include: {
        trainee: {
          select: {
            user: { select: { email: true } },
          },
        },
        course: { select: { title: true, slug: true } },
        trainer: {
          select: {
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!certificate) {
      return {
        valid: false,
        message: 'Certificate not found or token is invalid',
      };
    }

    // Record verification event
    await this.prisma.certificateVerification.create({
      data: {
        certificateId: certificate.id,
        verifierIp: verifierIp ?? null,
      },
    });

    // Return sanitized data only — no internal IDs or extra PII
    return {
      valid: true,
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
      trainee: {
        email: certificate.trainee.user.email,
      },
      course: {
        title: certificate.course.title,
      },
      trainer: {
        email: certificate.trainer.user.email,
      },
    };
  }

  /**
   * List all certificates for the current trainee.
   */
  async getMyCertificates(traineeUserId: string): Promise<any> {
    const profile = await this.prisma.traineeProfile.findUnique({
      where: { userId: traineeUserId },
    });
    if (!profile) throw new NotFoundException('Trainee profile not found');

    return this.prisma.certificate.findMany({
      where: { traineeId: profile.id },
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
        trainer: {
          select: {
            id: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /**
   * Get a specific certificate by ID.
   */
  async getCertificate(certificateId: string, user: any): Promise<any> {
    const cert = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        trainee: {
          select: { id: true, userId: true, user: { select: { email: true } } },
        },
        course: { select: { id: true, title: true, slug: true } },
        trainer: {
          select: { id: true, user: { select: { email: true } } },
        },
        verifications: {
          select: { verifiedAt: true, verifierIp: true },
          orderBy: { verifiedAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!cert) throw new NotFoundException('Certificate not found');

    const isAdmin = user?.roles?.some((r: any) => r.name === 'admin');
    if (!isAdmin && cert.trainee.userId !== user.id) {
      throw new NotFoundException('Certificate not found');
    }

    return cert;
  }
}
