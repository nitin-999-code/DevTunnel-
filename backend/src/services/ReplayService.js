/**
 * ReplayService - Real Request Replay Through Tunnel Pipeline
 * 
 * Handles:
 * - Store complete real request objects from inspector
 * - Replay through actual WebSocket tunnel to CLI client
 * - Real HTTP forwarding to local server
 * - Track replay history with full request/response data
 * - Export as curl commands
 */

const {
    createLogger,
    generateRequestId,
    createHttpRequestMessage,
    serializeMessage,
    decodeBody,
    createDeferred,
    TUNNEL_CONFIG,
} = require('../../shared/src');

class ReplayService {
    constructor(inspectorService, tunnelManager, requestForwarder) {
        this.logger = createLogger({ name: 'ReplayService' });
        this.inspectorService = inspectorService;
        this.tunnelManager = tunnelManager;
        this.requestForwarder = requestForwarder;

        // Store replay history with complete request/response
        this.replayHistory = [];
        this.maxHistory = 100;
    }

    /**
     * Replays a captured request through the actual tunnel pipeline
     * 
     * Flow:
     * 1. Get original request from inspector (real stored data)
     * 2. Apply any modifications
     * 3. Find active tunnel for the subdomain
     * 4. Send request over WebSocket to CLI client
     * 5. CLI client makes real HTTP request to local server
     * 6. Return complete response
     * 
     * @param {string} requestId - Original request ID to replay
     * @param {object} modifications - Optional modifications to the request
     * @returns {Promise<object>} Replay result with real response
     */
    async replayRequest(requestId, modifications = {}) {
        // Get original request from inspector (real stored data)
        const original = this.inspectorService.getTrafficById(requestId);

        if (!original) {
            throw new Error(`Request ${requestId} not found in traffic history`);
        }

        const originalRequest = original.request || {};
        const subdomain = original.subdomain;

        // Find active tunnel for this subdomain
        const tunnel = this.tunnelManager.getTunnelBySubdomain(subdomain);

        if (!tunnel) {
            // Tunnel not found - try direct HTTP if available
            this.logger.warn(`Tunnel ${subdomain} not found, attempting direct replay`);
            return this.replayDirect(original, modifications);
        }

        // Verify WebSocket is connected
        if (tunnel.ws.readyState !== 1) {
            throw new Error(`Tunnel ${subdomain} is not connected`);
        }

        // Build replay request with modifications
        const replayConfig = this.buildReplayRequest(original, modifications);
        const replayRequestId = generateRequestId();
        const startTime = Date.now();

        this.logger.info('Replaying through tunnel', {
            originalId: requestId,
            replayId: replayRequestId,
            method: replayConfig.method,
            path: replayConfig.path,
            subdomain,
        });

        try {
            // Create HTTP request message for WebSocket
            const requestMessage = createHttpRequestMessage({
                requestId: replayRequestId,
                method: replayConfig.method,
                path: replayConfig.path,
                headers: replayConfig.headers,
                body: replayConfig.body,
                query: replayConfig.query,
            });

            // Create deferred promise for response
            const { promise, resolve, reject } = createDeferred();

            // Set timeout
            const timeout = setTimeout(() => {
                tunnel.removePendingRequest(replayRequestId);
                reject(new Error('Replay request timeout'));
            }, TUNNEL_CONFIG.REQUEST_TIMEOUT);

            // Register pending request with tunnel
            tunnel.addPendingRequest(replayRequestId, {
                resolve: (response) => {
                    clearTimeout(timeout);
                    resolve(response);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
                startTime,
                isReplay: true,
            });

            // Send through WebSocket to CLI client
            tunnel.ws.send(serializeMessage(requestMessage));

            // Wait for response from CLI client
            const response = await promise;
            const duration = Date.now() - startTime;

            // Decode response body for display
            let decodedBody = null;
            if (response.body) {
                try {
                    const buffer = decodeBody(response.body, response.bodyEncoding || 'base64');
                    const bodyStr = buffer.toString('utf8');
                    try {
                        decodedBody = JSON.parse(bodyStr);
                    } catch {
                        decodedBody = bodyStr;
                    }
                } catch {
                    decodedBody = response.body;
                }
            }

            // Create complete replay record
            const replayRecord = {
                replayId: replayRequestId,
                originalRequestId: requestId,
                replayedAt: new Date().toISOString(),
                subdomain,
                tunnelId: tunnel.tunnelId,
                replayedVia: 'tunnel',

                // Complete request data
                request: {
                    method: replayConfig.method,
                    path: replayConfig.path,
                    headers: replayConfig.headers,
                    body: replayConfig.decodedBody,
                    query: replayConfig.query,
                },

                // Modifications applied
                modifications: Object.keys(modifications).length > 0 ? modifications : null,

                // Complete response data
                response: {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: decodedBody,
                    rawBody: response.body,
                },

                duration,
                success: response.statusCode >= 200 && response.statusCode < 400,
            };

            // Store in history
            this.addToHistory(replayRecord);

            this.logger.info('Replay completed', {
                replayId: replayRequestId,
                statusCode: response.statusCode,
                duration,
            });

            return replayRecord;

        } catch (error) {
            const duration = Date.now() - startTime;

            const errorRecord = {
                replayId: replayRequestId,
                originalRequestId: requestId,
                replayedAt: new Date().toISOString(),
                subdomain,
                replayedVia: 'tunnel',
                request: {
                    method: replayConfig.method,
                    path: replayConfig.path,
                    headers: replayConfig.headers,
                    body: replayConfig.decodedBody,
                },
                response: null,
                error: error.message,
                duration,
                success: false,
            };

            this.addToHistory(errorRecord);

            throw error;
        }
    }

    /**
     * Direct replay when tunnel is not available (fallback)
     */
    async replayDirect(original, modifications) {
        const http = require('http');
        const { URL } = require('url');

        const replayConfig = this.buildReplayRequest(original, modifications);
        const replayRequestId = generateRequestId();
        const startTime = Date.now();

        this.logger.info('Replaying directly (no tunnel)', {
            originalId: original.requestId,
            method: replayConfig.method,
            path: replayConfig.path,
        });

        return new Promise((resolve, reject) => {
            const url = new URL(replayConfig.path, `http://${original.subdomain}.localhost:3000`);

            const options = {
                hostname: 'localhost',
                port: 3000,
                path: url.pathname + url.search,
                method: replayConfig.method,
                headers: {
                    ...replayConfig.headers,
                    'host': `${original.subdomain}.localhost:3000`,
                },
            };

            const req = http.request(options, (res) => {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    const duration = Date.now() - startTime;
                    const body = Buffer.concat(chunks);

                    let decodedBody;
                    try {
                        decodedBody = JSON.parse(body.toString('utf8'));
                    } catch {
                        decodedBody = body.toString('utf8');
                    }

                    const record = {
                        replayId: replayRequestId,
                        originalRequestId: original.requestId,
                        replayedAt: new Date().toISOString(),
                        subdomain: original.subdomain,
                        replayedVia: 'direct',
                        request: {
                            method: replayConfig.method,
                            path: replayConfig.path,
                            headers: replayConfig.headers,
                            body: replayConfig.decodedBody,
                        },
                        response: {
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: decodedBody,
                        },
                        duration,
                        success: res.statusCode >= 200 && res.statusCode < 400,
                    };

                    this.addToHistory(record);
                    resolve(record);
                });
            });

            req.on('error', (error) => {
                const duration = Date.now() - startTime;
                const record = {
                    replayId: replayRequestId,
                    originalRequestId: original.requestId,
                    replayedAt: new Date().toISOString(),
                    subdomain: original.subdomain,
                    replayedVia: 'direct',
                    request: replayConfig,
                    response: null,
                    error: error.message,
                    duration,
                    success: false,
                };
                this.addToHistory(record);
                reject(error);
            });

            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Direct replay timeout'));
            });

