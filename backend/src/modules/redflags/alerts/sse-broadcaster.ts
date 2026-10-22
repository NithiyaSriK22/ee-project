import { Response } from 'express';
import { logger } from '../../../config/logger.js';
import { RedFlagAlertDTO } from '../redflags.types.js';

interface SSEClient {
  id: string;
  res: Response;
  role?: string;
  connectedAt: Date;
}

export class SSEBroadcaster {
  private static clients: Map<string, SSEClient> = new Map();
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  public static addClient(id: string, res: Response, role?: string): void {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // For nginx proxies
    res.flushHeaders?.();

    const client: SSEClient = { id, res, role, connectedAt: new Date() };
    this.clients.set(id, client);

    // Initial connection ack
    this.sendEventToClient(client, 'connected', {
      clientId: id,
      serverTime: new Date().toISOString(),
      activeClients: this.clients.size,
    });

    logger.info('Triage alert SSE client connected', {
      clientId: id,
      role,
      totalConnected: this.clients.size,
    });

    this.ensureHeartbeat();
  }

  public static removeClient(id: string): void {
    if (this.clients.has(id)) {
      this.clients.delete(id);
      logger.info('Triage alert SSE client disconnected', {
        clientId: id,
        remainingConnected: this.clients.size,
      });
    }

    if (this.clients.size === 0 && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public static broadcastAlert(eventType: string, alert: RedFlagAlertDTO): void {
    for (const [id, client] of this.clients.entries()) {
      try {
        this.sendEventToClient(client, eventType, alert);
      } catch (err) {
        logger.warn('Failed to send SSE event to client, removing', { clientId: id, error: String(err) });
        this.clients.delete(id);
      }
    }
  }

  private static sendEventToClient(client: SSEClient, event: string, data: any): void {
    client.res.write(`event: ${event}\n`);
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private static ensureHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      const now = new Date().toISOString();
      for (const [id, client] of this.clients.entries()) {
        try {
          client.res.write(`event: ping\ndata: {"time":"${now}"}\n\n`);
        } catch {
          this.clients.delete(id);
        }
      }
    }, 15000); // 15 seconds heartbeat
  }

  public static getActiveClientCount(): number {
    return this.clients.size;
  }
}
