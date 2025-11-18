import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../../config/logger';
import { jwtService } from '../utils/jwt';

/**
 * WebSocket Service for Real-time Updates
 * Handles Socket.io connections and event broadcasting
 */

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

export class WebSocketService {
  private io: Server | null = null;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
        credentials: true,
      },
      path: '/socket.io',
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const payload = jwtService.verifyToken(token);

        if (payload.type !== 'access') {
          return next(new Error('Authentication error: Invalid token type'));
        }

        socket.userId = payload.userId;
        socket.userEmail = payload.email;

        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('✅ WebSocket server initialized');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    const socketId = socket.id;

    // Track connected user
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);

    logger.info(`WebSocket connected: ${userId} (${socketId})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join global room
    socket.join('global');

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle custom events
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Subscribe to specific channels
    socket.on('subscribe', (channel: string) => {
      socket.join(channel);
      logger.debug(`User ${userId} subscribed to ${channel}`);
    });

    socket.on('unsubscribe', (channel: string) => {
      socket.leave(channel);
      logger.debug(`User ${userId} unsubscribed from ${channel}`);
    });
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    const socketId = socket.id;

    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    logger.info(`WebSocket disconnected: ${userId} (${socketId})`);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcastGlobal(event: string, data: any) {
    if (!this.io) return;
    this.io.to('global').emit(event, data);
    logger.debug(`Broadcast global: ${event}`);
  }

  /**
   * Send event to a specific user (all their connected devices)
   */
  sendToUser(userId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
    logger.debug(`Sent to user ${userId}: ${event}`);
  }

  /**
   * Send event to multiple users
   */
  sendToUsers(userIds: string[], event: string, data: any) {
    if (!this.io) return;
    userIds.forEach(userId => {
      this.sendToUser(userId, event, data);
    });
  }

  /**
   * Send event to a specific channel/room
   */
  sendToChannel(channel: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(channel).emit(event, data);
    logger.debug(`Sent to channel ${channel}: ${event}`);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get all connected users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Get connection count for a user
   */
  getUserConnectionCount(userId: string): number {
    return this.connectedUsers.get(userId)?.size || 0;
  }

  /**
   * Get total connection count
   */
  getTotalConnections(): number {
    return Array.from(this.connectedUsers.values())
      .reduce((total, sockets) => total + sockets.size, 0);
  }
}

export const websocketService = new WebSocketService();

// Event types for type safety
export const WebSocketEvents = {
  // Feed events
  FEED_POST_CREATED: 'feed:post:created',
  FEED_POST_UPDATED: 'feed:post:updated',
  FEED_POST_DELETED: 'feed:post:deleted',
  FEED_COMMENT_ADDED: 'feed:comment:added',
  FEED_POST_LIKED: 'feed:post:liked',

  // Event events
  EVENT_CREATED: 'event:created',
  EVENT_UPDATED: 'event:updated',
  EVENT_PUBLISHED: 'event:published',
  EVENT_CANCELLED: 'event:cancelled',
  EVENT_REGISTRATION: 'event:registration',

  // Notification events
  NOTIFICATION_RECEIVED: 'notification:received',

  // Member events
  MEMBER_ONLINE: 'member:online',
  MEMBER_OFFLINE: 'member:offline',
} as const;