            if (replayConfig.body) {
                const bodyStr = typeof replayConfig.body === 'string'
                    ? replayConfig.body
                    : JSON.stringify(replayConfig.body);
                req.write(bodyStr);
            }

            req.end();
        });
    }

    /**
     * Builds replay request from original with modifications
     */
    buildReplayRequest(original, modifications) {
        const req = original.request || {};

        // Decode original body if needed
        let decodedBody = null;
        if (req.parsedBody) {
            decodedBody = req.parsedBody;
        } else if (req.body) {
            try {
                if (typeof req.body === 'string') {
                    try {
                        const decoded = Buffer.from(req.body, 'base64').toString('utf8');
                        decodedBody = JSON.parse(decoded);
                    } catch {
                        try {
                            decodedBody = JSON.parse(req.body);
                        } catch {
                            decodedBody = req.body;
                        }
                    }
                } else {
                    decodedBody = req.body;
                }
            } catch {
                decodedBody = req.body;
            }
        }

        // Build base config from real stored request
        let config = {
            method: req.method || 'GET',
            path: req.path || '/',
            headers: { ...req.headers },
            body: decodedBody ? Buffer.from(JSON.stringify(decodedBody)) : null,
            decodedBody,
            query: req.query || {},
        };

        // Apply modifications
        if (modifications.method) {
            config.method = modifications.method.toUpperCase();
        }

        if (modifications.path) {
            config.path = modifications.path;
        }

        if (modifications.headers) {
            config.headers = { ...config.headers, ...modifications.headers };
        }

        if (modifications.body !== undefined) {
            config.decodedBody = modifications.body;
            config.body = modifications.body ? Buffer.from(
                typeof modifications.body === 'string'
                    ? modifications.body
                    : JSON.stringify(modifications.body)
            ) : null;
        }

        if (modifications.query) {
            config.query = { ...config.query, ...modifications.query };
        }

        // Clean headers for replay
        const cleanHeaders = { ...config.headers };
        delete cleanHeaders['content-length'];
        delete cleanHeaders['host'];
        delete cleanHeaders['connection'];
        config.headers = cleanHeaders;

        return config;
    }

    /**
     * Generates a curl command for a request
     */
    generateCurl(requestId) {
        const traffic = this.inspectorService.getTrafficById(requestId);

        if (!traffic) {
            throw new Error(`Request ${requestId} not found`);
        }

        const req = traffic.request || {};
        const subdomain = traffic.subdomain;

        let curl = `curl -X ${req.method || 'GET'}`;

        // Add headers
        if (req.headers) {
            Object.entries(req.headers).forEach(([key, value]) => {
                if (!['host', 'content-length', 'connection'].includes(key.toLowerCase())) {
                    curl += ` \\\n  -H '${key}: ${value}'`;
                }
            });
        }

        // Add host header for subdomain
        if (subdomain) {
            curl += ` \\\n  -H 'Host: ${subdomain}.localhost:3000'`;
        }

        // Add body (decode if needed)
        let body = req.parsedBody || req.body;
        if (body) {
            if (typeof body !== 'string') {
                body = JSON.stringify(body);
            }
            curl += ` \\\n  -d '${body.replace(/'/g, "\\'")}'`;
        }

        // Add URL
        const url = `http://localhost:3000${req.path || '/'}`;
        curl += ` \\\n  '${url}'`;

        return curl;
    }

    /**
     * Adds replay to history
     */
    addToHistory(record) {
        this.replayHistory.unshift(record);

        // Trim history
        if (this.replayHistory.length > this.maxHistory) {
            this.replayHistory = this.replayHistory.slice(0, this.maxHistory);
        }
    }

    /**
     * Gets replay history
     */
    getHistory(limit = 50) {
        return this.replayHistory.slice(0, limit);
    }

    /**
     * Gets a specific replay by ID
     */
    getReplayById(replayId) {
        return this.replayHistory.find(r => r.replayId === replayId);
    }

    /**
     * Clears replay history
     */
    clearHistory() {
        this.replayHistory = [];
        this.logger.info('Replay history cleared');
    }

    /**
     * Gets replay statistics
     */
    getStats() {
        const total = this.replayHistory.length;
        const successful = this.replayHistory.filter(r => r.success).length;
        const failed = total - successful;
        const avgDuration = total > 0
            ? Math.round(this.replayHistory.reduce((sum, r) => sum + r.duration, 0) / total)
            : 0;

        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
            avgDuration,
        };
    }
}

module.exports = ReplayService;
