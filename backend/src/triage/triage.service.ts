import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { AuditService } from '../audit/audit.service';
import { ReferralStatus, TaskStatus, Priority } from '@prisma/client';

@Injectable()
export class TriageService {
  constructor(
    private readonly prisma: PrismaService,
    // private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly audit: AuditService,
  ) {}

  async getPendingReferrals(facilityId?: string) {
    const whereClause: any = {
      status: { in: ['SUBMITTED', 'PENDING_INFO'] },
    };
    if (facilityId) whereClause.destId = facilityId;

    return this.prisma.serviceRequest.findMany({
      where: whereClause,
      include: {
        patient: true,
        originFacility: true,
        destFacility: true,
        tasks: true,
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * FR-LIA-02: Accept / Reject / Redirect / Request-info with mandatory note
   * FR-SVC-04: Token persisted to DB on acceptance
   * FR-RPT-03: Every status change is audit-logged
   */
  async updateReferralStatus(
    id: string,
    status: ReferralStatus,
    note?: string,
    actionByUserId?: string,
    ipAddress?: string,
  ) {
    // 1. Validate mandatory note constraint
    if (['REJECTED', 'REDIRECTED', 'PENDING_INFO'].includes(status) && !note) {
      throw new BadRequestException(
        `A clinical note/reason is legally required when setting status to ${status}.`,
      );
    }

    // 2. Generate token on acceptance (FR-SVC-04)
    const receiptToken =
      status === 'ACCEPTED'
        ? `TRMS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        : undefined;

    // 3. Transact state change + task record
    const updated = await this.prisma.$transaction(async (tx: any) => {
      if (note || status !== 'SUBMITTED') {
        const tStatus: TaskStatus =
          status === 'REJECTED'
            ? 'REJECTED'
            : status === 'COMPLETED'
            ? 'COMPLETED'
            : 'IN_PROGRESS';

        await tx.task.create({
          data: {
            serviceRequestId: id,
            status: tStatus,
            notes: note || `Status updated to ${status}`,
            assignedToUserId: actionByUserId,
          },
        });
      }

      return tx.serviceRequest.update({
        where: { id },
        data: {
          status,
          // Persist token only when accepting so it can be retrieved later
          ...(receiptToken ? { referralToken: receiptToken } : {}),
        },
        include: { patient: true, destFacility: true },
      });
    });

    // 4. FR-RPT-03: Audit-log the triage decision
    await this.audit.log({
      userId: actionByUserId,
      action: `REFERRAL_${status}`,
      resource: 'ServiceRequest',
      resourceId: id,
      details: note ?? `Referral status transitioned to ${status}`,
      ipAddress,
    });

    // 5. Emit WebSocket event for real-time dashboard updates
    this.events.emitReferralUpdated({ referralId: id, status, note });

    // 6. SMS notification on acceptance (FR-SVC-03)
    // if (status === 'ACCEPTED' && updated.patient.phone && receiptToken) {
    //   await this.notifications.sendReferralAcceptedSMS(
    //     updated.patient.phone,
    //     receiptToken,
    //     updated.destFacility.name,
    //   );
    // }

    return updated;
  }

  /**
   * FR-LIA-03: Update triage priority independently from status.
   * FR-RPT-03: Audit-logged.
   */
  async updateReferralPriority(
    id: string,
    priority: Priority,
    actionByUserId?: string,
    ipAddress?: string,
  ) {
    const referral = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException(`Referral ${id} not found.`);

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: { priority },
    });

    // FR-RPT-03: Audit the priority change
    await this.audit.log({
      userId: actionByUserId,
      action: 'REFERRAL_PRIORITY_UPDATED',
      resource: 'ServiceRequest',
      resourceId: id,
      details: `Priority changed to ${priority}`,
      ipAddress,
    });

    return updated;
  }
}
