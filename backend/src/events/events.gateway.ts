import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
  WebSocket Gateway — broadcasts real-time referral events to all connected clients.
  Clients connect from the triage dashboard via socket.io-client.
  Events emitted:
  referral:new      { referralId, patientMrn, priority, destFacilityId }
  referral:updated  { referralId, status, note? }
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }


  //Broadcast a new incoming referral to all connected liaison dashboards.

  emitNewReferral(payload: {
    referralId: string;
    patientMrn: string;
    priority: string;
    destFacilityId: string;
    destFacilityName: string;
  }) {
    this.server.emit('referral:new', payload);
    this.logger.log(`Emitted referral:new for ${payload.referralId}`);
  }

  // Broadcast a referral status update to all connected clients.
  emitReferralUpdated(payload: {
    referralId: string;
    status: string;
    note?: string;
  }) {
    this.server.emit('referral:updated', payload);
    this.logger.log(
      `Emitted referral:updated for ${payload.referralId} → ${payload.status}`,
    );
  }
}
