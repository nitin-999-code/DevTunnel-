/**
 * Security Middleware
 * 
 * Express middleware functions for:
 * - API key authentication
 * - Rate limiting
 * - IP blocking
 * - Security headers
 */

const { createLogger } = require('../../shared/src');

const logger = createLogger({ name: 'SecurityMiddleware' });

/**
 * Creates authentication middleware
 */
function createAuthMiddleware(authService) {
    return (req, res, next) => {
        // Skip auth for health check
        if (req.path === '/health') {
            return next();
        }

        // Get API key from header or query
        const apiKey = req.headers['x-api-key'] ||
            req.headers['authorization']?.replace('Bearer ', '') ||
            req.query.apiKey;

        // Validate API key
        const validation = authService.validateApiKey(apiKey);

        if (!validation.valid) {
            // Allow unauthenticated access in dev mode
            if (process.env.NODE_ENV !== 'production') {
                req.auth = { userId: 'anonymous', permissions: ['*'], rateLimit: 100 };
                return next();
            }

            return res.status(401).json({
                error: 'Unauthorized',
                message: validation.error,
            });
        }

        // Attach auth info to request
        req.auth = {
            apiKey,
            userId: validation.userId,
            permissions: validation.permissions,
            rateLimit: validation.rateLimit,
        };

        next();
    };
}

/**
 * Creates rate limiting middleware
 */
function createRateLimitMiddleware(rateLimiter) {
    return (req, res, next) => {
        // Get client identifier (prefer API key, fallback to IP)
        const clientId = req.auth?.apiKey || getClientIp(req);
        const limit = req.auth?.rateLimit || 60;

        // Check rate limit
        const result = rateLimiter.checkLimit(`client:${clientId}`, limit);

        // Add rate limit headers
        res.set({
            'X-RateLimit-Limit': limit,
            'X-RateLimit-Remaining': result.remaining,
            'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000),
        });

        if (!result.allowed) {
            res.set('Retry-After', result.retryAfter);

            return res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please slow down.',
                retryAfter: result.retryAfter,
            });
        }

        next();
    };
}

/**
 * Creates IP security middleware
 */
function createSecurityMiddleware(securityService) {
    return (req, res, next) => {
        const ip = getClientIp(req);

        // Check if IP is allowed
        const ipCheck = securityService.isIpAllowed(ip);

        if (!ipCheck.allowed) {
            logger.warn('Blocked request from IP', { ip: securityService.maskIp(ip) });

            return res.status(403).json({
                error: 'Forbidden',
                message: ipCheck.reason,
            });
        }

        // Validate request for security issues
        const validation = securityService.validateRequest(req);

        if (!validation.valid) {
            logger.warn('Suspicious request blocked', {
                ip: securityService.maskIp(ip),
                issues: validation.issues,
            });

            return res.status(400).json({
                error: 'Bad Request',
                message: 'Request blocked due to security concerns',
            });
        }

        // Add security headers
        const securityHeaders = securityService.getSecurityHeaders();
        res.set(securityHeaders);

        next();
    };
}

/**
 * Creates tunnel rate limiting middleware
 */
function createTunnelRateLimitMiddleware(rateLimiter) {
    return (req, res, next) => {
        // Only apply to tunnel requests
        if (!req.subdomain) {
            return next();
        }

        // Check tunnel-specific rate limit
        const result = rateLimiter.checkTunnelLimit(req.subdomain);

        // Add rate limit headers
        res.set({
            'X-Tunnel-RateLimit-Remaining': result.remaining,
        });

        if (!result.allowed) {
            return res.status(429).json({
                error: 'Tunnel Rate Limit Exceeded',
                message: 'This tunnel has received too many requests. Please wait.',
                retryAfter: result.retryAfter,
            });
        }

        next();
    };
}

/**
 * Permission check middleware factory
 */
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.auth) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const hasPermission = req.auth.permissions.includes('*') ||
            req.auth.permissions.includes(permission);

        if (!hasPermission) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Permission required: ${permission}`,
            });
        }

        next();
    };
}

/**
 * Gets client IP from request
 */
function getClientIp(req) {
    // Check for proxy headers
    const forwarded = req.headers['x-forwarded-for'];

    if (forwarded) {
        // Get first IP in the list (original client)
        return forwarded.split(',')[0].trim();
    }

    // Check for real IP header (nginx)
    const realIp = req.headers['x-real-ip'];

    if (realIp) {
        return realIp;
    }

    // Fallback to socket address
    return req.socket?.remoteAddress || req.ip || 'unknown';
}

module.exports = {
    createAuthMiddleware,
    createRateLimitMiddleware,
    createSecurityMiddleware,
    createTunnelRateLimitMiddleware,
    requirePermission,
    getClientIp,
};
