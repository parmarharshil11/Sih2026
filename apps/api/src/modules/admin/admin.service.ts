import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus, VerificationStatus } from '@repo/db';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          status: true,
          createdAt: true,
          traineeProfile: { select: { id: true } },
          trainerProfile: { select: { id: true, verificationStatus: true } },
        }
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserStatus(id: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, status: true }
    });
  }

  async getPendingTrainers(page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const [trainers, total] = await Promise.all([
      this.prisma.trainerProfile.findMany({
        where: { verificationStatus: 'pending' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, status: true } },
          department: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.trainerProfile.count({
        where: { verificationStatus: 'pending' },
      }),
    ]);

    return {
      data: trainers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateTrainerVerification(id: string, status: VerificationStatus): Promise<any> {
    const trainer = await this.prisma.trainerProfile.findUnique({ where: { id } });
    if (!trainer) {
      throw new NotFoundException(`Trainer profile with ID ${id} not found`);
    }

    return this.prisma.trainerProfile.update({
      where: { id },
      data: { verificationStatus: status },
      include: {
        user: { select: { id: true, email: true } },
      }
    });
  }

  async getAuditLogs(page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, email: true } }
        }
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
