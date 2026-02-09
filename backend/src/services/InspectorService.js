/**
 * Inspector Service - Real-Time Traffic Metrics
 * 
 * Captures and stores request/response data with:
 * - Real latency computation (p50, p95, p99, min, max, avg)
 * - Throughput calculation (requests/sec, bytes/sec)
 * - Error rate tracking by status code
 * - Real-time event emission for WebSocket updates
 */

const { EventEmitter } = require('events');
const {
    createLogger,
    TUNNEL_CONFIG,
    sanitizeHeaders,
    getContentType,
    isJsonContentType,
} = require('../../shared/src');

/**
 * Represents a captured request/response pair
 */
class InspectedTraffic {
    constructor(request) {
        this.requestId = request.requestId;
        this.tunnelId = request.tunnelId;
        this.subdomain = request.subdomain;

        // Request data
        this.request = {
            method: request.method,
            path: request.path,
            headers: request.headers,
            body: request.body,
            query: request.query,
            timestamp: request.timestamp,
            clientIp: request.clientIp,
        };

        // Response data (filled in later)
        this.response = null;

        // Timing and sizes
        this.responseTime = null;
        this.requestSize = this.calculateSize(request.body, request.headers);
        this.responseSize = 0;
        this.createdAt = Date.now();
    }

    /**
     * Calculates the size of a request or response
     */
    calculateSize(body, headers) {
        let size = 0;
        if (body) {
            size += typeof body === 'string' ? body.length : JSON.stringify(body).length;
        }
        if (headers) {
            size += JSON.stringify(headers).length;
        }
        return size;
    }

    /**
     * Attaches response data
     */
    setResponse(response) {
        this.response = {
            statusCode: response.statusCode,
            headers: response.headers,
            body: response.body,
            error: response.error,
            timestamp: response.timestamp,
        };
        this.responseTime = response.responseTime;
        this.responseSize = this.calculateSize(response.body, response.headers);
    }

    /**
     * Formats the traffic for JSON output
     */
    toJSON(sanitize = false) {
        const result = {
            requestId: this.requestId,
            tunnelId: this.tunnelId,
            subdomain: this.subdomain,
            request: {
                ...this.request,
                headers: sanitize ? sanitizeHeaders(this.request.headers) : this.request.headers,
            },
            response: this.response ? {
                ...this.response,
                headers: sanitize ? sanitizeHeaders(this.response.headers || {}) : this.response.headers,
            } : null,
            responseTime: this.responseTime,
            requestSize: this.requestSize,
            responseSize: this.responseSize,
            createdAt: this.createdAt,
        };

        // Try to parse JSON bodies for better display
        if (result.request.body && isJsonContentType(getContentType(result.request.headers))) {
            try {
                result.request.parsedBody = JSON.parse(result.request.body);
            } catch { }
        }

        if (result.response?.body && isJsonContentType(getContentType(result.response.headers || {}))) {
            try {
                const decoded = Buffer.from(result.response.body, 'base64').toString('utf8');
                result.response.parsedBody = JSON.parse(decoded);
            } catch { }
        }

        return result;
    }

    /**
     * Generates a curl command for this request
     */
    toCurl() {
        const parts = ['curl'];

        if (this.request.method !== 'GET') {
            parts.push(`-X ${this.request.method}`);
        }

        for (const [key, value] of Object.entries(this.request.headers)) {
            if (!['host', 'content-length'].includes(key.toLowerCase())) {
                parts.push(`-H '${key}: ${value}'`);
            }
        }

        if (this.request.body) {
            parts.push(`-d '${this.request.body.replace(/'/g, "'\\''")}'`);
        }

        const url = `https://${this.subdomain}.example.com${this.request.path}`;
        parts.push(`'${url}'`);

        return parts.join(' \\\n  ');
    }
}

/**
 * Rolling window for time-series metrics
 */
class RollingWindow {
    constructor(windowMs = 60000) {
        this.windowMs = windowMs;
        this.entries = [];
    }

    add(value, timestamp = Date.now()) {
        this.entries.push({ value, timestamp });
        this.prune();
    }

    prune() {
        const cutoff = Date.now() - this.windowMs;
        this.entries = this.entries.filter(e => e.timestamp >= cutoff);
    }

    getValues() {
        this.prune();
        return this.entries.map(e => e.value);
    }

