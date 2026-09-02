import { AuthModule } from '../auth/auth.module';
import { Module } from "@nestjs/common";
import { TriageService } from "./triage.service";
import { TriageController } from "./triage.controller";
import { PrismaService } from "../prisma/prisma.service";
// import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from "../events/events.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    AuthModule,EventsModule, AuditModule],
  controllers: [TriageController],
  providers: [TriageService, PrismaService],
})
export class TriageModule {}
