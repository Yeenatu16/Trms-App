import { AuthModule } from '../auth/auth.module';
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [AuthModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