    count() {
        this.prune();
        return this.entries.length;
    }

    sum() {
        this.prune();
        return this.entries.reduce((sum, e) => sum + e.value, 0);
    }
}

/**
 * Service for capturing and storing traffic data with real-time metrics
 */
class InspectorService extends EventEmitter {
    constructor(options = {}) {
        super();
        this.logger = createLogger({ name: 'InspectorService' });

        // Configuration
        this.maxStoredRequests = options.maxStoredRequests || TUNNEL_CONFIG.MAX_STORED_REQUESTS;
        this.retentionMinutes = options.retentionMinutes || TUNNEL_CONFIG.TRAFFIC_HISTORY_MINUTES;

        // Storage by tunnel ID
        this.trafficByTunnel = new Map();

        // All traffic (limited circular buffer)
        this.allTraffic = [];

        // Map of requestId -> InspectedTraffic for fast lookup
        this.trafficByRequestId = new Map();

        // ===== REAL-TIME METRICS =====

        // Rolling windows for throughput (1 minute window)
        this.requestsWindow = new RollingWindow(60000);
        this.bytesInWindow = new RollingWindow(60000);
        this.bytesOutWindow = new RollingWindow(60000);

        // Latency tracking (all response times for percentile calculation)
        this.latencyWindow = new RollingWindow(300000); // 5 minute window for latency

        // Error tracking by status code
        this.statusCodeCounts = new Map();

        // Method tracking
        this.methodCounts = new Map();

        // Top paths tracking
        this.pathCounts = new Map();

        // Time-series data (for charts)
        this.timeSeriesData = [];
        this.lastTimeSeriesUpdate = 0;

        // Start cleanup timer
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);

