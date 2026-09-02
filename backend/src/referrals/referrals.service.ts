import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  // Nurse: get own referrals (from their origin facility or any if admin)
  async getMyReferrals(facilityId?: string) {
    const where: any = {};
    if (facilityId) where.originId = facilityId;
    return this.prisma.serviceRequest.findMany({
      where,
      include: { 
        patient: true, 
        destFacility: true, 
        originFacility: true,
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Liaison: get incoming referrals to their assigned facility
  async getIncomingReferrals(facilityId: string) {
    return this.prisma.serviceRequest.findMany({
      where: { destId: facilityId },
      include: { patient: true, originFacility: true, destFacility: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Liaison/Admin: update referral status
  async updateReferralStatus(id: string, status: string, clinicalNote?: string) {
    const referral = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException(`Referral ${id} not found`);

    // Map string to Prisma enum
    const validStatuses = ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'REDIRECTED', 'PENDING_INFO', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status: status as any },
      include: { patient: true, originFacility: true, destFacility: true },
    });
  }

  // Admin: get all referrals
  async getAllReferrals() {
    return this.prisma.serviceRequest.findMany({
      include: { patient: true, originFacility: true, destFacility: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
