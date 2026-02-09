/**
 * API Routes
 * 
 * Complete DevTunnel+ API with:
 * - Tunnel management
 * - Traffic inspection
 * - Request replay
 * - Security management
 * - Webhooks
 * - Metrics
 * - QR codes
 */

const express = require('express');
const { createLogger } = require('../../shared/src');

const logger = createLogger({ name: 'ApiRoutes' });

function createApiRouter(app) {
    const router = express.Router();
    router.use(express.json());

    // ========================================
    // TUNNEL ENDPOINTS
    // ========================================

    router.get('/tunnels', (req, res) => {
        const tunnels = app.tunnelManager.getAllStats();
        res.json({ tunnels, count: tunnels.length });
    });

    router.get('/tunnels/:id', (req, res) => {
        const tunnel = app.tunnelManager.getTunnelById(req.params.id);
        if (!tunnel) {
            return res.status(404).json({ error: 'Tunnel not found' });
        }
        res.json(tunnel.getStats());
    });

    // Generate QR code for tunnel
    router.get('/tunnels/:id/qr', (req, res) => {
        const tunnel = app.tunnelManager.getTunnelById(req.params.id);
        if (!tunnel) {
            return res.status(404).json({ error: 'Tunnel not found' });
        }

        const format = req.query.format || 'svg';
        const url = `http://${tunnel.subdomain}.${app.config.publicDomain}:${app.config.httpPort}`;
        const qr = app.qrCodeService.generate(url, format);

        if (format === 'svg') {
            res.set('Content-Type', 'image/svg+xml');
            res.send(qr.data);
        } else {
            res.json(qr);
        }
    });

    // ========================================
    // TRAFFIC ENDPOINTS
    // ========================================

    router.get('/traffic', (req, res) => {
        const traffic = app.inspectorService.getAllTraffic(req.query);
        res.json({ traffic, count: traffic.length });
    });

    router.get('/traffic/tunnel/:tunnelId', (req, res) => {
        const traffic = app.inspectorService.getTrafficByTunnel(req.params.tunnelId, req.query);
        res.json({ traffic, count: traffic.length });
    });

    router.get('/traffic/:requestId', (req, res) => {
        const traffic = app.inspectorService.getTrafficById(req.params.requestId);
        if (!traffic) {
            return res.status(404).json({ error: 'Request not found' });
        }
        res.json(traffic);
    });

    router.delete('/traffic', (req, res) => {
        app.inspectorService.clear();
        res.json({ message: 'Traffic history cleared' });
    });

    router.get('/traffic/:requestId/curl', (req, res) => {
        try {
            const curl = app.replayService.generateCurl(req.params.requestId);
            res.json({ curl });
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    // ========================================
    // REPLAY ENDPOINTS
    // ========================================

    router.post('/replay/:requestId', async (req, res) => {
        try {
            const modifications = req.body.modifications || {};
            const result = await app.replayService.replayRequest(
                req.params.requestId,
                modifications
            );
            app.metricsService.incrementCounter('replaysTotal');
            res.json(result);
        } catch (error) {
            logger.error('Replay failed', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    });

    router.get('/replay/history', (req, res) => {
        const limit = parseInt(req.query.limit) || 50;
        const history = app.replayService.getHistory(limit);
        res.json({ history, count: history.length });
    });

    router.delete('/replay/history', (req, res) => {
        app.replayService.clearHistory();
        res.json({ message: 'Replay history cleared' });
    });

    // ========================================
    // SECURITY ENDPOINTS
    // ========================================

    router.get('/auth/key', (req, res) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Not available in production' });
        }
        res.json({ devKey: app.authService.getDevKey() });
    });

    router.post('/auth/keys', (req, res) => {
        const { name, permissions, rateLimit } = req.body;
        const apiKey = app.authService.createApiKey({
            userId: req.auth?.userId || 'anonymous',
            name,
            permissions,
            rateLimit,
        });
        res.json({ apiKey, message: 'Store this key securely' });
    });

    router.get('/auth/keys', (req, res) => {
        res.json({ keys: app.authService.getAllKeys() });
    });

    router.get('/security/status', (req, res) => {
        res.json({
            security: app.securityService.getStatus(),
            rateLimit: {
                requestsPerMinute: app.rateLimiter.config.requestsPerMinute,
                tunnelRequestsPerMinute: app.rateLimiter.config.tunnelRequestsPerMinute,
            },
        });
    });

    router.post('/security/blacklist', (req, res) => {
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ error: 'IP required' });
        app.securityService.addToBlacklist(ip);
        res.json({ message: `IP ${ip} blacklisted` });
    });

    router.delete('/security/blacklist/:ip', (req, res) => {
        app.securityService.removeFromBlacklist(req.params.ip);
        res.json({ message: `IP removed from blacklist` });
    });

    router.post('/security/whitelist', (req, res) => {
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ error: 'IP required' });
        app.securityService.addToWhitelist(ip);
        res.json({ message: `IP ${ip} whitelisted` });
    });

    router.post('/security/unblock', (req, res) => {
        app.securityService.clearBlocks();
        res.json({ message: 'All blocks cleared' });
    });

    // ========================================
    // WEBHOOK ENDPOINTS
    // ========================================

    router.get('/webhooks', (req, res) => {
        const subscriptions = app.webhookService.getAllSubscriptions();
        res.json({ subscriptions, count: subscriptions.length });
    });

    router.post('/webhooks', (req, res) => {
        try {
            const { url, events, headers, secret } = req.body;
            const id = app.webhookService.createSubscription({ url, events, headers, secret });
            res.json({ id, message: 'Webhook created' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    router.get('/webhooks/:id', (req, res) => {
        const subscription = app.webhookService.getSubscription(req.params.id);
        if (!subscription) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        res.json(subscription);
    });

    router.delete('/webhooks/:id', (req, res) => {
        const deleted = app.webhookService.deleteSubscription(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        res.json({ message: 'Webhook deleted' });
    });

    router.get('/webhooks/history', (req, res) => {
        const limit = parseInt(req.query.limit) || 50;
        const history = app.webhookService.getHistory(limit);
        res.json({ history, count: history.length });
    });

    router.get('/webhooks/deadletter', (req, res) => {
        const queue = app.webhookService.getDeadLetterQueue();
        res.json({ queue, count: queue.length });
    });

    router.post('/webhooks/deadletter/:deliveryId/retry', async (req, res) => {
        try {
            const result = await app.webhookService.retryFromDeadLetter(req.params.deliveryId);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // ========================================
    // METRICS ENDPOINTS
    // ========================================

    router.get('/metrics', (req, res) => {
        res.json(app.metricsService.getMetrics());
    });

    router.get('/metrics/prometheus', (req, res) => {
        res.set('Content-Type', 'text/plain');
        res.send(app.metricsService.toPrometheus());
    });

    router.post('/metrics/reset', (req, res) => {
        app.metricsService.reset();
        res.json({ message: 'Metrics reset' });
    });

    // ========================================
    // QR CODE ENDPOINTS
    // ========================================

    router.get('/qr', (req, res) => {
        const { url, format = 'svg' } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL parameter required' });
        }

        const qr = app.qrCodeService.generate(url, format);

        if (format === 'svg') {
            res.set('Content-Type', 'image/svg+xml');
            res.send(qr.data);
        } else {
            res.json(qr);
        }
    });

    // ========================================
    // STATS ENDPOINT
    // ========================================

    router.get('/stats', (req, res) => {
        res.json({
            tunnels: app.tunnelManager.getTunnelCount(),
            traffic: app.inspectorService.getStats(),
            replay: { historyCount: app.replayService.getHistory().length },
            security: app.securityService.getStatus(),
            webhooks: app.webhookService.getStats(),
            metrics: app.metricsService.getMetrics(),
            uptime: process.uptime(),
        });
    });

    // ========================================
    // TRAFFIC CONTROL ENDPOINTS (Dev-Infra)
    // ========================================

    // Get traffic control state
    router.get('/traffic-control', (req, res) => {
        res.json(app.trafficControlService.getState());
    });

    // Pause traffic stream
    router.post('/traffic-control/pause', (req, res) => {
        const result = app.trafficControlService.pause();
        res.json(result);
    });

    // Resume traffic stream
    router.post('/traffic-control/resume', (req, res) => {
        const result = app.trafficControlService.resume();
        res.json(result);
    });

    // Get paused request queue
    router.get('/traffic-control/queue', (req, res) => {
        const queue = app.trafficControlService.getQueue();
        res.json({ queue, count: queue.length });
    });

    // Set network throttle profile
    router.post('/traffic-control/throttle', (req, res) => {
        const { profile, latency, bandwidth } = req.body;
        const customConfig = profile === 'custom' ? { latency, bandwidth } : null;
        const result = app.trafficControlService.setThrottle(profile, customConfig);
        res.json(result);
    });

    // Configure chaos mode
    router.post('/traffic-control/chaos', (req, res) => {
        const result = app.trafficControlService.setChaosMode(req.body);
        res.json(result);
    });

    // Get chaos mode state
    router.get('/traffic-control/chaos', (req, res) => {
        res.json(app.trafficControlService.getChaosMode());
    });

    // Add request modification rule
    router.post('/traffic-control/modifications', (req, res) => {
        const { id, pattern, modification } = req.body;
        if (!id || !pattern) {
            return res.status(400).json({ error: 'ID and pattern required' });
        }
        app.trafficControlService.addModification(id, pattern, modification);
        res.json({ message: 'Modification rule added', id });
    });

    // Get all modification rules
    router.get('/traffic-control/modifications', (req, res) => {
        const modifications = app.trafficControlService.getModifications();
        res.json({ modifications, count: modifications.length });
    });

    // Remove modification rule
    router.delete('/traffic-control/modifications/:id', (req, res) => {
        const removed = app.trafficControlService.removeModification(req.params.id);
        res.json({ removed });
    });

    // ========================================
    // DIFF REPLAY ENDPOINTS
    // ========================================

    // Run diff replay
    router.post('/replay/:requestId/diff', async (req, res) => {
        try {
            const modifications = req.body.modifications || {};
            const result = await app.diffReplayService.replayWithDiff(
                req.params.requestId,
                modifications
            );
            res.json(result);
        } catch (error) {
            logger.error('Diff replay failed', { error: error.message });
            res.status(400).json({ error: error.message });
        }
    });

    // Get diff history
    router.get('/replay/diff/history', (req, res) => {
        const limit = parseInt(req.query.limit) || 20;
        const history = app.diffReplayService.getHistory(limit);
        res.json({ history, count: history.length });
    });

    // Get specific diff by ID
    router.get('/replay/diff/:diffId', (req, res) => {
        const diff = app.diffReplayService.getDiffById(req.params.diffId);
        if (!diff) {
            return res.status(404).json({ error: 'Diff not found' });
        }
        res.json(diff);
    });

    // Clear diff history
    router.delete('/replay/diff/history', (req, res) => {
        app.diffReplayService.clearHistory();
        res.json({ message: 'Diff history cleared' });
    });

    return router;
}

module.exports = createApiRouter;
