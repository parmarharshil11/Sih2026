import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

export interface AuditLogData {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  metadata: Record<string, any> | null;
  prisma?: any; // PrismaTransactionClient
}

@Injectable()
export class AuditService {
  constructor(private readonly prismaService: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    const prisma = data.prisma || this.prismaService;
    await prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        ipAddress: data.ipAddress,
        metadata: data.metadata || undefined,
      },
    });
  }
}
