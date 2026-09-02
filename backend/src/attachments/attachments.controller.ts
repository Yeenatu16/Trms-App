import { Controller, Get, Param, Res, UseGuards, Req } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';
import { AuditService } from '../audit/audit.service';

@Controller('api/attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly auditService: AuditService,
  ) {}

  @Get(':id')
  async downloadAttachment(@Param('id') id: string, @Res() res: Response, @Req() req: any) {
    const { stream, attachment } = await this.attachmentsService.getAttachmentStream(id);

    // Audit log the file access
    await this.auditService.log({
      userId: req.user.userId,
      action: 'FILE_DOWNLOADED',
      resource: 'Attachment',
      resourceId: id,
      details: `User downloaded attachment: ${attachment.name}`,
    });

    res.set({
      'Content-Type': attachment.type,
      'Content-Disposition': `inline; filename="${attachment.name}"`,
    });

    stream.pipe(res);
  }
}
