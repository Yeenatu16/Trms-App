import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

// Analytics is restricted to Admin role only
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @Roles(Role.ADMINISTRATOR)
  getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('comprehensive')
  @Roles(Role.ADMINISTRATOR)
  getComprehensiveReports() {
    return this.analyticsService.getComprehensiveReports();
  }
}
