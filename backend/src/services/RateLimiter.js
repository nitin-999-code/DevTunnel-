/**
 * RateLimiter
 * 
 * Handles rate limiting for:
 * - API requests per client
 * - Tunnel requests per subdomain
 * - Global request limits
 * 
 * Uses sliding window algorithm for smooth limiting
 */

const { createLogger } = require('../../shared/src');

class RateLimiter {
    constructor(options = {}) {
        this.logger = createLogger({ name: 'RateLimiter' });

        // Default configuration
        this.config = {
            // Requests per window per client
            requestsPerMinute: options.requestsPerMinute || 100,

            // Requests per window per tunnel
            tunnelRequestsPerMinute: options.tunnelRequestsPerMinute || 200,

            // Global requests per minute
            globalRequestsPerMinute: options.globalRequestsPerMinute || 10000,

            // Window size in milliseconds
            windowMs: options.windowMs || 60000, // 1 minute

            // Cleanup interval
            cleanupIntervalMs: options.cleanupIntervalMs || 60000,
        };

        // Request counters
        // Format: { key: { count, windowStart } }
        this.counters = new Map();

        // Start cleanup timer
        this.cleanupTimer = setInterval(
            () => this.cleanup(),
            this.config.cleanupIntervalMs
        );
    }

    /**
     * Checks if a request is allowed
     * @param {string} key - Unique identifier (IP, API key, subdomain)
     * @param {number} limit - Max requests per window (optional)
     * @returns {object} { allowed, remaining, resetAt }
     */
    checkLimit(key, limit = this.config.requestsPerMinute) {
        const now = Date.now();
        const counter = this.counters.get(key);

        // No existing counter, create new one
        if (!counter) {
            this.counters.set(key, {
                count: 1,
                windowStart: now,
            });

            return {
                allowed: true,
                remaining: limit - 1,
                resetAt: now + this.config.windowMs,
            };
        }

        // Check if window has expired
        const windowAge = now - counter.windowStart;

        if (windowAge >= this.config.windowMs) {
            // Reset counter for new window
            counter.count = 1;
            counter.windowStart = now;

            return {
                allowed: true,
                remaining: limit - 1,
                resetAt: now + this.config.windowMs,
            };
        }

        // Check if limit exceeded
        if (counter.count >= limit) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: counter.windowStart + this.config.windowMs,
                retryAfter: Math.ceil((counter.windowStart + this.config.windowMs - now) / 1000),
            };
        }

        // Increment counter
        counter.count++;

        return {
            allowed: true,
            remaining: limit - counter.count,
            resetAt: counter.windowStart + this.config.windowMs,
        };
    }

    /**
     * Checks rate limit for an IP address
     */
    checkIpLimit(ip) {
        return this.checkLimit(`ip:${ip}`, this.config.requestsPerMinute);
    }

    /**
     * Checks rate limit for a tunnel
     */
    checkTunnelLimit(subdomain) {
        return this.checkLimit(`tunnel:${subdomain}`, this.config.tunnelRequestsPerMinute);
    }

    /**
     * Checks rate limit for an API key
     */
    checkApiKeyLimit(apiKey, customLimit) {
        const limit = customLimit || this.config.requestsPerMinute;
        return this.checkLimit(`apikey:${apiKey}`, limit);
    }

    /**
     * Checks global rate limit
     */
    checkGlobalLimit() {
        return this.checkLimit('global', this.config.globalRequestsPerMinute);
    }

    /**
     * Cleans up expired counters
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, counter] of this.counters) {
            if (now - counter.windowStart >= this.config.windowMs * 2) {
                this.counters.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.debug(`Cleaned up ${cleaned} expired rate limit counters`);
        }
    }

    /**
     * Gets current stats for a key
     */
    getStats(key) {
        const counter = this.counters.get(key);

        if (!counter) {
            return { count: 0, windowAge: 0 };
        }

        return {
            count: counter.count,
            windowAge: Date.now() - counter.windowStart,
        };
    }

    /**
     * Resets rate limit for a key
     */
    reset(key) {
        this.counters.delete(key);
    }

    /**
     * Stops the cleanup timer
     */
    stop() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
    }
}

module.exports = RateLimiter;
