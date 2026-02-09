/**
 * Request Forwarder Service - True HTTP over WebSocket Tunneling
 * 
 * Handles:
 * - Raw HTTP request acceptance
 * - Full request serialization over WebSocket
 * - Response streaming back to client
 * - Concurrent request tracking
 * - Binary data support
 */

const {
    createLogger,
    generateRequestId,
    createHttpRequestMessage,
    MessageType,
    serializeMessage,
    decodeBody,
    TUNNEL_CONFIG,
    ERROR_CODES,
    createDeferred,
} = require('../../shared/src');

class RequestForwarder {
    constructor(tunnelManager, inspectorService) {
        this.tunnelManager = tunnelManager;
        this.inspectorService = inspectorService;
        this.logger = createLogger({ name: 'RequestForwarder' });

        // Track active requests for streaming
        this.activeRequests = new Map();
    }

    /**
     * Forwards a raw HTTP request through the WebSocket tunnel
     * 
     * Flow:
     * 1. Accept raw HTTP request from public endpoint
     * 2. Serialize entire request (method, headers, body) to JSON
     * 3. Send over WebSocket to CLI client
     * 4. CLI client makes real HTTP request to local server
     * 5. CLI client sends response back over WebSocket
     * 6. Gateway streams response to original HTTP client
     */
    async forwardRequest({ subdomain, req, res }) {
        const requestId = generateRequestId();
        const startTime = Date.now();

        // Find tunnel by subdomain
        const tunnel = this.tunnelManager.getTunnelBySubdomain(subdomain);

        if (!tunnel) {
            this.logger.debug(`Tunnel not found: ${subdomain}`);
            return res.status(404).json({
                error: 'Tunnel not found',
                code: ERROR_CODES.TUNNEL_NOT_FOUND,
                subdomain,
            });
        }

        // Verify WebSocket is connected
        if (tunnel.ws.readyState !== 1) {
            this.logger.warn(`Tunnel WebSocket not ready: ${subdomain}`);
            return res.status(502).json({
                error: 'Tunnel connection unavailable',
                code: ERROR_CODES.CONNECTION_CLOSED,
            });
        }

        try {
            // Collect raw body (already parsed as Buffer by Express)
            const rawBody = req.body && req.body.length > 0 ? req.body : null;

            // Build complete HTTP request message
            const requestMessage = createHttpRequestMessage({
                requestId,
                method: req.method,
                path: req.originalUrl,
                headers: this.sanitizeRequestHeaders(req.headers),
                body: rawBody,
                query: req.query,
            });

            // Record for inspection/debugging
            const inspectData = {
                requestId,
                tunnelId: tunnel.tunnelId,
                subdomain,
                method: req.method,
                path: req.originalUrl,
                headers: { ...req.headers },
                body: rawBody ? rawBody.toString('utf8') : null,
                query: req.query,
                timestamp: Date.now(),
                clientIp: req.ip || req.connection?.remoteAddress,
            };
            this.inspectorService.recordRequest(inspectData);

            // Create deferred promise for response
            const { promise, resolve, reject } = createDeferred();

            // Set request timeout
            const timeout = setTimeout(() => {
                this.cleanupRequest(tunnel, requestId);
                reject(new Error('Request timeout'));
            }, TUNNEL_CONFIG.REQUEST_TIMEOUT);

            // Store pending request with streaming state
            tunnel.addPendingRequest(requestId, {
                resolve: (response) => {
                    clearTimeout(timeout);
                    resolve(response);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
                req,
                res,
                inspectData,
                startTime,
                // Streaming state for chunked responses
                streaming: false,
                chunks: [],
            });

            // Track active request
            this.activeRequests.set(requestId, {
                tunnel,
                startTime,
                subdomain,
            });

            // Send request through WebSocket to CLI client
            tunnel.ws.send(serializeMessage(requestMessage));

            this.logger.debug(`Request tunneled: ${requestId}`, {
                method: req.method,
                path: req.originalUrl,
                subdomain,
                bodySize: rawBody ? rawBody.length : 0,
            });

            // Wait for complete response from CLI client
            const response = await promise;
            const responseTime = Date.now() - startTime;

            // Record response for inspection
            this.inspectorService.recordResponse({
                requestId,
                tunnelId: tunnel.tunnelId,
                statusCode: response.statusCode,
                headers: response.headers,
                body: response.body,
                responseTime,
                timestamp: Date.now(),
            });

            // Update tunnel statistics
            const requestSize = rawBody ? rawBody.length : 0;
            const responseSize = response.body ? decodeBody(response.body).length : 0;
            tunnel.recordRequest(requestSize, responseSize);

            // Send HTTP response to original client
            this.sendResponse(res, response);

            // Cleanup
            this.activeRequests.delete(requestId);

        } catch (error) {
            const responseTime = Date.now() - startTime;

            this.logger.error(`Request tunnel failed: ${requestId}`, {
                error: error.message,
                subdomain,
            });

            // Record error
            this.inspectorService.recordResponse({
                requestId,
                tunnelId: tunnel?.tunnelId,
                statusCode: error.statusCode || 502,
                error: error.message,
                responseTime,
                timestamp: Date.now(),
            });

            // Cleanup
            this.cleanupRequest(tunnel, requestId);
            this.activeRequests.delete(requestId);

            // Send error response
            if (!res.headersSent) {
                if (error.message === 'Request timeout') {
                    res.status(504).json({
                        error: 'Gateway timeout',
                        code: ERROR_CODES.REQUEST_TIMEOUT,
                    });
                } else {
                    res.status(error.statusCode || 502).json({
                        error: 'Bad gateway',
                        code: ERROR_CODES.REQUEST_FAILED,
                        message: error.message,
                    });
                }
            }
        }
    }

    /**
     * Sends HTTP response to the original client
     */
    sendResponse(res, response) {
        res.status(response.statusCode);

        // Filter hop-by-hop headers
        const hopByHop = ['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection'];

        for (const [key, value] of Object.entries(response.headers || {})) {
            if (!hopByHop.includes(key.toLowerCase())) {
                res.set(key, value);
            }
        }

        // Decode and send body
        if (response.body) {
            const bodyBuffer = decodeBody(response.body, response.bodyEncoding || 'base64');
            res.send(bodyBuffer);
        } else {
            res.end();
        }
    }

    /**
     * Handles complete response from CLI client
     */
    handleResponse(tunnel, payload) {
        const { requestId, statusCode, headers, body, bodyEncoding, streaming } = payload;

        const pending = tunnel.getPendingRequest(requestId);
        if (!pending) {
            this.logger.warn(`No pending request: ${requestId}`);
            return;
        }

        if (streaming) {
            // Start streaming mode - headers only, body comes in chunks
            pending.streaming = true;
            pending.statusCode = statusCode;
            pending.responseHeaders = headers;
            this.logger.debug(`Streaming response started: ${requestId}`);
        } else {
            // Complete response in single message
            tunnel.removePendingRequest(requestId);
            pending.resolve({
                statusCode,
                headers,
                body,
                bodyEncoding,
            });
            this.logger.debug(`Complete response: ${requestId}`, { statusCode });
        }
    }

    /**
     * Handles streaming response chunk
     */
    handleResponseChunk(tunnel, payload) {
        const { requestId, chunk, index } = payload;

        const pending = tunnel.getPendingRequest(requestId);
        if (!pending || !pending.streaming) {
            this.logger.warn(`No streaming request for chunk: ${requestId}`);
            return;
        }

        // Store chunk in order
        pending.chunks[index] = chunk;
        this.logger.debug(`Chunk received: ${requestId} index ${index}`);
    }

    /**
     * Handles streaming response end
     */
    handleResponseEnd(tunnel, payload) {
        const { requestId } = payload;

        const pending = tunnel.getPendingRequest(requestId);
        if (!pending) {
            this.logger.warn(`No pending request for end: ${requestId}`);
            return;
        }

        tunnel.removePendingRequest(requestId);

        // Combine all chunks
        const combinedBody = pending.chunks
            .filter(c => c !== undefined)
            .map(c => Buffer.from(c, 'base64'))
            .reduce((acc, buf) => Buffer.concat([acc, buf]), Buffer.alloc(0));

        pending.resolve({
            statusCode: pending.statusCode,
            headers: pending.responseHeaders,
            body: combinedBody.toString('base64'),
            bodyEncoding: 'base64',
        });

        this.logger.debug(`Streaming response complete: ${requestId}`, {
            chunks: pending.chunks.length,
            totalSize: combinedBody.length,
        });
    }

    /**
     * Handles error response from CLI client
     */
    handleError(tunnel, payload) {
        const { requestId, error, code, statusCode } = payload;

        const pending = tunnel.getPendingRequest(requestId);
        if (!pending) {
            this.logger.warn(`No pending request for error: ${requestId}`);
            return;
        }

        tunnel.removePendingRequest(requestId);

        const err = new Error(error);
        err.code = code;
        err.statusCode = statusCode || 502;
        pending.reject(err);

        this.logger.debug(`Error response: ${requestId}`, { error, code });
    }

    /**
     * Sanitizes request headers before forwarding
     */
    sanitizeRequestHeaders(headers) {
        const sanitized = { ...headers };

        // Remove headers that shouldn't be forwarded
        delete sanitized['host'];
        delete sanitized['connection'];
        delete sanitized['upgrade'];

        return sanitized;
    }

    /**
     * Cleans up a pending request
     */
    cleanupRequest(tunnel, requestId) {
        if (tunnel) {
            tunnel.removePendingRequest(requestId);
        }
    }

    /**
     * Gets active request count
     */
    getActiveRequestCount() {
        return this.activeRequests.size;
    }

    /**
     * Gets active request info for monitoring
     */
    getActiveRequests() {
        const now = Date.now();
        return Array.from(this.activeRequests.entries()).map(([requestId, info]) => ({
            requestId,
            subdomain: info.subdomain,
            duration: now - info.startTime,
        }));
    }
}

module.exports = RequestForwarder;
