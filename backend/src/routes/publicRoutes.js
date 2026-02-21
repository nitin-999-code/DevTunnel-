/**
 * Public Routes - Handles incoming tunnel traffic
 *
 * Non-tunnel traffic (no subdomain) is reverse-proxied to the
 * local Vite dev server so the frontend is accessible through
 * the public gateway URL.
 */

const express = require('express');
const { createLogger, ERROR_CODES } = require('../../shared/src');

const logger = createLogger({ name: 'PublicRoutes' });

function createPublicRouter(app, proxy) {
    const router = express.Router();

    router.all('*', async (req, res, next) => {
        // ── Tunnel subdomain traffic ────────────────────────────
        if (req.isTunnelRequest && req.subdomain) {
            try {
                await app.requestForwarder.forwardRequest({
                    subdomain: req.subdomain,
                    req,
                    res,
                });
            } catch (error) {
                logger.error('Request forwarding error', { error: error.message });
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Internal server error' });
                }
            }
            return;
        }

        // ── Non-tunnel traffic → Vite proxy ─────────────────────
        // Forward to the local Vite dev server (localhost:5173).
        if (proxy) {
            return proxy.web(req, res);
        }

        // Fallback if no proxy configured
        res.status(200).json({
            name: 'DevTunnel+',
            version: '1.0.0',
            description: 'Developer Tunneling Platform',
            documentation: '/api/docs',
            health: '/health',
        });
    });

    return router;
}

module.exports = createPublicRouter;
