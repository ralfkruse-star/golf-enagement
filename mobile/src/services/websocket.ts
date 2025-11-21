/**
 * WebSocket Service
 * Real-time connection using Socket.io
 */

import { io, Socket } from 'socket.io-client';
import { WS_URL, STORAGE_KEYS } from '../constants';
import { storage } from './storage';

type SocketEventCallback = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketEventCallback>> = new Map();

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      console.warn('[WebSocket] No auth token, skipping connection');
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });

    // Setup event forwarding to registered listeners
    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[WebSocket] Disconnected manually');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Subscribe to a WebSocket event
   */
  on(event: string, callback: SocketEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Emit a WebSocket event
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot emit event:', event);
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Subscribe to a channel/room
   */
  subscribe(channel: string): void {
    this.emit('subscribe', channel);
    console.log('[WebSocket] Subscribed to channel:', channel);
  }

  /**
   * Unsubscribe from a channel/room
   */
  unsubscribe(channel: string): void {
    this.emit('unsubscribe', channel);
    console.log('[WebSocket] Unsubscribed from channel:', channel);
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Feed events
    this.socket.on('feed:post:created', (data) => this.notifyListeners('feed:post:created', data));
    this.socket.on('feed:post:updated', (data) => this.notifyListeners('feed:post:updated', data));
    this.socket.on('feed:post:deleted', (data) => this.notifyListeners('feed:post:deleted', data));
    this.socket.on('feed:comment:added', (data) =>
      this.notifyListeners('feed:comment:added', data)
    );
    this.socket.on('feed:post:liked', (data) => this.notifyListeners('feed:post:liked', data));

    // Event events
    this.socket.on('event:created', (data) => this.notifyListeners('event:created', data));
    this.socket.on('event:updated', (data) => this.notifyListeners('event:updated', data));
    this.socket.on('event:published', (data) => this.notifyListeners('event:published', data));
    this.socket.on('event:cancelled', (data) => this.notifyListeners('event:cancelled', data));
    this.socket.on('event:registration', (data) =>
      this.notifyListeners('event:registration', data)
    );

    // Notification events
    this.socket.on('notification:received', (data) =>
      this.notifyListeners('notification:received', data)
    );

    // Member events
    this.socket.on('member:online', (data) => this.notifyListeners('member:online', data));
    this.socket.on('member:offline', (data) => this.notifyListeners('member:offline', data));

    // Ping/Pong for connection testing
    this.socket.on('pong', (data) => {
      console.log('[WebSocket] Pong received:', data);
    });
  }

  private notifyListeners(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Test connection by sending ping
   */
  ping(): void {
    this.emit('ping');
  }
}

export const websocket = new WebSocketService();
