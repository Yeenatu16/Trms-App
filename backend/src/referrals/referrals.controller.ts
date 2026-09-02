import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // FR-NUR-05: Nurse views own submitted referrals; Admin sees all
  @Get('my')
  @Roles(Role.NURSE, Role.ADMINISTRATOR)
  async getMyReferrals(@Request() req: any) {
    const { role, facilityId } = req.user;
    if (role === 'ADMINISTRATOR') return this.referralsService.getAllReferrals();
    if (!facilityId) return [];
    return this.referralsService.getMyReferrals(facilityId);
  }

  // FR-LIA-01: Liaison views incoming referrals for their facility; Admin sees all
  @Get('incoming')
  @Roles(Role.LIAISON_OFFICER, Role.ADMINISTRATOR)
  async getIncomingReferrals(@Request() req: any) {
    const { role, facilityId } = req.user;
    if (role === 'ADMINISTRATOR') return this.referralsService.getAllReferrals();
    if (!facilityId) return [];
    return this.referralsService.getIncomingReferrals(facilityId);
  }

  // FR-LIA-02: Only Liaison or Admin can update referral status
  @Patch(':id/status')
  @Roles(Role.LIAISON_OFFICER, Role.ADMINISTRATOR)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; clinicalNote?: string },
  ) {
    return this.referralsService.updateReferralStatus(id, body.status, body.clinicalNote);
  }
}
