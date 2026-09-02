import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async syncReferrals(@Body('drafts') drafts: any[]) {
    if (!drafts || !Array.isArray(drafts)) {
      return {
        success: false,
        message: 'Invalid payload. Expected an array of drafts.',
      };
    }

    const syncedIds = await this.syncService.processSyncBatch(drafts);
    return {
      success: true,
      message: `Successfully synced ${syncedIds.length} referrals.`,
      syncedIds,
    };
  }
}
