import { useEffect, useRef, useState } from 'react';

export function useWebSocket(url: string, onMessage: (data: any) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: any;
    let isMounted = true;

    function connect() {
      if (!isMounted) return;
      const wsUrl = url.replace(/^http/, 'ws');
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isMounted) setIsConnected(true);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onMessage(data);
        } catch (err) {
          onMessage(e.data);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          setIsConnected(false);
          // Reconnect with backoff
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (e) => {
        ws.close();
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return { isConnected };
}
