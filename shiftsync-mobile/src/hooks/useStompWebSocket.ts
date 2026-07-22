/**
 * src/hooks/useStompWebSocket.ts
 * PURPOSE: Connect to attendance or emergency STOMP brokers and subscribe to a topic.
 * Handles reconnection with exponential backoff and optional REST resync on reconnect.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';

export type StompService = 'attendance' | 'emergency';

const SERVICE_CONFIG: Record<StompService, { port: number; path: string }> = {
  attendance: { port: 8084, path: 'ws-attendance' },
  emergency: { port: 8086, path: 'ws-emergency' },
};

function getBrokerUrl(service: StompService): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
  try {
    const parsed = new URL(apiUrl);
    parsed.port = String(SERVICE_CONFIG[service].port);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    parsed.pathname = '';
    return `${parsed.origin}/${SERVICE_CONFIG[service].path}/websocket`;
  } catch {
    return `ws://localhost:${SERVICE_CONFIG[service].port}/${SERVICE_CONFIG[service].path}/websocket`;
  }
}

interface UseStompOptions {
  service?: StompService;
  topic: string;
  onMessage: (data: any) => void;
  onReconnect?: () => void;
  enabled?: boolean;
}

export function useStompWebSocket({
  service = 'emergency',
  topic,
  onMessage,
  onReconnect,
  enabled = true,
}: UseStompOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);
  const reconnectCountRef = useRef(0);
  const hadConnectedRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  const onReconnectRef = useRef(onReconnect);

  onMessageRef.current = onMessage;
  onReconnectRef.current = onReconnect;

  const connect = useCallback(() => {
    if (!enabled || !topic) return;

    const client = new Client({
      brokerURL: getBrokerUrl(service),
      reconnectDelay: Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000),

      onConnect: () => {
        const isReconnect = hadConnectedRef.current;
        setIsConnected(true);
        setLastError(null);
        reconnectCountRef.current = 0;
        hadConnectedRef.current = true;

        client.subscribe(topic, (message: IMessage) => {
          try {
            onMessageRef.current(JSON.parse(message.body));
          } catch {
            onMessageRef.current(message.body);
          }
        });

        if (isReconnect) {
          onReconnectRef.current?.();
        }
      },

      onDisconnect: () => {
        setIsConnected(false);
        reconnectCountRef.current += 1;
      },

      onStompError: (frame) => {
        setLastError(frame.headers['message'] || 'STOMP error');
        setIsConnected(false);
        reconnectCountRef.current += 1;
      },

      onWebSocketError: () => {
        setLastError('WebSocket connection error');
        setIsConnected(false);
        reconnectCountRef.current += 1;
      },
    });

    clientRef.current = client;
    client.activate();
  }, [service, topic, enabled]);

  useEffect(() => {
    hadConnectedRef.current = false;
    connect();
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, lastError };
}
