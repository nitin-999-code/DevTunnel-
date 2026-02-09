/**
 * Dashboard WebSocket Handler
 * 
 * Handles WebSocket connections from the dashboard
 * for real-time traffic updates.
 * 
 * This is separate from the tunnel WebSocket to keep concerns separate.
 */

const { WebSocketServer } = require('ws');
const { createLogger } = require('../../shared/src');

class DashboardWebSocketHandler {
    constructor(server, inspectorService) {
        this.logger = createLogger({ name: 'DashboardWS' });
        this.inspectorService = inspectorService;

        // Connected dashboard clients
        this.clients = new Set();

        // Create WebSocket server attached to the HTTP server
        this.wss = new WebSocketServer({
            server,
            path: '/ws/dashboard',
        });

        this.setupConnectionHandler();
        this.setupInspectorListeners();
    }

    /**
     * Sets up WebSocket connection handling
     */
    setupConnectionHandler() {
        this.wss.on('connection', (ws) => {
            this.logger.info('Dashboard client connected');
            this.clients.add(ws);

            // Send welcome message
            this.send(ws, {
                type: 'connected',
                message: 'Connected to DevTunnel+ Dashboard',
            });

            // Handle messages from dashboard
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(ws, message);
                } catch (error) {
                    this.logger.error('Invalid message from dashboard', { error: error.message });
                }
            });

            // Handle disconnect
            ws.on('close', () => {
                this.logger.info('Dashboard client disconnected');
                this.clients.delete(ws);
            });

            // Handle errors
            ws.on('error', (error) => {
                this.logger.error('Dashboard WebSocket error', { error: error.message });
                this.clients.delete(ws);
            });
        });
    }

    /**
     * Sets up listeners for inspector events
     */
    setupInspectorListeners() {
        // When a new request is captured
        this.inspectorService.on('request', (data) => {
            this.broadcast({
                type: 'traffic:request',
                data,
            });
        });

        // When a response is captured
        this.inspectorService.on('response', (data) => {
            this.broadcast({
                type: 'traffic:response',
                data,
            });
        });

        // When metrics are updated (every 5 seconds)
        this.inspectorService.on('metrics', (stats) => {
            this.broadcast({
                type: 'metrics:update',
                data: stats,
            });
        });
    }

    /**
     * Handles messages from dashboard clients
     */
    handleMessage(ws, message) {
        switch (message.type) {
            case 'subscribe':
                this.logger.debug(`Dashboard subscribed to: ${message.channel}`);
                // Currently all clients get all updates
                break;

            case 'ping':
                this.send(ws, { type: 'pong' });
                break;

            default:
                this.logger.debug(`Unknown dashboard message: ${message.type}`);
        }
    }

    /**
     * Sends a message to a specific client
     */
    send(ws, message) {
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Broadcasts a message to all connected dashboard clients
     */
    broadcast(message) {
        const data = JSON.stringify(message);

        for (const client of this.clients) {
            if (client.readyState === 1) {
                client.send(data);
            }
        }
    }

    /**
     * Gets the count of connected dashboard clients
     */
    getClientCount() {
        return this.clients.size;
    }
}

module.exports = DashboardWebSocketHandler;
