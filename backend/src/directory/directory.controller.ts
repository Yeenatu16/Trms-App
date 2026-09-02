import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { DirectoryService } from './directory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, ServiceStatus, FacilityStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/directory')  //the base URL for directory endpoints
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) { }

  @Get('facilities')
  async getFacilities() {
    return this.directoryService.getFacilities();
  }

  @Get('services')
  async getServices() {
    return this.directoryService.getServices();
  }

  @Get('clinical-services')
  async getClinicalServices() {
    return this.directoryService.getClinicalServices();
  }

  @Post('clinical-services')
  @Roles(Role.ADMINISTRATOR)
  async createClinicalService(@Body() data: any) {
    return this.directoryService.createClinicalService(data);
  }

  @Patch('service/:id/status')
  async updateServiceStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    if (!Object.values(ServiceStatus).includes(status as ServiceStatus)) {
      throw new BadRequestException('Invalid status value');
    }
    return this.directoryService.updateServiceStatus(
      id,
      status as ServiceStatus,
    );
  }

  @Post('facilities')
  @Roles(Role.ADMINISTRATOR)
  async createFacility(@Body() data: any) {
    return this.directoryService.createFacility(data);
  }

  @Patch('facilities/:id')
  @Roles(Role.ADMINISTRATOR)
  async updateFacility(@Param('id') id: string, @Body() data: any) {
    return this.directoryService.updateFacility(id, data);
  }

  @Delete('facilities/:id')
  @Roles(Role.ADMINISTRATOR)
  async deleteFacility(@Param('id') id: string) {
    return this.directoryService.deleteFacility(id);
  }

  @Post('facilities/:id/services')
  @Roles(Role.ADMINISTRATOR)
  async addService(@Param('id') id: string, @Body() data: any) {
    return this.directoryService.addServiceToFacility(id, data);
  }

  @Post('equipment')
  @Roles(Role.ADMINISTRATOR)
  async createEquipment(@Body() data: any) {
    return this.directoryService.createEquipment(data);
  }

  @Post('service/:id/equipment')
  @Roles(Role.ADMINISTRATOR)
  async linkEquipment(
    @Param('id') facilityServiceId: string,
    @Body('equipmentId') equipmentId: string,
    @Body('isMandatory') isMandatory: boolean = true,
  ) {
    return this.directoryService.linkEquipmentToFacilityService(facilityServiceId, equipmentId, isMandatory);
  }

  @Patch('equipment/:id/status')
  @Roles(Role.ADMINISTRATOR, Role.LIAISON_OFFICER)
  async updateEquipmentStatus(
    @Param('id') id: string,
    @Body('functional') functional: boolean,
    @Body('status') status: string,
  ) {
    return this.directoryService.updateEquipmentStatus(id, functional, status);
  }

  @Patch('service/:id/capacity')
  @Roles(Role.ADMINISTRATOR, Role.LIAISON_OFFICER)
  async updateServiceCapacity(
    @Param('id') id: string,
    @Body('bedsTotal') bedsTotal: number,
    @Body('bedsAvailable') bedsAvailable: number,
    @Body('waitlistCount') waitlistCount: number,
    @Body('status') status: ServiceStatus,
    @Body('statusNote') statusNote: string,
  ) {
    if (status && !Object.values(ServiceStatus).includes(status)) {
      throw new BadRequestException('Invalid ServiceStatus value');
    }
    return this.directoryService.updateServiceCapacity(
      id, 
      bedsTotal, 
      bedsAvailable, 
      waitlistCount, 
      status, 
      statusNote
    );
  }

  @Patch('queue/:id')
  @Roles(Role.ADMINISTRATOR, Role.LIAISON_OFFICER)
  async updateSpecialistQueue(
    @Param('id') id: string,
    @Body('availableCount') availableCount: number,
    @Body('currentWaitlist') currentWaitlist: number,
  ) {
    return this.directoryService.updateSpecialistQueue(id, availableCount, currentWaitlist);
  }
}
