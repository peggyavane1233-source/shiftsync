/**
 * src/hooks/useStompWebSocket.ts
 * PURPOSE: Connect to the emergency service STOMP broker and subscribe to a topic.
 * Handles reconnection with exponential backoff.
 * The emergency service WebSocket endpoint is at ws://host:8086/ws-emergency
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';

const WS_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8086')
  .replace(/^http/, 'ws')
  // Point directly at emergency service for STOMP
  .replace(/:8080$/, ':8086');

interface UseStompOptions {
  topic: string;
  onMessage: (data: any) => void;
  enabled?: boolean;
}

export function useStompWebSocket({ topic, onMessage, enabled = true }: UseStompOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);
  const reconnectCountRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled) return;

    const client = new Client({
      brokerURL: `${WS_BASE_URL}/ws-emergency/websocket`,
      reconnectDelay: Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000),

      onConnect: () => {
        setIsConnected(true);
        setLastError(null);
        reconnectCountRef.current = 0;

        // Subscribe to the muster topic
        client.subscribe(topic, (message: IMessage) => {
          try {
            const parsed = JSON.parse(message.body);
            onMessage(parsed);
          } catch (e) {
            onMessage(message.body);
          }
        });
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

      onWebSocketError: (evt) => {
        setLastError('WebSocket connection error');
        setIsConnected(false);
        reconnectCountRef.current += 1;
      },
    });

    clientRef.current = client;
    client.activate();
  }, [topic, onMessage, enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [connect]);

  return { isConnected, lastError };
}
