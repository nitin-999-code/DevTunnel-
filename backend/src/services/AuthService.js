/**
 * AuthService
 * 
 * Handles authentication for tunnels:
 * - API key generation and validation
 * - Token-based authentication
 * - Permission management
 */

const crypto = require('crypto');
const { createLogger, generateAuthToken } = require('../../shared/src');

class AuthService {
    constructor() {
        this.logger = createLogger({ name: 'AuthService' });

        // Store API keys (in production, use database)
        // Format: { apiKey: { userId, permissions, createdAt, lastUsed } }
        this.apiKeys = new Map();

        // Store active sessions
        // Format: { sessionToken: { apiKey, tunnelId, createdAt } }
        this.sessions = new Map();

        // Create a default development API key
        this.createDefaultKey();
    }

    /**
     * Creates a default API key for development
     */
    createDefaultKey() {
        const devKey = 'dev_' + generateAuthToken();
        this.apiKeys.set(devKey, {
            userId: 'dev-user',
            name: 'Development Key',
            permissions: ['tunnel:create', 'tunnel:read', 'replay:*'],
            createdAt: new Date().toISOString(),
            lastUsed: null,
            rateLimit: 100, // requests per minute
        });

        this.logger.info('Development API key created', {
            key: devKey.substring(0, 12) + '...'
        });

        // Also store it for easy access
        this.devKey = devKey;
    }

    /**
     * Creates a new API key
     */
    createApiKey(options = {}) {
        const {
            userId = 'anonymous',
            name = 'API Key',
            permissions = ['tunnel:create', 'tunnel:read'],
            rateLimit = 60,
        } = options;

        const apiKey = 'dt_' + generateAuthToken();

        this.apiKeys.set(apiKey, {
            userId,
            name,
            permissions,
            createdAt: new Date().toISOString(),
            lastUsed: null,
            rateLimit,
        });

        this.logger.info('API key created', { userId, name });

        return apiKey;
    }

    /**
     * Validates an API key
     */
    validateApiKey(apiKey) {
        if (!apiKey) {
            return { valid: false, error: 'No API key provided' };
        }

        const keyData = this.apiKeys.get(apiKey);

        if (!keyData) {
            return { valid: false, error: 'Invalid API key' };
        }

        // Update last used
        keyData.lastUsed = new Date().toISOString();

        return {
            valid: true,
            userId: keyData.userId,
            permissions: keyData.permissions,
            rateLimit: keyData.rateLimit,
        };
    }

    /**
     * Checks if user has a specific permission
     */
    hasPermission(apiKey, permission) {
        const validation = this.validateApiKey(apiKey);

        if (!validation.valid) {
            return false;
        }

        const { permissions } = validation;

        // Check for exact match or wildcard
        return permissions.some(p => {
            if (p === '*') return true;
            if (p === permission) return true;

            // Check wildcard patterns like 'tunnel:*'
            const [pResource, pAction] = p.split(':');
            const [resource, action] = permission.split(':');

            if (pResource === resource && pAction === '*') return true;

            return false;
        });
    }

    /**
     * Creates a session token for an authenticated tunnel
     */
    createSession(apiKey, tunnelId) {
        const sessionToken = crypto.randomBytes(32).toString('hex');

        this.sessions.set(sessionToken, {
            apiKey,
            tunnelId,
            createdAt: new Date().toISOString(),
        });

        return sessionToken;
    }

    /**
     * Validates a session token
     */
    validateSession(sessionToken) {
        const session = this.sessions.get(sessionToken);

        if (!session) {
            return { valid: false, error: 'Invalid session' };
        }

        return { valid: true, ...session };
    }

    /**
     * Removes a session
     */
    removeSession(sessionToken) {
        this.sessions.delete(sessionToken);
    }

    /**
     * Revokes an API key
     */
    revokeApiKey(apiKey) {
        const deleted = this.apiKeys.delete(apiKey);

        if (deleted) {
            // Also remove all sessions using this key
            for (const [token, session] of this.sessions) {
                if (session.apiKey === apiKey) {
                    this.sessions.delete(token);
                }
            }
            this.logger.info('API key revoked');
        }

        return deleted;
    }

    /**
     * Gets all API keys (masked)
     */
    getAllKeys() {
        const keys = [];

        for (const [key, data] of this.apiKeys) {
            keys.push({
                keyPreview: key.substring(0, 8) + '...',
                userId: data.userId,
                name: data.name,
                createdAt: data.createdAt,
                lastUsed: data.lastUsed,
            });
        }

        return keys;
    }

    /**
     * Gets the development key (for testing)
     */
    getDevKey() {
        return this.devKey;
    }
}

module.exports = AuthService;
