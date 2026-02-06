import { Request, Response } from 'express';

export interface InventoryEvent {
  type: 'checkin' | 'checkout' | 'item_created' | 'item_updated' | 'item_deleted' | 'bin_created' | 'bin_updated' | 'bin_deleted';
  data: any;
  timestamp: string;
}

class EventBus {
  private clients: Set<Response> = new Set();

  /**
   * SSE endpoint handler - call this from a GET route
   */
  subscribe = (req: Request, res: Response) => {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    this.clients.add(res);
    console.log(`📡 SSE client connected (${this.clients.size} total)`);

    // Keep-alive every 30s
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      this.clients.delete(res);
      console.log(`📡 SSE client disconnected (${this.clients.size} total)`);
    });
  };

  /**
   * Broadcast an event to all connected SSE clients
   */
  emit(event: InventoryEvent) {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (e) {
        // Client probably disconnected, remove it
        this.clients.delete(client);
      }
    }
    console.log(`📡 Broadcasted '${event.type}' to ${this.clients.size} clients`);
  }
}

export const eventBus = new EventBus();
