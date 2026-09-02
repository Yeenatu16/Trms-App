import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { AuthModule } from "./auth/auth.module";
import { SyncModule } from "./sync/sync.module";
import { TriageModule } from "./triage/triage.module";
// import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuditModule } from "./audit/audit.module";
import { PatientsModule } from "./patients/patients.module";
import { EventsModule } from "./events/events.module";
import { FhirModule } from "./fhir/fhir.module";
import { HealthController } from "./health.controller";
import { DirectoryModule } from "./directory/directory.module";
import { AttachmentsModule } from "./attachments/attachments.module";
import { UsersModule } from "./users/users.module";
import { ReferralsModule } from "./referrals/referrals.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "storage"),
      serveRoot: "/uploads",
    }),
    AuthModule,
    SyncModule,
    TriageModule,
    // NotificationsModule,
    AnalyticsModule,
    AuditModule,
    PatientsModule,
    EventsModule,
    FhirModule,
    DirectoryModule,
    AttachmentsModule,
    UsersModule,
    ReferralsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
