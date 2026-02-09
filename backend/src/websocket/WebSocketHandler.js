/**
 * WebSocket Handler - Tunnel Protocol Handler
 * 
 * Manages:
 * - CLI client WebSocket connections
 * - Tunnel registration and lifecycle
 * - HTTP request/response message routing
 * - Streaming response support
 * - Connection heartbeat
 */

const {
    createLogger,
    parseMessage,
    serializeMessage,
    createTunnelRegisteredMessage,
    createErrorMessage,
    createPongMessage,
    MessageType,
    TUNNEL_CONFIG,
} = require('../../shared/src');

class WebSocketHandler {
    constructor(wss, tunnelManager, requestForwarder, config) {
        this.wss = wss;
        this.tunnelManager = tunnelManager;
        this.requestForwarder = requestForwarder;
        this.config = config;
        this.logger = createLogger({ name: 'WebSocketHandler' });

        // Client metadata
        this.clientMetadata = new Map();

        // Connection handler
        this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

        // Heartbeat check
        this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), TUNNEL_CONFIG.HEARTBEAT_INTERVAL);
    }

    /**
     * Handles new WebSocket connection from CLI client
     */
    handleConnection(ws, req) {
        const clientIp = req.socket.remoteAddress;
        const clientId = `${clientIp}:${Date.now()}`;

        this.logger.info(`CLI client connected: ${clientId}`);

        // Store metadata
        this.clientMetadata.set(ws, {
            clientId,
            clientIp,
            connectedAt: Date.now(),
            lastActivity: Date.now(),
            isAlive: true,
        });

        // Message handler
        ws.on('message', (data) => this.handleMessage(ws, data));

        // Error handler
        ws.on('error', (error) => {
            this.logger.error(`WebSocket error: ${clientId}`, { error: error.message });
        });

        // Close handler
        ws.on('close', (code, reason) => {
            this.logger.info(`CLI client disconnected: ${clientId}`, { code });
            this.handleDisconnect(ws);
        });

        // Pong handler for heartbeat
        ws.on('pong', () => {
            const meta = this.clientMetadata.get(ws);
            if (meta) {
                meta.isAlive = true;
                meta.lastActivity = Date.now();
            }
        });
    }

    /**
     * Handles incoming WebSocket message from CLI client
     */
    handleMessage(ws, data) {
        const message = parseMessage(data);

        if (!message) {
            this.logger.warn('Invalid message format received');
            this.send(ws, createErrorMessage('Invalid message format', 'INVALID_MESSAGE'));
            return;
        }

        // Update activity timestamp
        const meta = this.clientMetadata.get(ws);
        if (meta) {
            meta.lastActivity = Date.now();
        }

        this.logger.debug(`Message: ${message.type}`, { requestId: message.payload?.requestId });

        // Route by message type
        switch (message.type) {
            case MessageType.TUNNEL_REGISTER:
                this.handleTunnelRegister(ws, message.payload);
                break;

            case MessageType.TUNNEL_CLOSE:
                this.handleTunnelClose(ws, message.payload);
                break;

            case MessageType.HTTP_RESPONSE:
                this.handleHttpResponse(ws, message.payload);
                break;

            case MessageType.HTTP_RESPONSE_CHUNK:
                this.handleHttpResponseChunk(ws, message.payload);
                break;

            case MessageType.HTTP_RESPONSE_END:
                this.handleHttpResponseEnd(ws, message.payload);
                break;

            case MessageType.HTTP_ERROR:
                this.handleHttpError(ws, message.payload);
                break;

            case MessageType.PING:
                this.send(ws, createPongMessage(message.payload.timestamp));
                break;

            case MessageType.PONG:
                // Already handled by ws.on('pong')
                break;

            default:
                this.logger.warn(`Unknown message type: ${message.type}`);
                this.send(ws, createErrorMessage(`Unknown message type: ${message.type}`, 'UNKNOWN_MESSAGE'));
        }
    }

    /**
     * Handles tunnel registration from CLI client
     */
    handleTunnelRegister(ws, payload) {
        const { subdomain, localPort, authToken } = payload;

        this.logger.info(`Tunnel registration: localPort=${localPort}, subdomain=${subdomain || 'auto'}`);

        const meta = this.clientMetadata.get(ws);

        const result = this.tunnelManager.registerTunnel({
            ws,
            requestedSubdomain: subdomain,
            localPort,
            clientInfo: {
                clientId: meta?.clientId,
                clientIp: meta?.clientIp,
                authToken,
            },
        });

        if (result.success) {
            const { tunnel } = result;
            const publicUrl = this.buildPublicUrl(tunnel.subdomain);

            this.send(ws, createTunnelRegisteredMessage({
                tunnelId: tunnel.tunnelId,
                publicUrl,
                subdomain: tunnel.subdomain,
            }));

            this.logger.info(`Tunnel active: ${tunnel.subdomain} -> localhost:${localPort}`, {
                tunnelId: tunnel.tunnelId,
                publicUrl,
            });
        } else {
            this.send(ws, createErrorMessage(result.error, result.code));
            this.logger.warn(`Tunnel registration failed: ${result.error}`);
        }
    }

    /**
     * Handles tunnel close request
     */
    handleTunnelClose(ws, payload) {
        const { tunnelId, reason } = payload;
        this.tunnelManager.closeTunnel(tunnelId, reason || 'Client closed');
        this.logger.info(`Tunnel closed: ${tunnelId}`, { reason });
    }

    /**
     * Handles HTTP response from CLI client
     */
    handleHttpResponse(ws, payload) {
        const tunnels = this.tunnelManager.getTunnelsByWs(ws);

        for (const tunnel of tunnels) {
            const pending = tunnel.getPendingRequest(payload.requestId);
            if (pending) {
                this.requestForwarder.handleResponse(tunnel, payload);
                return;
            }
        }

        this.logger.warn(`No tunnel found for response: ${payload.requestId}`);
    }

    /**
     * Handles streaming response chunk
     */
    handleHttpResponseChunk(ws, payload) {
        const tunnels = this.tunnelManager.getTunnelsByWs(ws);

        for (const tunnel of tunnels) {
            const pending = tunnel.getPendingRequest(payload.requestId);
            if (pending) {
                this.requestForwarder.handleResponseChunk(tunnel, payload);
                return;
            }
        }

        this.logger.warn(`No tunnel found for chunk: ${payload.requestId}`);
    }

    /**
     * Handles streaming response end
     */
    handleHttpResponseEnd(ws, payload) {
        const tunnels = this.tunnelManager.getTunnelsByWs(ws);

        for (const tunnel of tunnels) {
            const pending = tunnel.getPendingRequest(payload.requestId);
            if (pending) {
                this.requestForwarder.handleResponseEnd(tunnel, payload);
                return;
            }
        }

        this.logger.warn(`No tunnel found for response end: ${payload.requestId}`);
    }

    /**
     * Handles HTTP error from CLI client
     */
    handleHttpError(ws, payload) {
        const tunnels = this.tunnelManager.getTunnelsByWs(ws);

        for (const tunnel of tunnels) {
            const pending = tunnel.getPendingRequest(payload.requestId);
            if (pending) {
                this.requestForwarder.handleError(tunnel, payload);
                return;
            }
        }

        this.logger.warn(`No tunnel found for error: ${payload.requestId}`);
    }

    /**
     * Handles client disconnect
     */
    handleDisconnect(ws) {
        this.tunnelManager.closeTunnelsForWs(ws, 'Client disconnected');
        this.clientMetadata.delete(ws);
    }

    /**
     * Sends message to WebSocket client
     */
    send(ws, message) {
        if (ws.readyState === 1) {
            ws.send(serializeMessage(message));
        }
    }

    /**
     * Heartbeat check for all clients
     */
    checkHeartbeats() {
        for (const [ws, meta] of this.clientMetadata) {
            if (!meta.isAlive) {
                this.logger.warn(`Client unresponsive: ${meta.clientId}`);
                ws.terminate();
                this.handleDisconnect(ws);
                continue;
            }

            meta.isAlive = false;
            ws.ping();
        }
    }

    /**
     * Builds public URL for subdomain
     */
    buildPublicUrl(subdomain) {
        const port = this.config.httpPort !== 80 && this.config.httpPort !== 443
            ? `:${this.config.httpPort}`
            : '';
        return `http://${subdomain}.${this.config.publicDomain}${port}`;
    }

    /**
     * Stops the handler
     */
    stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }

    /**
     * Gets connected client count
     */
    getClientCount() {
        return this.clientMetadata.size;
    }
}

module.exports = WebSocketHandler;
