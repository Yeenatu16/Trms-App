import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client connected to the backend /events namespace.
 * Safe to call multiple times — always returns the same instance.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${BACKEND_URL}/events`, {
      withCredentials: true,
      transports: ['polling', 'websocket'], // Try polling first for better handshake success
      autoConnect: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[TRMS Socket] Connected successfully:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[TRMS Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to reconnect manually
        socket?.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[TRMS Socket] Connection error:', err.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
