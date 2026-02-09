/**
 * TrafficControlService
 * 
 * Advanced traffic manipulation features:
 * - Pause/Resume traffic stream
 * - Network throttling (simulate slow connections)
 * - Request modification in-flight
 * - Chaos testing mode (random packet drops)
 */

const EventEmitter = require('events');
const { createLogger } = require('../../shared/src');

class TrafficControlService extends EventEmitter {
    constructor() {
        super();
        this.logger = createLogger({ name: 'TrafficControl' });

        // Traffic stream state
        this.isPaused = false;
        this.pausedRequests = [];

        // Network throttling (latency in ms)
        this.throttleProfiles = {
            none: { latency: 0, bandwidth: Infinity, name: 'No Throttle' },
            fast3g: { latency: 100, bandwidth: 1500000, name: 'Fast 3G' },
            slow3g: { latency: 400, bandwidth: 400000, name: 'Slow 3G' },
            edge: { latency: 800, bandwidth: 50000, name: 'EDGE' },
            offline: { latency: Infinity, bandwidth: 0, name: 'Offline' },
            custom: { latency: 0, bandwidth: Infinity, name: 'Custom' },
        };
        this.activeThrottle = 'none';
        this.customThrottle = { latency: 0, bandwidth: Infinity };

        // Chaos testing
        this.chaosMode = {
            enabled: false,
            dropRate: 0.1, // 10% packet drop
            corruptRate: 0.05, // 5% corruption
            delayVariance: 500, // Random delay variance in ms
        };

        // Request modifications (pattern -> modification)
        this.requestModifications = new Map();

        // Stats
        this.stats = {
            totalPaused: 0,
            totalThrottled: 0,
            totalDropped: 0,
            totalModified: 0,
        };

        this.logger.info('TrafficControlService initialized');
    }

    /**
     * Pause/Resume traffic stream
     */
    pause() {
        this.isPaused = true;
        this.emit('paused');
        this.logger.info('Traffic stream paused');
        return { paused: true, queueSize: this.pausedRequests.length };
    }

    resume() {
        this.isPaused = false;
        const queued = [...this.pausedRequests];
        this.pausedRequests = [];
        this.emit('resumed', queued);
        this.logger.info(`Traffic stream resumed, processing ${queued.length} queued requests`);
        return { paused: false, processed: queued.length };
    }

    isPausedState() {
        return this.isPaused;
    }

    /**
     * Queue request if paused
     */
    queueIfPaused(request) {
        if (this.isPaused) {
            this.pausedRequests.push({
                ...request,
                pausedAt: Date.now(),
            });
            this.stats.totalPaused++;
            this.emit('requestQueued', request);
            return true;
        }
        return false;
    }

    /**
     * Get paused request queue
     */
    getQueue() {
        return this.pausedRequests.map(req => ({
            ...req,
            queuedFor: Date.now() - req.pausedAt,
        }));
    }

    /**
     * Set network throttle profile
     */
    setThrottle(profile, customConfig = null) {
        if (profile === 'custom' && customConfig) {
            this.customThrottle = {
                latency: customConfig.latency || 0,
                bandwidth: customConfig.bandwidth || Infinity,
            };
        }
        this.activeThrottle = profile;
        this.emit('throttleChanged', this.getThrottleConfig());
        this.logger.info(`Throttle set to: ${profile}`);
        return this.getThrottleConfig();
    }

    getThrottleConfig() {
        if (this.activeThrottle === 'custom') {
            return { ...this.customThrottle, name: 'Custom', profile: 'custom' };
        }
        return { ...this.throttleProfiles[this.activeThrottle], profile: this.activeThrottle };
    }

