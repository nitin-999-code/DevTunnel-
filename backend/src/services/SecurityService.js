/**
 * SecurityService
 * 
 * Handles security features:
 * - IP whitelisting/blacklisting
 * - Request validation
 * - Security headers
 * - Suspicious activity detection
 */

const { createLogger } = require('../../shared/src');

class SecurityService {
    constructor() {
        this.logger = createLogger({ name: 'SecurityService' });

        // IP lists
        this.whitelist = new Set();
        this.blacklist = new Set();

        // Suspicious IP tracking
        // Format: { ip: { failedAttempts, lastAttempt, blocked } }
        this.suspiciousIps = new Map();

        // Configuration
        this.config = {
            maxFailedAttempts: 5,
            blockDurationMs: 15 * 60 * 1000, // 15 minutes
            enableWhitelist: false, // When true, only whitelisted IPs allowed
        };
    }

    /**
     * Checks if an IP is allowed
     */
    isIpAllowed(ip) {
        // Check if blocked
        if (this.isBlocked(ip)) {
            return { allowed: false, reason: 'IP temporarily blocked' };
        }

        // Check blacklist
        if (this.blacklist.has(ip)) {
            return { allowed: false, reason: 'IP blacklisted' };
        }

        // Check whitelist (if enabled)
        if (this.config.enableWhitelist && !this.whitelist.has(ip)) {
            return { allowed: false, reason: 'IP not whitelisted' };
        }

        return { allowed: true };
    }

    /**
     * Checks if an IP is temporarily blocked
     */
    isBlocked(ip) {
        const record = this.suspiciousIps.get(ip);

        if (!record || !record.blocked) {
            return false;
        }

        // Check if block has expired
        const blockAge = Date.now() - record.blockedAt;

        if (blockAge >= this.config.blockDurationMs) {
            record.blocked = false;
            record.failedAttempts = 0;
            return false;
        }

        return true;
    }

    /**
     * Records a failed authentication attempt
     */
    recordFailedAttempt(ip) {
        let record = this.suspiciousIps.get(ip);

        if (!record) {
            record = { failedAttempts: 0, lastAttempt: null, blocked: false };
            this.suspiciousIps.set(ip, record);
        }

        record.failedAttempts++;
        record.lastAttempt = Date.now();

        // Block if too many failures
        if (record.failedAttempts >= this.config.maxFailedAttempts) {
            record.blocked = true;
            record.blockedAt = Date.now();

            this.logger.warn('IP blocked due to failed attempts', {
                ip: this.maskIp(ip),
                attempts: record.failedAttempts,
            });
        }

        return record;
    }

    /**
     * Records a successful authentication (resets failure count)
     */
    recordSuccess(ip) {
        const record = this.suspiciousIps.get(ip);

        if (record) {
            record.failedAttempts = 0;
        }
    }

    /**
     * Adds IP to whitelist
     */
    addToWhitelist(ip) {
        this.whitelist.add(ip);
        this.logger.info('IP added to whitelist', { ip: this.maskIp(ip) });
    }

    /**
     * Removes IP from whitelist
     */
    removeFromWhitelist(ip) {
        this.whitelist.delete(ip);
    }

    /**
     * Adds IP to blacklist
     */
    addToBlacklist(ip) {
        this.blacklist.add(ip);
        this.logger.info('IP added to blacklist', { ip: this.maskIp(ip) });
    }

    /**
     * Removes IP from blacklist
     */
    removeFromBlacklist(ip) {
        this.blacklist.delete(ip);
    }

    /**
     * Validates request headers for security
     */
    validateRequest(req) {
        const issues = [];

        // Check for common attack patterns
        const path = req.path || '';
        const query = req.query || {};

        // Path traversal check
        if (path.includes('..') || path.includes('%2e%2e')) {
            issues.push('Path traversal attempt detected');
        }

        // SQL injection patterns (basic)
        const suspiciousPatterns = [
            /(\%27)|(\')|(\-\-)/i,
            /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i,
            /(\%3C)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))/i,
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(path) || pattern.test(JSON.stringify(query))) {
                issues.push('Suspicious pattern detected in request');
                break;
            }
        }

        return {
            valid: issues.length === 0,
            issues,
        };
    }

    /**
     * Generates security headers for responses
     */
    getSecurityHeaders() {
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        };
    }

    /**
     * Masks IP for logging (privacy)
     */
    maskIp(ip) {
        if (!ip) return 'unknown';

        // IPv4
        if (ip.includes('.')) {
            const parts = ip.split('.');
            return `${parts[0]}.${parts[1]}.xxx.xxx`;
        }

        // IPv6
        if (ip.includes(':')) {
            const parts = ip.split(':');
            return `${parts.slice(0, 4).join(':')}:xxxx:xxxx:xxxx:xxxx`;
        }

        return ip.substring(0, 8) + '...';
    }

    /**
     * Gets security status summary
     */
    getStatus() {
        return {
            whitelistCount: this.whitelist.size,
            blacklistCount: this.blacklist.size,
            blockedIpCount: Array.from(this.suspiciousIps.values())
                .filter(r => r.blocked).length,
            whitelistEnabled: this.config.enableWhitelist,
        };
    }

    /**
     * Clears temporary blocks
     */
    clearBlocks() {
        for (const [ip, record] of this.suspiciousIps) {
            record.blocked = false;
            record.failedAttempts = 0;
        }
        this.logger.info('All temporary blocks cleared');
    }
}

module.exports = SecurityService;
