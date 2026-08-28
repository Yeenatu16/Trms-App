import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AuditModule } from './audit/audit.module.js';
import { CommonModule } from './common/common.module.js';
import { DirectoryModule } from './directory/directory.module.js';
import { EventsModule } from './events/events.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { ReferralsModule } from './referrals/referrals.module.js';
import { SyncModule } from './sync/sync.module.js';
import { TriageModule } from './triage/triage.module.js';
import { FhirModule } from './fhir/fhir.module.js';
import { AttachmentsModule } from './attachments/attachments.module.js';

@Module({
  imports: [AuthModule, UsersModule, AnalyticsModule, AuditModule, CommonModule, DirectoryModule, EventsModule, NotificationsModule, PatientsModule, ReferralsModule, SyncModule, TriageModule, FhirModule, AttachmentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
