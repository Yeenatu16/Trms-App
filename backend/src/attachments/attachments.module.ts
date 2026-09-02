import { AuthModule } from '../auth/auth.module';
import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuthModule,AuditModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, PrismaService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
