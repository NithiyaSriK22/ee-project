"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEBroadcaster = void 0;
const logger_js_1 = require("../../../config/logger.js");
class SSEBroadcaster {
    static clients = new Map();
    static heartbeatInterval = null;
    static addClient(id, res, role) {
        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // For nginx proxies
        res.flushHeaders?.();
        const client = { id, res, role, connectedAt: new Date() };
        this.clients.set(id, client);
        // Initial connection ack
        this.sendEventToClient(client, 'connected', {
            clientId: id,
            serverTime: new Date().toISOString(),
            activeClients: this.clients.size,
        });
        logger_js_1.logger.info('Triage alert SSE client connected', {
            clientId: id,
            role,
            totalConnected: this.clients.size,
        });
        this.ensureHeartbeat();
    }
    static removeClient(id) {
        if (this.clients.has(id)) {
            this.clients.delete(id);
            logger_js_1.logger.info('Triage alert SSE client disconnected', {
                clientId: id,
                remainingConnected: this.clients.size,
            });
        }
        if (this.clients.size === 0 && this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    static broadcastAlert(eventType, alert) {
        for (const [id, client] of this.clients.entries()) {
            try {
                this.sendEventToClient(client, eventType, alert);
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to send SSE event to client, removing', { clientId: id, error: String(err) });
                this.clients.delete(id);
            }
        }
    }
    static sendEventToClient(client, event, data) {
        client.res.write(`event: ${event}\n`);
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
    static ensureHeartbeat() {
        if (this.heartbeatInterval)
            return;
        this.heartbeatInterval = setInterval(() => {
            const now = new Date().toISOString();
            for (const [id, client] of this.clients.entries()) {
                try {
                    client.res.write(`event: ping\ndata: {"time":"${now}"}\n\n`);
                }
                catch {
                    this.clients.delete(id);
                }
            }
        }, 15000); // 15 seconds heartbeat
    }
    static getActiveClientCount() {
        return this.clients.size;
    }
}
exports.SSEBroadcaster = SSEBroadcaster;
