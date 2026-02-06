import { useEffect, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3001';

export interface InventoryEvent {
  type: 'checkin' | 'checkout' | 'item_created' | 'item_updated' | 'item_deleted' | 'bin_created' | 'bin_updated' | 'bin_deleted' | 'connected';
  data?: any;
  timestamp: string;
}

type EventHandler = (event: InventoryEvent) => void;

// Singleton SSE connection shared across all components
let globalEventSource: EventSource | null = null;
let listeners: Set<EventHandler> = new Set();
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function connectSSE() {
  if (globalEventSource?.readyState === EventSource.OPEN) return;

  // Clean up existing connection
  if (globalEventSource) {
    globalEventSource.close();
  }

  const url = `${API_URL}/api/events`;
  console.log('[SSE] Connecting to', url);
  globalEventSource = new EventSource(url);

  globalEventSource.onmessage = (e) => {
    try {
      const event: InventoryEvent = JSON.parse(e.data);
      console.log('[SSE] Event:', event.type, event.data);
      for (const handler of listeners) {
        try {
          handler(event);
        } catch (err) {
          console.error('[SSE] Handler error:', err);
        }
      }
    } catch (err) {
      console.error('[SSE] Parse error:', err);
    }
  };

  globalEventSource.onerror = () => {
    console.log('[SSE] Connection error, reconnecting in 3s...');
    globalEventSource?.close();
    globalEventSource = null;

    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      if (listeners.size > 0) {
        connectSSE();
      }
    }, 3000);
  };

  globalEventSource.onopen = () => {
    console.log('[SSE] Connected');
  };
}

function disconnectSSE() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
}

/**
 * Hook to listen for real-time inventory events via SSE.
 *
 * @param onEvent - Called whenever a server event arrives.
 *   Return nothing; use this to trigger re-fetches.
 * @param eventTypes - Optional filter: only call onEvent for these types.
 */
export function useRealtimeEvents(
  onEvent: EventHandler,
  eventTypes?: InventoryEvent['type'][]
) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  const wrappedHandler = useCallback(
    (event: InventoryEvent) => {
      if (eventTypes && !eventTypes.includes(event.type)) return;
      handlerRef.current(event);
    },
    // eventTypes is intentionally compared by value
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(eventTypes)]
  );

  useEffect(() => {
    listeners.add(wrappedHandler);
    connectSSE();

    return () => {
      listeners.delete(wrappedHandler);
      // Disconnect if no listeners remain
      if (listeners.size === 0) {
        disconnectSSE();
      }
    };
  }, [wrappedHandler]);
}