        // Emit metrics periodically
        this.metricsInterval = setInterval(() => this.emitMetrics(), 5000);
    }

    /**
     * Records an incoming request
     */
    recordRequest(request) {
        const traffic = new InspectedTraffic(request);

        // Store in maps
        this.trafficByRequestId.set(request.requestId, traffic);

        // Store by tunnel
        if (!this.trafficByTunnel.has(request.tunnelId)) {
            this.trafficByTunnel.set(request.tunnelId, []);
        }
        this.trafficByTunnel.get(request.tunnelId).push(traffic);

        // Store in global list
        this.allTraffic.push(traffic);

        // Update metrics
        this.requestsWindow.add(1);
        this.bytesInWindow.add(traffic.requestSize);

        // Track method
        const method = request.method || 'UNKNOWN';
        this.methodCounts.set(method, (this.methodCounts.get(method) || 0) + 1);

        // Track path
        const path = request.path || '/';
        this.pathCounts.set(path, (this.pathCounts.get(path) || 0) + 1);

        // Enforce limits
        this.enforceLimit();

        // Emit event for real-time updates
        this.emit('request', traffic.toJSON());

        this.logger.debug(`Request recorded: ${request.requestId}`, {
            method: request.method,
            path: request.path,
        });

        return traffic;
    }

    /**
     * Records a response for a request
     */
    recordResponse(response) {
        const traffic = this.trafficByRequestId.get(response.requestId);

        if (!traffic) {
            this.logger.warn(`No request found for response: ${response.requestId}`);
            return;
        }

        traffic.setResponse(response);

        // Update metrics
        this.bytesOutWindow.add(traffic.responseSize);

        // Track latency
        if (response.responseTime) {
            this.latencyWindow.add(response.responseTime);
        }

        // Track status code
        const statusCode = response.statusCode || 0;
        this.statusCodeCounts.set(statusCode, (this.statusCodeCounts.get(statusCode) || 0) + 1);

        // Update time-series data (every 5 seconds)
        this.updateTimeSeries(response);

        // Emit event for real-time updates
        this.emit('response', traffic.toJSON());

        this.logger.debug(`Response recorded: ${response.requestId}`, {
            statusCode: response.statusCode,
            responseTime: response.responseTime,
        });
    }

    /**
     * Updates time-series data for charts
     */
    updateTimeSeries(response) {
        const now = Date.now();
        const bucket = Math.floor(now / 5000) * 5000; // 5-second buckets

        if (bucket > this.lastTimeSeriesUpdate) {
            this.lastTimeSeriesUpdate = bucket;

            // Keep only last 60 data points (5 minutes)
            if (this.timeSeriesData.length >= 60) {
                this.timeSeriesData.shift();
            }

            this.timeSeriesData.push({
                timestamp: bucket,
                requestsPerSec: this.getRequestsPerSecond(),
                avgLatency: this.getAverageLatency(),
                errorRate: this.getErrorRate(),
                bytesIn: this.bytesInWindow.sum(),
                bytesOut: this.bytesOutWindow.sum(),
            });
        }
    }

    /**
     * Emits current metrics via event
     */
    emitMetrics() {
        const metrics = this.getStats();
        this.emit('metrics', metrics);
    }

    /**
     * Calculates percentile from sorted array
     */
    percentile(sortedArr, p) {
        if (sortedArr.length === 0) return 0;
        const index = Math.ceil((p / 100) * sortedArr.length) - 1;
        return sortedArr[Math.max(0, index)];
    }

    /**
     * Gets requests per second (last minute)
     */
    getRequestsPerSecond() {
        const count = this.requestsWindow.count();
        return (count / 60).toFixed(2);
    }

    /**
     * Gets average latency
     */
    getAverageLatency() {
        const latencies = this.latencyWindow.getValues();
        if (latencies.length === 0) return 0;
        return Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    }

    /**
     * Gets latency percentiles
     */
    getLatencyPercentiles() {
        const latencies = this.latencyWindow.getValues().sort((a, b) => a - b);

        return {
            min: latencies.length > 0 ? latencies[0] : 0,
            max: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
            avg: this.getAverageLatency(),
            p50: this.percentile(latencies, 50),
            p95: this.percentile(latencies, 95),
            p99: this.percentile(latencies, 99),
            count: latencies.length,
        };
    }

    /**
     * Gets throughput metrics
     */
    getThroughput() {
        const requestCount = this.requestsWindow.count();
        const bytesIn = this.bytesInWindow.sum();
        const bytesOut = this.bytesOutWindow.sum();

        return {
            requestsPerMinute: requestCount,
            requestsPerSecond: (requestCount / 60).toFixed(2),
            bytesInPerMinute: bytesIn,
            bytesOutPerMinute: bytesOut,
            bytesInPerSecond: (bytesIn / 60).toFixed(0),
            bytesOutPerSecond: (bytesOut / 60).toFixed(0),
            totalBytesPerMinute: bytesIn + bytesOut,
        };
    }

    /**
     * Gets error rate as percentage
     */
    getErrorRate() {
        let total = 0;
        let errors = 0;

        for (const [code, count] of this.statusCodeCounts) {
            total += count;
            if (code >= 400) errors += count;
        }

        return total > 0 ? ((errors / total) * 100).toFixed(2) : 0;
    }

    /**
     * Gets error breakdown by status code
     */
    getErrorBreakdown() {
        const breakdown = {
            '2xx': 0,
            '3xx': 0,
            '4xx': 0,
            '5xx': 0,
            other: 0,
        };

        for (const [code, count] of this.statusCodeCounts) {
            if (code >= 200 && code < 300) breakdown['2xx'] += count;
            else if (code >= 300 && code < 400) breakdown['3xx'] += count;
            else if (code >= 400 && code < 500) breakdown['4xx'] += count;
            else if (code >= 500) breakdown['5xx'] += count;
            else breakdown.other += count;
        }

        return breakdown;
    }

    /**
     * Gets top paths by request count
     */
    getTopPaths(limit = 10) {
        return Array.from(this.pathCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([path, count]) => ({ path, count }));
    }

    /**
     * Gets method distribution
     */
    getMethodDistribution() {
        const distribution = {};
        for (const [method, count] of this.methodCounts) {
            distribution[method] = count;
        }
        return distribution;
    }

    /**
     * Gets traffic for a specific tunnel
     */
    getTrafficByTunnel(tunnelId, options = {}) {
        const traffic = this.trafficByTunnel.get(tunnelId) || [];
        return this.filterAndPaginate(traffic, options);
    }

    /**
     * Gets all traffic
     */
    getAllTraffic(options = {}) {
        return this.filterAndPaginate(this.allTraffic, options);
    }

    /**
     * Gets a specific request by ID
     */
    getTrafficById(requestId) {
        const traffic = this.trafficByRequestId.get(requestId);
        return traffic ? traffic.toJSON() : null;
    }

    /**
     * Gets the curl command for a request
     */
    getCurlCommand(requestId) {
        const traffic = this.trafficByRequestId.get(requestId);
        return traffic ? traffic.toCurl() : null;
    }

    /**
     * Filters and paginates traffic data
     */
    filterAndPaginate(traffic, options = {}) {
        let result = [...traffic];

        if (options.method) {
            result = result.filter(t => t.request.method === options.method.toUpperCase());
        }

        if (options.statusCode) {
            result = result.filter(t => t.response?.statusCode === parseInt(options.statusCode, 10));
        }

        if (options.path) {
            const pattern = new RegExp(options.path, 'i');
            result = result.filter(t => pattern.test(t.request.path));
        }

        if (options.since) {
            const since = new Date(options.since).getTime();
            result = result.filter(t => t.createdAt >= since);
        }

        result.sort((a, b) => b.createdAt - a.createdAt);

        const limit = options.limit || 50;
        const offset = options.offset || 0;
        result = result.slice(offset, offset + limit);

        return result.map(t => t.toJSON(options.sanitize));
    }

    /**
     * Enforces storage limits
     */
    enforceLimit() {
        while (this.allTraffic.length > this.maxStoredRequests) {
            const removed = this.allTraffic.shift();
            this.trafficByRequestId.delete(removed.requestId);
        }

        for (const [tunnelId, traffic] of this.trafficByTunnel) {
            while (traffic.length > this.maxStoredRequests / 2) {
                traffic.shift();
            }
        }
    }

    /**
     * Cleans up old traffic data
     */
    cleanup() {
        const cutoff = Date.now() - (this.retentionMinutes * 60 * 1000);

        this.allTraffic = this.allTraffic.filter(t => t.createdAt >= cutoff);

        for (const [tunnelId, traffic] of this.trafficByTunnel) {
            this.trafficByTunnel.set(
                tunnelId,
                traffic.filter(t => t.createdAt >= cutoff)
            );
        }

        for (const [requestId, traffic] of this.trafficByRequestId) {
            if (traffic.createdAt < cutoff) {
                this.trafficByRequestId.delete(requestId);
            }
        }

        this.logger.debug('Traffic cleanup completed', {
            remaining: this.allTraffic.length,
        });
    }

    /**
     * Clears all traffic data and resets metrics
     */
    clear() {
        this.allTraffic = [];
        this.trafficByTunnel.clear();
        this.trafficByRequestId.clear();
        this.statusCodeCounts.clear();
        this.methodCounts.clear();
        this.pathCounts.clear();
        this.timeSeriesData = [];
        this.requestsWindow = new RollingWindow(60000);
        this.bytesInWindow = new RollingWindow(60000);
        this.bytesOutWindow = new RollingWindow(60000);
        this.latencyWindow = new RollingWindow(300000);
    }

    /**
     * Stops timers
     */
    destroy() {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        if (this.metricsInterval) clearInterval(this.metricsInterval);
    }

    /**
     * Gets comprehensive traffic statistics computed from real data
     */
    getStats() {
        const latency = this.getLatencyPercentiles();
        const throughput = this.getThroughput();
        const errorBreakdown = this.getErrorBreakdown();

        let successCount = 0;
        let errorCount = 0;

        for (const [code, count] of this.statusCodeCounts) {
            if (code >= 200 && code < 400) successCount += count;
            else if (code >= 400) errorCount += count;
        }

        const totalResponses = successCount + errorCount;

        return {
            // Request counts
            totalRequests: this.allTraffic.length,
            totalResponses,
            pendingRequests: this.allTraffic.length - totalResponses,

            // Success/Error rates (computed from real status codes)
            successRate: totalResponses > 0 ? ((successCount / totalResponses) * 100).toFixed(2) : 0,
            errorRate: this.getErrorRate(),
            errorBreakdown,

            // Latency metrics (computed from real response times)
            latency,
            avgResponseTime: latency.avg,

            // Throughput (computed from real traffic stream)
            throughput,
            requestsPerSecond: throughput.requestsPerSecond,
            requestsPerMinute: throughput.requestsPerMinute,

            // Distribution
            methodDistribution: this.getMethodDistribution(),
            topPaths: this.getTopPaths(5),

            // Time series for charts
            timeSeries: this.timeSeriesData,

            // Tunnel info
            activeTunnels: this.trafficByTunnel.size,
        };
    }
}

module.exports = InspectorService;
