import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: string;
    ipAddress?: string;
  }) {
    return this.prisma.auditEvent.create({ data: entry });
  }

  async getAuditTrail(limit = 100, offset = 0) {
    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditEvent.count(),
    ]);
    return { events, total, limit, offset };
  }
}
