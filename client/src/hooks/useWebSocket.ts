import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

interface UseWebSocketOptions {
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  /** If false, the WebSocket will not auto-connect */
  enabled?: boolean;
}

/**
 * Adapted from _salvage/useWebSocket.ts
 * - Fixed duplicate `const WS_URL` declaration
 * - Added `enabled` flag so the hook only connects when required
 * - Uses VITE_WS_URL instead of VITE_WS_URL with a different port
 */
export const useWebSocket = ({
  onMessage,
  onOpen,
  onClose,
  onError,
  enabled = true,
}: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((s) => s.token);
  const reconnectCountRef = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalDisconnectRef = useRef(false);

  // Keep callback refs stable to avoid reconnect on every render
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  });

  // Reset reconnect attempts when enabled or token changes. NOTE: this must
  // NOT bump reconnectTrigger — the connect effect below already depends on
  // [token, enabled], so bumping here made that effect run a second time
  // back-to-back. The first run's cleanup nulled the handlers on the
  // still-CONNECTING socket (see below), so onopen never fired and
  // start_interview was never sent — exactly the "connects then idles"
  // backend pattern.
  useEffect(() => {
    if (enabled && token) {
      intentionalDisconnectRef.current = false;
      reconnectCountRef.current = 0;
    }
  }, [enabled, token]);

  useEffect(() => {
    if (!enabled || !token) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus(reconnectCountRef.current > 0 ? 'reconnecting' : 'disconnected');

    const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      reconnectCountRef.current = 0;
      onOpenRef.current?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        onMessageRef.current?.(data);
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      onCloseRef.current?.();

      if (!intentionalDisconnectRef.current) {
        if (reconnectCountRef.current < maxReconnectAttempts) {
          setConnectionStatus('reconnecting');
          reconnectCountRef.current += 1;
          const delay = reconnectCountRef.current * 2000; // 2s, 4s, 6s backoff
          console.log(`[WS] Reconnecting in ${delay}ms... (attempt ${reconnectCountRef.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectTrigger((prev) => prev + 1);
          }, delay);
        } else {
          console.error('[WS] Max reconnect attempts reached');
          setConnectionStatus('disconnected');
        }
      } else {
        setConnectionStatus('disconnected');
      }
    };

    ws.onerror = (err) => {
      onErrorRef.current?.(err);
    };

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      // Close even while CONNECTING: cleanup only runs when a replace is
      // genuinely wanted (deps changed), and closing the mid-handshake socket
      // before the new one starts keeps them from racing on the server.
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [token, enabled, reconnectTrigger]);

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send — socket not open');
    }
  }, []);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setConnectionStatus('disconnected');
  }, []);

  return { isConnected, connectionStatus, sendMessage, disconnect };
};
