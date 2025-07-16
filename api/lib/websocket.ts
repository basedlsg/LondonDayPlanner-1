import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { IStorage } from '../storage';
import { getAnalytics } from './analytics';

interface WSClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  city?: string;
  rooms: Set<string>;
}

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'update' | 'analytics' | 'presence' | 'ping';
  room?: string;
  data?: any;
  timestamp?: number;
}

export class RealtimeService {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient>;
  private rooms: Map<string, Set<string>>; // room -> client IDs
  private storage: IStorage;
  private pingInterval: NodeJS.Timeout;

  constructor(server: Server, storage: IStorage) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      perMessageDeflate: true
    });
    
    this.clients = new Map();
    this.rooms = new Map();
    this.storage = storage;

    this.setupWebSocketServer();
    this.startPingInterval();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = uuidv4();
      const client: WSClient = {
        id: clientId,
        ws,
        rooms: new Set()
      };

      // Extract user info from query params or headers
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');
      const city = url.searchParams.get('city');
      
      if (userId) client.userId = userId;
      if (city) client.city = city;

      this.clients.set(clientId, client);
      console.log(`[WS] Client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'update',
        data: {
          message: 'Connected to realtime service',
          clientId,
          timestamp: Date.now()
        }
      });

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString()) as WSMessage;
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
          this.sendToClient(clientId, {
            type: 'update',
            data: { error: 'Invalid message format' }
          });
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      ws.on('error', (error) => {
        console.error(`[WS] Client error ${clientId}:`, error);
      });

      ws.on('pong', () => {
        // Client is alive
        client.ws.isAlive = true;
      });
    });
  }

  private handleMessage(clientId: string, message: WSMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.room) {
          this.subscribeToRoom(clientId, message.room);
        }
        break;

      case 'unsubscribe':
        if (message.room) {
          this.unsubscribeFromRoom(clientId, message.room);
        }
        break;

      case 'analytics':
        this.handleAnalyticsRequest(clientId, message.data);
        break;

      case 'presence':
        this.handlePresenceUpdate(clientId, message.data);
        break;

      case 'ping':
        this.sendToClient(clientId, { 
          type: 'update', 
          data: { pong: true, timestamp: Date.now() } 
        });
        break;

      default:
        console.warn(`[WS] Unknown message type: ${message.type}`);
    }
  }

  private subscribeToRoom(clientId: string, room: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.add(room);
    
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(clientId);

    console.log(`[WS] Client ${clientId} subscribed to room: ${room}`);

    // Send confirmation
    this.sendToClient(clientId, {
      type: 'update',
      room,
      data: {
        subscribed: true,
        room,
        members: this.rooms.get(room)!.size
      }
    });

    // Notify others in room
    this.broadcastToRoom(room, {
      type: 'presence',
      room,
      data: {
        event: 'user_joined',
        userId: client.userId,
        members: this.rooms.get(room)!.size
      }
    }, clientId);
  }

  private unsubscribeFromRoom(clientId: string, room: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.rooms.delete(room);
    
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }

    console.log(`[WS] Client ${clientId} unsubscribed from room: ${room}`);

    // Notify others in room
    if (roomClients && roomClients.size > 0) {
      this.broadcastToRoom(room, {
        type: 'presence',
        room,
        data: {
          event: 'user_left',
          userId: client.userId,
          members: roomClients.size
        }
      });
    }
  }

  private async handleAnalyticsRequest(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const analytics = getAnalytics(this.storage);
      const dashboardData = await analytics.getDashboardData(data?.city || client.city);
      
      this.sendToClient(clientId, {
        type: 'analytics',
        data: dashboardData
      });
    } catch (error) {
      console.error('[WS] Failed to fetch analytics:', error);
      this.sendToClient(clientId, {
        type: 'update',
        data: { error: 'Failed to fetch analytics' }
      });
    }
  }

  private handlePresenceUpdate(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Update client info
    if (data.userId) client.userId = data.userId;
    if (data.city) client.city = data.city;

    // Broadcast presence to all rooms the client is in
    client.rooms.forEach(room => {
      this.broadcastToRoom(room, {
        type: 'presence',
        room,
        data: {
          event: 'user_update',
          userId: client.userId,
          ...data
        }
      }, clientId);
    });
  }

  private handleDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`[WS] Client disconnected: ${clientId}`);

    // Remove from all rooms
    client.rooms.forEach(room => {
      this.unsubscribeFromRoom(clientId, room);
    });

    this.clients.delete(clientId);
  }

  private sendToClient(clientId: string, message: WSMessage) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || Date.now()
      }));
    } catch (error) {
      console.error(`[WS] Failed to send to client ${clientId}:`, error);
    }
  }

  private broadcastToRoom(room: string, message: WSMessage, excludeClientId?: string) {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;

    roomClients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  public broadcast(message: WSMessage) {
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  // Public API for server-side updates
  public notifyItineraryUpdate(itineraryId: number, data: any) {
    const room = `itinerary:${itineraryId}`;
    this.broadcastToRoom(room, {
      type: 'update',
      room,
      data: {
        event: 'itinerary_updated',
        itineraryId,
        ...data
      }
    });
  }

  public notifyVenueUpdate(placeId: string, data: any) {
    const room = `venue:${placeId}`;
    this.broadcastToRoom(room, {
      type: 'update',
      room,
      data: {
        event: 'venue_updated',
        placeId,
        ...data
      }
    });
  }

  public notifyCityUpdate(city: string, data: any) {
    const room = `city:${city}`;
    this.broadcastToRoom(room, {
      type: 'update',
      room,
      data: {
        event: 'city_updated',
        city,
        ...data
      }
    });
  }

  private startPingInterval() {
    // Ping all clients every 30 seconds to keep connections alive
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          if (client.ws.isAlive === false) {
            client.ws.terminate();
            return;
          }
          
          client.ws.isAlive = false;
          client.ws.ping();
        }
      });
    }, 30000);
  }

  public shutdown() {
    clearInterval(this.pingInterval);
    
    // Close all client connections
    this.clients.forEach((client) => {
      client.ws.close(1000, 'Server shutting down');
    });
    
    this.wss.close();
  }
}

// Extend WebSocket type to include isAlive property
declare module 'ws' {
  interface WebSocket {
    isAlive?: boolean;
  }
}