import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { TriageService } from './triage.service';
import { ReferralStatus, Priority, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

export class UpdateStatusDto {
  status: ReferralStatus;
  note?: string;
}

export class UpdatePriorityDto {
  priority: Priority;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/triage')
export class TriageController {
  constructor(private readonly triageService: TriageService) {}

  /**
   * FR-LIA-01: Liaison sees pending referrals scoped to their facility.
   * Admin can pass any facilityId to see all queues.
   */
  @Get('pending')
  @Roles(Role.LIAISON_OFFICER, Role.ADMINISTRATOR)
  async getPendingRequests(
    @Query('facilityId') facilityId: string | undefined,
    @Request() req: any,
  ) {
    // Liaisons are always scoped to their own facility
    const effectiveFacilityId =
      req.user.role === Role.LIAISON_OFFICER
        ? req.user.facilityId
        : facilityId;

    return this.triageService.getPendingReferrals(effectiveFacilityId);
  }

  /**
   * FR-LIA-02: Accept / Reject / Redirect / Request-info
   * FR-RPT-03: Audit log captured inside the service
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.LIAISON_OFFICER, Role.ADMINISTRATOR)
  async updateStatus(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: UpdateStatusDto,
    @Request() req: any,
  ) {
    const updated = await this.triageService.updateReferralStatus(
      id,
      body.status,
      body.note,
      req.user.userId,
      req.ip,
    );

    return {
      success: true,
      status: updated.status,
      message: `Referral correctly transitioned to ${updated.status}`,
    };
  }

  /**
   * FR-LIA-03: Update triage priority independently from status.
   */
  @Patch(':id/priority')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.LIAISON_OFFICER, Role.ADMINISTRATOR)
  async updatePriority(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) body: UpdatePriorityDto,
    @Request() req: any,
  ) {
    if (!Object.values(Priority).includes(body.priority)) {
      throw new BadRequestException(`Invalid priority value: ${body.priority}`);
    }
    const updated = await this.triageService.updateReferralPriority(
      id,
      body.priority,
      req.user.userId,
      req.ip,
    );
    return {
      success: true,
      priority: updated.priority,
      message: `Referral priority updated to ${updated.priority}`,
    };
  }
}
