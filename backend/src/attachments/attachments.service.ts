import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly storageDir = path.join(process.cwd(), 'storage', 'attachments');

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async storeAttachmentBase64(
    serviceRequestId: string,
    file: { name: string; type: string; dataUrl: string; sizeKb: number },
  ) {
    try {
      // Decode base64
      const matches = file.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        // Fallback if not a dataUrl prefix
        buffer = Buffer.from(file.dataUrl, 'base64');
      }

      // Generate unique filename
      const ext = path.extname(file.name) || (file.type.includes('pdf') ? '.pdf' : '.jpg');
      const filename = `${uuidv4()}${ext}`;
      const filePath = path.join(this.storageDir, filename);

      // Save to disk
      fs.writeFileSync(filePath, buffer);

      // Create DB Record
      const attachment = await this.prisma.attachment.create({
        data: {
          serviceRequestId,
          name: file.name,
          type: file.type,
          filePath: filename,
          sizeKb: file.sizeKb,
        },
      });

      return attachment;
    } catch (e) {
      this.logger.error(`Failed to store attachment ${file.name}`, e);
      throw e;
    }
  }

  async getAttachmentStream(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const filePath = path.join(this.storageDir, attachment.filePath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    return {
      stream: fs.createReadStream(filePath),
      attachment,
    };
  }
}
