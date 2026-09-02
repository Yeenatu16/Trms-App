import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FhirMapperService } from './fhir-mapper.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventsGateway } from '../events/events.gateway';

/**
 * FhirController — exposes HL7 FHIR R4-compliant read endpoints.
 * These sit alongside the proprietary REST API, giving external integrators
 * (e.g. OpenHIM, DHIS2, SmartCare) a standards-based interface.
 *
 * Endpoints:
 *   GET /api/fhir/Patient/:id
 *   GET /api/fhir/ServiceRequest/:id
 *   GET /api/fhir/ServiceRequest/:id/everything   (full Bundle)
 */
@UseGuards(JwtAuthGuard)
@Controller('api/fhir')
export class FhirController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhir: FhirMapperService,
    private readonly events: EventsGateway,
  ) { }

  @Post('Bundle')
  @HttpCode(HttpStatus.CREATED)
  async ingestBundle(@Body() bundle: any) {
    const { patientData, serviceRequestData } =
      this.fhir.parseFhirBundle(bundle);

    const result = await this.prisma.$transaction(async (tx: any) => {
      // 1. Upsert Patient
      const patient = await tx.patient.upsert({
        where: { mrn: patientData.mrn },
        update: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          phone: patientData.phone || null,
          age: patientData.age || null,
          sex: patientData.sex,
        },
        create: {
          mrn: patientData.mrn,
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          phone: patientData.phone || null,
          age: patientData.age || null,
          sex: patientData.sex,
        },
      });

      // 2. Ensure facilities exist (seed for demo)
      const ensureFacility = async (id: string, name: string) =>
        tx.facility.upsert({
          where: { code: id },
          update: {},
          create: { id, code: id, name, region: 'Tigray' },
        });

      await ensureFacility(
        serviceRequestData.originFacilityId,
        'Origin Default',
      );
      const destFacility = await ensureFacility(
        serviceRequestData.destFacilityId,
        'Destination Default',
      );

      // 3. Create ServiceRequest
      const serviceRequest = await tx.serviceRequest.create({
        data: {
          patientId: patient.id,
          originId: serviceRequestData.originFacilityId,
          destId: serviceRequestData.destFacilityId,
          priority: serviceRequestData.priority,
          clinicalSummary: serviceRequestData.clinicalSummary || null,
          status: 'SUBMITTED',
        },
      });

      return { serviceRequest, patient, destFacility };
    });

    // 4. Emit WebSocket event — live-notify all triage dashboards
    this.events.emitNewReferral({
      referralId: result.serviceRequest.id,
      patientMrn: result.patient.mrn,
      priority: result.serviceRequest.priority,
      destFacilityId: result.serviceRequest.destId,
      destFacilityName: result.destFacility.name,
    });

    return {
      success: true,
      message: 'Referral ingested successfully via FHIR Bundle',
      referralId: result.serviceRequest.id,
    };
  }

  // ── Patient ─────────────────────────────────────────
  @Get('Patient/:id')
  async getPatient(@Param('id') id: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException(`Patient/${id} not found`);
    return this.fhir.toFhirPatient(patient);
  }

  // ── ServiceRequest ────────────────────────────────────
  @Get('ServiceRequest/:id')
  async getServiceRequest(@Param('id') id: string) {
    const ref = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { patient: true, originFacility: true, destFacility: true },
    });
    if (!ref) throw new NotFoundException(`ServiceRequest/${id} not found`);
    return this.fhir.toFhirServiceRequest(ref);
  }

  /*
   * $everything — returns a FHIR Bundle containing the ServiceRequest,
   * its subject Patient, and all workflow Tasks.
   */
  @Get('ServiceRequest/:id/everything')
  async getServiceRequestEverything(@Param('id') id: string) {
    const ref = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        patient: true,
        originFacility: true,
        destFacility: true,
        tasks: true,
      },
    });
    if (!ref) throw new NotFoundException(`ServiceRequest/${id} not found`);

    const resources: object[] = [
      this.fhir.toFhirPatient(ref.patient),
      this.fhir.toFhirServiceRequest(ref),
      ...ref.tasks.map((t: any) => this.fhir.toFhirTask(t, ref.id)),
    ];

    return this.fhir.toBundle(resources, 'collection');
  }
}
