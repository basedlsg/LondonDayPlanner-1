import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { useCity } from './useCity';
import { useAuth } from './useAuth';

interface RealtimeConfig {
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
}

interface RealtimeMessage {
  type: string;
  room?: string;
  data?: any;
  timestamp?: number;
}

type MessageHandler = (message: RealtimeMessage) => void;

export function useRealtimeUpdates(config: RealtimeConfig = {}) {
  const { toast } = useToast();
  const { currentCity } = useCity();
  const { user } = useAuth();
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const pingTimer = useRef<NodeJS.Timeout | null>(null);
  const messageHandlers = useRef<Map<string, Set<MessageHandler>>>(new Map());
  
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [subscribedRooms, setSubscribedRooms] = useState<Set<string>>(new Set());

  const {
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    pingInterval = 30000
  } = config;

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV ? 'localhost:5001' : window.location.host;
    const params = new URLSearchParams();
    
    if (user?.id) params.append('userId', user.id);
    if (currentCity?.slug) params.append('city', currentCity.slug);
    
    const wsUrl = `${protocol}//${host}/ws?${params.toString()}`;
    
    try {
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        console.log('[Realtime] Connected');
        setConnected(true);
        setReconnectAttempts(0);
        
        // Resubscribe to rooms
        subscribedRooms.forEach(room => {
          ws.current?.send(JSON.stringify({
            type: 'subscribe',
            room
          }));
        });
        
        // Start ping interval
        startPingInterval();
      };
      
      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as RealtimeMessage;
          handleMessage(message);
        } catch (error) {
          console.error('[Realtime] Failed to parse message:', error);
        }
      };
      
      ws.current.onclose = (event) => {
        console.log('[Realtime] Disconnected:', event.code, event.reason);
        setConnected(false);
        stopPingInterval();
        
        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('[Realtime] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[Realtime] Failed to connect:', error);
      scheduleReconnect();
    }
  }, [user, currentCity, reconnectAttempts, maxReconnectAttempts, subscribedRooms]);

  // Handle incoming messages
  const handleMessage = useCallback((message: RealtimeMessage) => {
    // Notify all registered handlers
    const handlers = messageHandlers.current.get(message.type) || new Set();
    handlers.forEach(handler => handler(message));
    
    // Handle specific message types
    switch (message.type) {
      case 'update':
        if (message.data?.event === 'itinerary_updated') {
          toast({
            title: 'Itinerary Updated',
            description: 'Your itinerary has been updated with new information.'
          });
        }
        break;
        
      case 'presence':
        if (message.data?.event === 'user_joined') {
          console.log(`[Realtime] User joined room: ${message.room}`);
        }
        break;
        
      case 'analytics':
        // Analytics data received
        break;
    }
  }, [toast]);

  // Subscribe to a room
  const subscribe = useCallback((room: string) => {
    if (!room) return;
    
    setSubscribedRooms(prev => new Set(prev).add(room));
    
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'subscribe',
        room
      }));
    }
  }, []);

  // Unsubscribe from a room
  const unsubscribe = useCallback((room: string) => {
    if (!room) return;
    
    setSubscribedRooms(prev => {
      const next = new Set(prev);
      next.delete(room);
      return next;
    });
    
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'unsubscribe',
        room
      }));
    }
  }, []);

  // Send a message
  const send = useCallback((message: RealtimeMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('[Realtime] Cannot send message - not connected');
    }
  }, []);

  // Register a message handler
  const on = useCallback((type: string, handler: MessageHandler) => {
    if (!messageHandlers.current.has(type)) {
      messageHandlers.current.set(type, new Set());
    }
    messageHandlers.current.get(type)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      messageHandlers.current.get(type)?.delete(handler);
    };
  }, []);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return;
    
    const attempts = reconnectAttempts + 1;
    setReconnectAttempts(attempts);
    
    console.log(`[Realtime] Reconnecting in ${reconnectDelay}ms (attempt ${attempts}/${maxReconnectAttempts})`);
    
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      connect();
    }, reconnectDelay);
  }, [connect, reconnectAttempts, reconnectDelay, maxReconnectAttempts]);

  // Ping/pong to keep connection alive
  const startPingInterval = useCallback(() => {
    if (pingTimer.current) return;
    
    pingTimer.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        send({ type: 'ping' });
      }
    }, pingInterval);
  }, [send, pingInterval]);

  const stopPingInterval = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
      pingTimer.current = null;
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      stopPingInterval();
      
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect, stopPingInterval]);

  // Reconnect when city or user changes
  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      send({
        type: 'presence',
        data: {
          userId: user?.id,
          city: currentCity?.slug
        }
      });
    }
  }, [user, currentCity, send]);

  return {
    connected,
    subscribe,
    unsubscribe,
    send,
    on,
    reconnectAttempts,
    subscribedRooms: Array.from(subscribedRooms)
  };
}

// Hook for subscribing to specific itinerary updates
export function useItineraryUpdates(itineraryId?: number) {
  const realtime = useRealtimeUpdates();
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  useEffect(() => {
    if (!itineraryId) return;

    const room = `itinerary:${itineraryId}`;
    realtime.subscribe(room);

    const unsubscribe = realtime.on('update', (message) => {
      if (message.room === room && message.data?.event === 'itinerary_updated') {
        setLastUpdate(message.data);
      }
    });

    return () => {
      realtime.unsubscribe(room);
      unsubscribe();
    };
  }, [itineraryId, realtime]);

  return { lastUpdate, connected: realtime.connected };
}

// Hook for subscribing to venue updates
export function useVenueUpdates(placeId?: string) {
  const realtime = useRealtimeUpdates();
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  useEffect(() => {
    if (!placeId) return;

    const room = `venue:${placeId}`;
    realtime.subscribe(room);

    const unsubscribe = realtime.on('update', (message) => {
      if (message.room === room && message.data?.event === 'venue_updated') {
        setLastUpdate(message.data);
      }
    });

    return () => {
      realtime.unsubscribe(room);
      unsubscribe();
    };
  }, [placeId, realtime]);

  return { lastUpdate, connected: realtime.connected };
}

// Hook for real-time analytics
export function useRealtimeAnalytics(city?: string) {
  const realtime = useRealtimeUpdates();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = useCallback(() => {
    setLoading(true);
    realtime.send({
      type: 'analytics',
      data: { city }
    });
  }, [city, realtime]);

  useEffect(() => {
    const unsubscribe = realtime.on('analytics', (message) => {
      setAnalytics(message.data);
      setLoading(false);
    });

    // Fetch initial analytics
    if (realtime.connected) {
      fetchAnalytics();
    }

    return unsubscribe;
  }, [realtime, fetchAnalytics]);

  return { analytics, loading, refetch: fetchAnalytics, connected: realtime.connected };
}