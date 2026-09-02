import { Controller, Get, Query, UseGuards, Param, Post, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/patients')
export class PatientsController {
  constructor(private readonly prisma: PrismaService) { }

  @Post()
  async createOrUpdatePatient(@Body() patientData: any) {
    if (!patientData.mrn) throw new Error('MRN required');
    return this.prisma.patient.upsert({
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

  /**
   * Search patients by MRN or name for auto-fill.
   * Returns limited fields only (no full clinical history) to minimise data exposure.
   */
  @Get('search')
  async search(@Query('q') q: string) {
    if (!q || q.trim().length < 2) return [];

    const term = q.trim();
    return this.prisma.patient.findMany({
      where: {
        OR: [
          { mrn: { contains: term, mode: 'insensitive' } },
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        sex: true,
        age: true,
        phone: true,
      },
      take: 8,
      orderBy: { mrn: 'asc' },
    });
  }
  @Get(':id/history')
  async getPatientHistory(@Param('id') id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        referrals: {
          include: {
            originFacility: { select: { name: true } },
            destFacility: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) return null;

    // Map the response appropriately
    return {
      demographics: {
        id: patient.id,
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        age: patient.age,
        sex: patient.sex,
      },
      allergies: patient.allergies || [],
      medications: patient.medications || [],
      diagnoses: patient.diagnoses || [],
      clinicalNotes: patient.clinicalNotes || '',
      referrals: patient.referrals.map((r: any) => ({
        id: r.id,
        originName: r.originFacility?.name || 'Unknown Origin',
        destName: r.destFacility?.name || 'Unknown Destination',
        status: r.status,
        clinicalSummary: r.clinicalSummary,
        createdAt: r.createdAt,
      })),
    };
  }
}
