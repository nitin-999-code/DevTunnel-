/**
 * Gateway Application
 * 
 * Complete DevTunnel+ Gateway Server with:
 * - HTTP/WebSocket servers
 * - Tunnel management
 * - Traffic inspection and replay
 * - Security and rate limiting
 * - Webhooks and metrics
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { WebSocketServer } = require('ws');
const { createLogger } = require('../shared/src');

// Core Services
const TunnelManager = require('./services/TunnelManager');
const RequestForwarder = require('./services/RequestForwarder');
const InspectorService = require('./services/InspectorService');
const ReplayService = require('./services/ReplayService');
const TrafficControlService = require('./services/TrafficControlService');
const DiffReplayService = require('./services/DiffReplayService');

// Security Services
const AuthService = require('./services/AuthService');
const RateLimiter = require('./services/RateLimiter');
const SecurityService = require('./services/SecurityService');

// Phase 5 Services
const WebhookService = require('./services/WebhookService');
const MetricsService = require('./services/MetricsService');
const QRCodeService = require('./services/QRCodeService');

// Routes
const createPublicRouter = require('./routes/publicRoutes');
const createApiRouter = require('./routes/apiRoutes');

// WebSocket Handlers
const WebSocketHandler = require('./websocket/WebSocketHandler');
const DashboardWebSocketHandler = require('./websocket/DashboardWebSocketHandler');

// Middleware
const {
    createAuthMiddleware,
    createRateLimitMiddleware,
    createSecurityMiddleware,
    createTunnelRateLimitMiddleware,
} = require('./middleware/security');

class GatewayApp {
    constructor(config) {
        this.config = config;
        this.logger = createLogger({ name: 'GatewayApp' });

        // Core services
        this.tunnelManager = new TunnelManager();
        this.inspectorService = new InspectorService();
        this.requestForwarder = new RequestForwarder(this.tunnelManager, this.inspectorService);
        this.replayService = new ReplayService(this.inspectorService, this.tunnelManager, this.requestForwarder);

        // Advanced traffic control services
        this.trafficControlService = new TrafficControlService();
        this.diffReplayService = new DiffReplayService(this.replayService, this.inspectorService);

        // Security services
        this.authService = new AuthService();
        this.rateLimiter = new RateLimiter({
            requestsPerMinute: config.rateLimit || 100,
            tunnelRequestsPerMinute: config.tunnelRateLimit || 200,
        });
        this.securityService = new SecurityService();

        // Phase 5 services
        this.webhookService = new WebhookService();
        this.metricsService = new MetricsService();
        this.qrCodeService = new QRCodeService();

        // Wire up event handlers for metrics and webhooks
        this.setupEventHandlers();

        // Initialize Express app
        this.app = this.createExpressApp();
        this.httpServer = http.createServer(this.app);

        // WebSocket servers
        this.wsServer = null;
        this.wsHandler = null;
        this.dashboardWsHandler = null;
    }

    /**
     * Sets up event handlers for metrics and webhooks
     */
    setupEventHandlers() {
        // Track tunnel events
        this.tunnelManager.on('tunnel:created', (tunnel) => {
            this.metricsService.recordTunnelCreated();
            this.webhookService.triggerEvent('tunnel:created', {
                tunnelId: tunnel.id,
                subdomain: tunnel.subdomain,
            });
        });

        this.tunnelManager.on('tunnel:closed', (tunnel, duration) => {
            this.metricsService.recordTunnelClosed(duration);
            this.webhookService.triggerEvent('tunnel:closed', {
                tunnelId: tunnel.id,
                subdomain: tunnel.subdomain,
                duration,
            });
        });

        // Track request events
        this.inspectorService.on('request', (data) => {
            this.metricsService.incrementCounter('requestsTotal');
        });

        this.inspectorService.on('response', (data) => {
            const success = data.response?.statusCode < 400;
            const duration = data.responseTime || 0;

            this.metricsService.recordRequest(
                success,
                duration,
                0, // bytes in
                0  // bytes out
            );
        });
    }

    /**
     * Creates Express application
     */
    createExpressApp() {
        const app = express();

        // Security middleware
        app.use(helmet({ contentSecurityPolicy: false }));
        app.use(createSecurityMiddleware(this.securityService));

        // CORS
        app.use(cors({
            origin: [this.config.dashboardUrl, 'http://localhost:3002'],
            credentials: true,
        }));

        // Compression
        app.use(compression());

        // Body parsing
        app.use(express.raw({ type: '*/*', limit: '10mb' }));

        // Request logging
        app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                this.logger.debug(`${req.method} ${req.path}`, {
                    status: res.statusCode,
                    duration: `${Date.now() - start}ms`,
                });
            });
            next();
        });

        // Subdomain extraction
        app.use((req, res, next) => {
            const host = req.headers.host || '';
            const parts = host.split('.');

            if (parts.length >= 2 && !['www', 'api'].includes(parts[0])) {
                req.subdomain = parts[0];
                req.isTunnelRequest = true;
            } else {
                req.isTunnelRequest = false;
            }
            next();
        });

        // Rate limiting
        app.use('/api', createRateLimitMiddleware(this.rateLimiter));
        app.use(createTunnelRateLimitMiddleware(this.rateLimiter));

        // Authentication
        app.use('/api', createAuthMiddleware(this.authService));

        // API routes
        app.use('/api', createApiRouter(this));

        // Metrics endpoint (Prometheus format)
        app.get('/metrics', (req, res) => {
            res.set('Content-Type', 'text/plain');
            res.send(this.metricsService.toPrometheus());
        });

        // Health check
        app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                tunnels: this.tunnelManager.getTunnelCount(),
                uptime: process.uptime(),
            });
        });

        // Public tunnel routes
        app.use('/', createPublicRouter(this));

        // Error handler
        app.use((err, req, res, next) => {
            this.logger.error('Express error', { error: err.message });
            res.status(500).json({ error: 'Internal server error' });
        });

        return app;
    }

    /**
     * Starts all servers
     */
    async start() {
        return new Promise((resolve, reject) => {
            this.httpServer.listen(this.config.httpPort, this.config.host, (err) => {
                if (err) return reject(err);

                this.wsServer = new WebSocketServer({
                    port: this.config.wsPort,
                    host: this.config.host,
                });

                this.wsHandler = new WebSocketHandler(
                    this.wsServer,
                    this.tunnelManager,
                    this.requestForwarder,
                    this.config
                );

                this.wsServer.on('listening', () => {
                    this.logger.info('Tunnel WebSocket server started');

                    this.dashboardWsHandler = new DashboardWebSocketHandler(
                        this.httpServer,
                        this.inspectorService
                    );
                    this.logger.info('Dashboard WebSocket server started');

                    this.logger.info('Development API Key: ' + this.authService.getDevKey());

                    resolve();
                });

                this.wsServer.on('error', reject);
            });

            this.httpServer.on('error', reject);
        });
    }

    /**
     * Stops all servers
     */
    async stop() {
        this.logger.info('Stopping gateway...');
        this.rateLimiter.stop();
        this.tunnelManager.closeAll();

        if (this.wsServer) {
            await new Promise(resolve => this.wsServer.close(resolve));
        }
        await new Promise(resolve => this.httpServer.close(resolve));

        this.logger.info('Gateway stopped');
    }
}

module.exports = GatewayApp;
