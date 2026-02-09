/**
 * MetricsService
 * 
 * Collects and exposes metrics:
 * - Request counts and latencies
 * - Error rates
 * - Tunnel statistics
 * - Prometheus-compatible export
 */

const { createLogger } = require('../../shared/src');

class MetricsService {
    constructor() {
        this.logger = createLogger({ name: 'MetricsService' });

        // Counters
        this.counters = {
            requestsTotal: 0,
            requestsSuccess: 0,
            requestsError: 0,
            tunnelsCreated: 0,
            tunnelsClosed: 0,
            bytesIn: 0,
            bytesOut: 0,
            replaysTotal: 0,
            webhooksTotal: 0,
            webhooksFailed: 0,
        };

        // Gauges (current values)
        this.gauges = {
            activeTunnels: 0,
            activeConnections: 0,
        };

        // Histograms (latency tracking)
        this.histograms = {
            requestDuration: [],
            tunnelDuration: [],
        };

        // Start time for uptime tracking
        this.startTime = Date.now();

        // Cleanup old histogram data periodically
        setInterval(() => this.cleanupHistograms(), 60000);
    }

    /**
     * Increments a counter
     */
    incrementCounter(name, value = 1) {
        if (this.counters.hasOwnProperty(name)) {
            this.counters[name] += value;
        }
    }

    /**
     * Sets a gauge value
     */
    setGauge(name, value) {
        if (this.gauges.hasOwnProperty(name)) {
            this.gauges[name] = value;
        }
    }

    /**
     * Records a histogram value (with timestamp)
     */
    recordHistogram(name, value) {
        if (this.histograms.hasOwnProperty(name)) {
            this.histograms[name].push({
                value,
                timestamp: Date.now(),
            });
        }
    }

    /**
     * Records a request
     */
    recordRequest(success, duration, bytesIn = 0, bytesOut = 0) {
        this.incrementCounter('requestsTotal');

        if (success) {
            this.incrementCounter('requestsSuccess');
        } else {
            this.incrementCounter('requestsError');
        }

        this.incrementCounter('bytesIn', bytesIn);
        this.incrementCounter('bytesOut', bytesOut);
        this.recordHistogram('requestDuration', duration);
    }

    /**
     * Records tunnel lifecycle events
     */
    recordTunnelCreated() {
        this.incrementCounter('tunnelsCreated');
        this.gauges.activeTunnels++;
    }

    recordTunnelClosed(duration) {
        this.incrementCounter('tunnelsClosed');
        this.gauges.activeTunnels = Math.max(0, this.gauges.activeTunnels - 1);
        this.recordHistogram('tunnelDuration', duration);
    }

    /**
     * Gets histogram statistics
     */
    getHistogramStats(name, windowMs = 60000) {
        const histogram = this.histograms[name] || [];
        const cutoff = Date.now() - windowMs;

        // Filter to recent values
        const recent = histogram.filter(h => h.timestamp >= cutoff);

        if (recent.length === 0) {
            return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
        }

        const values = recent.map(h => h.value).sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);

        return {
            count: values.length,
            min: values[0],
            max: values[values.length - 1],
            avg: Math.round(sum / values.length),
            p50: this.percentile(values, 50),
            p95: this.percentile(values, 95),
            p99: this.percentile(values, 99),
        };
    }

    /**
     * Calculates percentile
     */
    percentile(sortedValues, p) {
        const index = Math.ceil((p / 100) * sortedValues.length) - 1;
        return sortedValues[Math.max(0, index)];
    }

    /**
     * Gets all metrics as JSON
     */
    getMetrics() {
        const requestStats = this.getHistogramStats('requestDuration');
        const tunnelStats = this.getHistogramStats('tunnelDuration', 3600000); // 1 hour

        return {
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            counters: { ...this.counters },
            gauges: { ...this.gauges },
            requestLatency: requestStats,
            tunnelDuration: tunnelStats,
            rates: {
                requestsPerMinute: this.calculateRate('requestsTotal'),
                successRate: this.counters.requestsTotal > 0
                    ? ((this.counters.requestsSuccess / this.counters.requestsTotal) * 100).toFixed(2) + '%'
                    : '0%',
            },
        };
    }

    /**
     * Calculates rate (events per minute)
     */
    calculateRate(counterName) {
        const uptimeMinutes = (Date.now() - this.startTime) / 60000;
        if (uptimeMinutes < 0.1) return 0;
        return (this.counters[counterName] / uptimeMinutes).toFixed(2);
    }

    /**
     * Exports metrics in Prometheus format
     */
    toPrometheus() {
        const lines = [];

        // Add HELP and TYPE comments, then metrics
        lines.push('# HELP devtunnel_uptime_seconds Total uptime in seconds');
        lines.push('# TYPE devtunnel_uptime_seconds gauge');
        lines.push(`devtunnel_uptime_seconds ${Math.floor((Date.now() - this.startTime) / 1000)}`);
        lines.push('');

        // Counters
        for (const [name, value] of Object.entries(this.counters)) {
            const metricName = `devtunnel_${this.toSnakeCase(name)}_total`;
            lines.push(`# HELP ${metricName} Total count of ${name}`);
            lines.push(`# TYPE ${metricName} counter`);
            lines.push(`${metricName} ${value}`);
            lines.push('');
        }

        // Gauges
        for (const [name, value] of Object.entries(this.gauges)) {
            const metricName = `devtunnel_${this.toSnakeCase(name)}`;
            lines.push(`# HELP ${metricName} Current value of ${name}`);
            lines.push(`# TYPE ${metricName} gauge`);
            lines.push(`${metricName} ${value}`);
            lines.push('');
        }

        // Histogram summary for request duration
        const requestStats = this.getHistogramStats('requestDuration');
        lines.push('# HELP devtunnel_request_duration_ms Request duration in milliseconds');
        lines.push('# TYPE devtunnel_request_duration_ms summary');
        lines.push(`devtunnel_request_duration_ms{quantile="0.5"} ${requestStats.p50}`);
        lines.push(`devtunnel_request_duration_ms{quantile="0.95"} ${requestStats.p95}`);
        lines.push(`devtunnel_request_duration_ms{quantile="0.99"} ${requestStats.p99}`);
        lines.push(`devtunnel_request_duration_ms_count ${requestStats.count}`);
        lines.push('');

        return lines.join('\n');
    }

    /**
     * Converts camelCase to snake_case
     */
    toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    /**
     * Cleans up old histogram data
     */
    cleanupHistograms() {
        const maxAge = 3600000; // 1 hour
        const cutoff = Date.now() - maxAge;

        for (const name of Object.keys(this.histograms)) {
            this.histograms[name] = this.histograms[name].filter(
                h => h.timestamp >= cutoff
            );
        }
    }

    /**
     * Resets all metrics
     */
    reset() {
        for (const key of Object.keys(this.counters)) {
            this.counters[key] = 0;
        }
        for (const key of Object.keys(this.gauges)) {
            this.gauges[key] = 0;
        }
        for (const key of Object.keys(this.histograms)) {
            this.histograms[key] = [];
        }
        this.startTime = Date.now();
    }
}

module.exports = MetricsService;
