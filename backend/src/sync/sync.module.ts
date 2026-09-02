import { AuthModule } from '../auth/auth.module';
import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { PrismaService } from '../prisma/prisma.service';
import { EventsModule } from '../events/events.module';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [
    AuthModule,EventsModule, AttachmentsModule],
  controllers: [SyncController],
  providers: [SyncService, PrismaService],
})
export class SyncModule {}
