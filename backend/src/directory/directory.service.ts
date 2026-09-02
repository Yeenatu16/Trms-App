import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityStatus, ServiceStatus } from '@prisma/client';

@Injectable()
export class DirectoryService {
  constructor(private readonly prisma: PrismaService) { }

  async getServices() {
    return this.prisma.facilityService.findMany({
      include: {
        equipmentLinks: { include: { equipment: true } },
        specialistQueues: true,
        facility: true,
        clinicalService: true,
      },
    });
  }

  async getClinicalServices() {
    const count = await this.prisma.clinicalServiceDirectory.count();
    if (count === 0) {
      await this.prisma.clinicalServiceDirectory.createMany({
        data: [
          { name: 'Emergency Room (ER)', category: 'Emergency' },
          { name: 'Intensive Care Unit (ICU)', category: 'Intensive Care' },
          { name: 'Neonatal ICU (NICU)', category: 'Maternal/Child' },
          { name: 'Pediatrics', category: 'Pediatrics' },
          { name: 'Maternity/Labor & Delivery', category: 'Maternal/Child' },
          { name: 'General Surgery', category: 'Surgical' },
          { name: 'Orthopedics', category: 'Surgical' },
          { name: 'Internal Medicine', category: 'General' },
          { name: 'Cardiology', category: 'Specialized' },
          { name: 'Neurology', category: 'Specialized' },
          { name: 'Oncology', category: 'Specialized' },
          { name: 'Psychiatry', category: 'Mental Health' },
        ]
      });
    }
    
    return this.prisma.clinicalServiceDirectory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createClinicalService(data: { name: string, category: string, description?: string }) {
    return this.prisma.clinicalServiceDirectory.create({
      data: {
        name: data.name,
        category: data.category,
        description: data.description || '',
      }
    });
  }

  async getFacilities() {
    return this.prisma.facility.findMany({
      include: {
        equipments: true,
        services: {
          include: {
            clinicalService: true,
            equipmentLinks: {
              include: { equipment: true }
            }
          }
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateServiceStatus(id: string, status: ServiceStatus) {
    const service = await this.prisma.facilityService.findUnique({
      where: { id },
    });
    if (!service) {
      throw new NotFoundException(`FacilityService with ID ${id} not found`);
    }

    return this.prisma.facilityService.update({
      where: { id },
      data: { status },
      include: {
        equipmentLinks: true,
        specialistQueues: true,
      },
    });
  }

  async createFacility(data: any) {
    const existing = await this.prisma.facility.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictException('Facility code already exists');

    return this.prisma.facility.create({
      data: {
        name: data.name,
        code: data.code,
        region: data.region,
        zone: data.zone,
        woreda: data.woreda,
        levelOfCare: data.levelOfCare,
        status: data.status || FacilityStatus.OPERATIONAL,
        services: data.selectedServiceIds?.length > 0 ? {
          create: data.selectedServiceIds.map((srvId: string) => ({
            clinicalServiceId: srvId,
            status: ServiceStatus.OPERATIONAL,
            waitlistCount: 0,
            bedsTotal: 0,
            bedsAvailable: 0
          }))
        } : undefined
      }
    });
  }

  async updateFacility(id: string, data: any) {
    const result = await this.prisma.facility.update({
      where: { id },
      data: {
        name: data.name,
        region: data.region,
        zone: data.zone,
        woreda: data.woreda,
        levelOfCare: data.levelOfCare,
        status: data.status,
      }
    });

    if (data.selectedServiceIds && Array.isArray(data.selectedServiceIds)) {
      const existing = await this.prisma.facilityService.findMany({ where: { facilityId: id } });
      const existingIds = existing.map((e: any) => e.clinicalServiceId);
      
      const toRemove = existingIds.filter((eId: any) => !data.selectedServiceIds.includes(eId));
      const toAdd = data.selectedServiceIds.filter((srvId: string) => !existingIds.includes(srvId));
      
      if (toRemove.length > 0) {
        await this.prisma.facilityService.deleteMany({
          where: { facilityId: id, clinicalServiceId: { in: toRemove } }
        });
      }
      
      if (toAdd.length > 0) {
        await this.prisma.facilityService.createMany({
          data: toAdd.map((cId: string) => ({
            facilityId: id,
            clinicalServiceId: cId,
            status: ServiceStatus.OPERATIONAL,
            waitlistCount: 0,
            bedsTotal: 0,
            bedsAvailable: 0
          }))
        });
      }
    }

    return result;
  }

  async deleteFacility(id: string) {
    return this.prisma.facility.delete({ where: { id } });
  }

  async addServiceToFacility(facilityId: string, data: any) {
    return this.prisma.facilityService.create({
      data: {
        facilityId,
        clinicalServiceId: data.clinicalServiceId,
        status: data.status || ServiceStatus.OPERATIONAL,
        bedsTotal: data.bedsTotal ? parseInt(String(data.bedsTotal)) : 0,
        bedsAvailable: data.bedsAvailable ? parseInt(String(data.bedsAvailable)) : 0,
      }
    });
  }

  async evaluateServiceStatus(id: string) {
    const service = await this.prisma.facilityService.findUnique({
      where: { id },
      include: {
        equipmentLinks: {
          include: { equipment: true }
        }
      }
    });
    if (!service) return;

    let status: ServiceStatus = service.bedsAvailable > 0 ? ServiceStatus.OPERATIONAL : ServiceStatus.FULL;
    let statusNote = service.bedsAvailable > 0 ? '' : 'Service is currently full.';

    const brokenMandatory = service.equipmentLinks.filter((l: any) => l.isMandatory && !l.equipment.functional);
    
    if (brokenMandatory.length > 0) {
      status = 'OFFLINE' as ServiceStatus;
      statusNote = `Mandatory equipment offline: ${brokenMandatory.map((m: any) => m.equipment.name).join(', ')}`;
    }

    await this.prisma.facilityService.update({
      where: { id },
      data: { status, statusNote }
    });
  }

  async createEquipment(data: { facilityId: string, name: string, category?: string }) {
    return this.prisma.equipment.create({
      data: {
        facilityId: data.facilityId,
        name: data.name,
        category: data.category,
        status: 'FUNCTIONAL',
        functional: true,
        lastChecked: new Date()
      }
    });
  }

  async updateEquipmentStatus(id: string, functional: boolean, status: string) {
    const eq = await this.prisma.equipment.update({
      where: { id },
      data: { functional, status, lastChecked: new Date() },
      include: {
        serviceLinks: true
      }
    });
    
    for (const link of eq.serviceLinks) {
      await this.evaluateServiceStatus(link.facilityServiceId);
    }
    return eq;
  }

  async linkEquipmentToFacilityService(facilityServiceId: string, equipmentId: string, isMandatory: boolean = true) {
    const link = await this.prisma.serviceEquipmentRequirement.create({
      data: {
        facilityServiceId,
        equipmentId,
        isMandatory
      }
    });
    await this.evaluateServiceStatus(facilityServiceId);
    return link;
  }

  async updateServiceCapacity(
    id: string, 
    bedsTotal: number, 
    bedsAvailable: number, 
    waitlistCount: number, 
    status: ServiceStatus, 
    statusNote: string
  ) {
    const service = await this.prisma.facilityService.findUnique({
      where: { id },
    });
    if (!service) {
      throw new NotFoundException(`FacilityService with ID ${id} not found`);
    }

    const data: any = {};
    if (bedsTotal !== undefined) data.bedsTotal = parseInt(String(bedsTotal), 10);
    if (bedsAvailable !== undefined) data.bedsAvailable = parseInt(String(bedsAvailable), 10);
    if (waitlistCount !== undefined) data.waitlistCount = parseInt(String(waitlistCount), 10);

    // Save capacity first (ignore manual status updates to let evaluateServiceStatus handle it)
    await this.prisma.facilityService.update({
      where: { id },
      data
    });

    await this.evaluateServiceStatus(id);
    return this.prisma.facilityService.findUnique({ where: { id }});
  }

  async updateSpecialistQueue(id: string, availableCount: number, currentWaitlist: number) {
    return this.prisma.specialistQueue.update({
      where: { id },
      data: { availableCount, currentWaitlist }
    });
  }
}
