import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { AttachmentsService } from '../attachments/attachments.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly attachmentsService: AttachmentsService,
  ) { }

  async processSyncBatch(drafts: any[]) {
    const syncedIds: string[] = [];

    for (const draft of drafts) {
      try {
        const newReferral = await this.prisma.$transaction(async (tx: any) => {
          // 0. Validate required fields before any DB operation
          const originFacilityId = draft.referral?.originFacilityId;
          const destFacilityId = draft.referral?.destFacilityId;
          const selectedServiceId = draft.referral?.selectedServiceId;

          if (!originFacilityId) {
            throw new Error(`Draft ${draft._id} missing originFacilityId — cannot sync.`);
          }
          if (!destFacilityId) {
            throw new Error(`Draft ${draft._id} missing destFacilityId — cannot sync.`);
          }
          if (!selectedServiceId) {
            throw new Error(`Draft ${draft._id} missing selectedServiceId — cannot sync.`);
          }

          // 1. Resolve Patient
          let patient;
          if (draft.patientId) {
            patient = await tx.patient.findUnique({ where: { id: draft.patientId } });
            if (!patient) {
              throw new Error(`Draft ${draft._id} missing patientId (patient not found in DB) — cannot sync.`);
            }
          } else {
            const patientData = draft.patient;
            if (!patientData?.mrn) {
              throw new Error(`Draft ${draft._id} missing patientId (no MRN provided either) — cannot sync.`);
            }

            patient = await tx.patient.upsert({
              where: { mrn: patientData.mrn },
              update: {
                firstName: patientData.firstName,
                lastName: patientData.lastName,
                phone: patientData.phone || null,
                age: patientData.age || null,
                sex: patientData.sex as any,
              },
              create: {
                mrn: patientData.mrn,
                firstName: patientData.firstName,
                lastName: patientData.lastName,
                phone: patientData.phone || null,
                age: patientData.age || null,
                sex: patientData.sex as any,
              },
            });
          }

          if (!patient?.id) {
            throw new Error(`Draft ${draft._id} missing patientId after sync preparation — cannot sync.`);
          }

          // Try UUID lookup directly
          let originFac = await tx.facility.findUnique({ where: { id: originFacilityId } });
          let destFac = await tx.facility.findUnique({ where: { id: destFacilityId } });

          // If either doesn't resolve, log a clear message and abort this draft
          if (!originFac) {
            this.logger.warn(`Draft ${draft._id}: originFacilityId "${originFacilityId}" not found in DB. Skipping.`);
            throw new Error(`Origin facility ${originFacilityId} not found in database.`);
          }

          if (!destFac) {
            this.logger.warn(`Draft ${draft._id}: destFacilityId "${destFacilityId}" not found in DB. Skipping.`);
            throw new Error(`Destination facility ${destFacilityId} not found in database.`);
          }

          // 3. Create ServiceRequest with verified FK references
          const serviceRequest = await tx.serviceRequest.create({
            data: {
              patientId: patient.id,
              originId: originFac.id,
              destId: destFac.id,
              selectedServiceId: selectedServiceId,
              priority: draft.referral.priority as any,
              clinicalSummary: draft.referral.clinicalSummary || '',
              status: 'SUBMITTED',
            },
          });

          // 4. Register Consent
          if (draft.consentGiven) {
            await tx.consent.create({
              data: {
                patientId: patient.id,
                serviceRequestId: serviceRequest.id,
                consentGiven: true,
              },
            });
          }

          syncedIds.push(draft._id);
          return { serviceRequest, patient, destFacility: destFac };
        });

        // 5. Store Attachments (outside transaction — avoids long-running TX)
        if (draft.attachments && draft.attachments.length > 0) {
          for (const att of draft.attachments) {
            try {
              await this.attachmentsService.storeAttachmentBase64(
                newReferral.serviceRequest.id,
                att
              );
            } catch (attErr: any) {
              this.logger.warn(`Failed to store attachment for ${newReferral.serviceRequest.id}: ${attErr.message}`);
            }
          }
        }

        // 6. Emit WebSocket event — live-notify triage dashboards
        this.events.emitNewReferral({
          referralId: newReferral.serviceRequest.id,
          patientMrn: newReferral.patient.mrn,
          priority: newReferral.serviceRequest.priority,
          destFacilityId: newReferral.serviceRequest.destId,
          destFacilityName: newReferral.destFacility.name,
        });

        this.logger.log(`✅ Successfully synced draft ${draft._id} → referral ${newReferral.serviceRequest.id}`);
      } catch (error: any) {
        // Only log the message, not the full stack — FK errors are expected for stale drafts
        this.logger.warn(`⚠️  Skipped draft ${draft._id}: ${error.message}`);
      }
    }

    return syncedIds;
  }
}