    /**
     * Apply throttle delay to request
     */
    async applyThrottle(dataSize = 0) {
        const config = this.getThrottleConfig();

        if (config.latency === Infinity) {
            throw new Error('Network offline');
        }

        let totalDelay = config.latency;

        // Add bandwidth-based delay
        if (config.bandwidth < Infinity && dataSize > 0) {
            const transferTime = (dataSize * 8) / config.bandwidth * 1000;
            totalDelay += transferTime;
        }

        // Add chaos delay variance if enabled
        if (this.chaosMode.enabled && this.chaosMode.delayVariance > 0) {
            totalDelay += Math.random() * this.chaosMode.delayVariance;
        }

        if (totalDelay > 0) {
            this.stats.totalThrottled++;
            await this.delay(totalDelay);
        }

        return totalDelay;
    }

    /**
     * Chaos testing mode
     */
    setChaosMode(config) {
        this.chaosMode = {
            enabled: config.enabled ?? this.chaosMode.enabled,
            dropRate: config.dropRate ?? this.chaosMode.dropRate,
            corruptRate: config.corruptRate ?? this.chaosMode.corruptRate,
            delayVariance: config.delayVariance ?? this.chaosMode.delayVariance,
        };
        this.emit('chaosModeChanged', this.chaosMode);
        this.logger.info('Chaos mode updated', this.chaosMode);
        return this.chaosMode;
    }

    getChaosMode() {
        return this.chaosMode;
    }

    /**
     * Check if request should be dropped (chaos mode)
     */
    shouldDrop() {
        if (!this.chaosMode.enabled) return false;
        const drop = Math.random() < this.chaosMode.dropRate;
        if (drop) {
            this.stats.totalDropped++;
            this.emit('packetDropped');
        }
        return drop;
    }

    /**
     * Corrupt data randomly (chaos mode)
     */
    maybeCorrupt(data) {
        if (!this.chaosMode.enabled) return data;
        if (Math.random() >= this.chaosMode.corruptRate) return data;

        // Simple corruption: flip some bytes
        if (typeof data === 'string') {
            const chars = data.split('');
            const pos = Math.floor(Math.random() * chars.length);
            chars[pos] = String.fromCharCode(Math.random() * 256);
            return chars.join('');
        }
        return data;
    }

    /**
     * Request modification rules
     */
    addModification(id, pattern, modification) {
        this.requestModifications.set(id, {
            id,
            pattern, // { path: RegExp, method: string, headers: object }
            modification, // { headers: object, body: any, statusCode: number }
            createdAt: Date.now(),
            hitCount: 0,
        });
        this.emit('modificationAdded', { id, pattern, modification });
        return true;
    }

    removeModification(id) {
        const removed = this.requestModifications.delete(id);
        if (removed) {
            this.emit('modificationRemoved', { id });
        }
        return removed;
    }

    getModifications() {
        return Array.from(this.requestModifications.values());
    }

    /**
     * Apply modifications to request
     */
    applyModifications(request) {
        let modified = { ...request };
        let wasModified = false;

        for (const [id, rule] of this.requestModifications) {
            // Check if pattern matches
            if (this.matchesPattern(request, rule.pattern)) {
                // Apply modifications
                if (rule.modification.headers) {
                    modified.headers = { ...modified.headers, ...rule.modification.headers };
                    wasModified = true;
                }
                if (rule.modification.body !== undefined) {
                    modified.body = rule.modification.body;
                    wasModified = true;
                }
                if (rule.modification.path) {
                    modified.path = rule.modification.path;
                    wasModified = true;
                }

                rule.hitCount++;
                this.stats.totalModified++;
            }
        }

        if (wasModified) {
            this.emit('requestModified', { original: request, modified });
        }

        return modified;
    }

    /**
     * Check if request matches pattern
     */
    matchesPattern(request, pattern) {
        if (pattern.path) {
            const pathRegex = new RegExp(pattern.path);
            if (!pathRegex.test(request.path || request.url)) {
                return false;
            }
        }
        if (pattern.method && pattern.method !== request.method) {
            return false;
        }
        return true;
    }

    /**
     * Get full control state
     */
    getState() {
        return {
            isPaused: this.isPaused,
            queueSize: this.pausedRequests.length,
            throttle: this.getThrottleConfig(),
            chaosMode: this.chaosMode,
            modifications: this.getModifications(),
            stats: this.stats,
        };
    }

    /**
     * Helper delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = TrafficControlService;
