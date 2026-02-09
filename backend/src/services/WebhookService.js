/**
 * WebhookService
 * 
 * Handles webhook delivery with retry logic:
 * - Automatic retry with exponential backoff
 * - Dead letter queue for failed webhooks
 * - Webhook history and analytics
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { createLogger, generateRequestId, calculateBackoff } = require('../../shared/src');

class WebhookService {
    constructor() {
        this.logger = createLogger({ name: 'WebhookService' });

        // Webhook subscriptions
        // Format: { id: { url, events, headers, active } }
        this.subscriptions = new Map();

        // Delivery history
        this.deliveryHistory = [];
        this.maxHistory = 500;

        // Dead letter queue (failed deliveries)
        this.deadLetterQueue = [];
        this.maxDeadLetter = 100;

        // Retry configuration
        this.config = {
            maxRetries: 5,
            baseDelay: 1000,       // 1 second
            maxDelay: 300000,      // 5 minutes
            timeout: 30000,        // 30 seconds
        };

        // Track pending retries
        this.pendingRetries = new Map();
    }

    /**
     * Creates a new webhook subscription
     */
    createSubscription(options) {
        const {
            url,
            events = ['*'],       // Events to subscribe to
            headers = {},         // Custom headers
            secret = null,        // Signing secret
        } = options;

        // Validate URL
        try {
            new URL(url);
        } catch {
            throw new Error('Invalid webhook URL');
        }

        const subscriptionId = generateRequestId();

        this.subscriptions.set(subscriptionId, {
            id: subscriptionId,
            url,
            events,
            headers,
            secret,
            active: true,
            createdAt: new Date().toISOString(),
            deliveryCount: 0,
            failureCount: 0,
        });

        this.logger.info('Webhook subscription created', { id: subscriptionId, url });

        return subscriptionId;
    }

    /**
     * Sends a webhook to all matching subscriptions
     */
    async triggerEvent(eventType, payload) {
        const subscriptions = this.getMatchingSubscriptions(eventType);

        const results = await Promise.all(
            subscriptions.map(sub => this.deliver(sub, eventType, payload))
        );

        return results;
    }

    /**
     * Gets subscriptions that match an event type
     */
    getMatchingSubscriptions(eventType) {
        const matches = [];

        for (const sub of this.subscriptions.values()) {
            if (!sub.active) continue;

            // Check if subscription matches event
            if (sub.events.includes('*') || sub.events.includes(eventType)) {
                matches.push(sub);
            }
        }

        return matches;
    }

    /**
     * Delivers a webhook with retry logic
     */
    async deliver(subscription, eventType, payload, attempt = 0) {
        const deliveryId = generateRequestId();
        const startTime = Date.now();

        const webhookPayload = {
            id: deliveryId,
            event: eventType,
            timestamp: new Date().toISOString(),
            data: payload,
        };

        try {
            const response = await this.sendRequest(subscription, webhookPayload);
            const duration = Date.now() - startTime;

            // Record successful delivery
            const record = {
                deliveryId,
                subscriptionId: subscription.id,
                event: eventType,
                status: 'success',
                statusCode: response.statusCode,
                attempt: attempt + 1,
                duration,
                timestamp: new Date().toISOString(),
            };

            this.addToHistory(record);
            subscription.deliveryCount++;

            this.logger.info('Webhook delivered', {
                deliveryId,
                event: eventType,
                statusCode: response.statusCode,
                duration,
            });

            return record;

        } catch (error) {
            const duration = Date.now() - startTime;

            // Check if we should retry
            if (attempt < this.config.maxRetries) {
                const delay = calculateBackoff(attempt, this.config.baseDelay, this.config.maxDelay);

                this.logger.warn('Webhook delivery failed, scheduling retry', {
                    deliveryId,
                    attempt: attempt + 1,
                    nextRetryIn: `${delay}ms`,
                    error: error.message,
                });

                // Schedule retry
                setTimeout(() => {
                    this.deliver(subscription, eventType, payload, attempt + 1);
                }, delay);

                return {
                    deliveryId,
                    status: 'retrying',
                    attempt: attempt + 1,
                    nextRetryIn: delay,
                };
            }

            // Max retries exceeded - add to dead letter queue
            const record = {
                deliveryId,
                subscriptionId: subscription.id,
                event: eventType,
                status: 'failed',
                error: error.message,
                attempts: attempt + 1,
                duration,
                timestamp: new Date().toISOString(),
                payload: webhookPayload,
            };

            this.addToDeadLetter(record);
            subscription.failureCount++;

            this.logger.error('Webhook delivery permanently failed', {
                deliveryId,
                event: eventType,
                attempts: attempt + 1,
            });

            return record;
        }
    }

    /**
     * Sends HTTP request to webhook URL
     */
    sendRequest(subscription, payload) {
        return new Promise((resolve, reject) => {
            const url = new URL(subscription.url);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const payloadStr = JSON.stringify(payload);

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payloadStr),
                    'User-Agent': 'DevTunnel-Webhook/1.0',
                    'X-Webhook-ID': payload.id,
                    'X-Webhook-Event': payload.event,
                    ...subscription.headers,
                },
            };

            // Add signature if secret is configured
            if (subscription.secret) {
                const crypto = require('crypto');
                const signature = crypto
                    .createHmac('sha256', subscription.secret)
                    .update(payloadStr)
                    .digest('hex');
                options.headers['X-Webhook-Signature'] = `sha256=${signature}`;
            }

            const req = httpModule.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    // Consider 2xx as success
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ statusCode: res.statusCode, body });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 100)}`));
                    }
                });
            });

            req.on('error', reject);

            // Timeout
            req.setTimeout(this.config.timeout, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(payloadStr);
            req.end();
        });
    }

    /**
     * Adds delivery to history
     */
    addToHistory(record) {
        this.deliveryHistory.unshift(record);
        if (this.deliveryHistory.length > this.maxHistory) {
            this.deliveryHistory = this.deliveryHistory.slice(0, this.maxHistory);
        }
    }

    /**
     * Adds failed delivery to dead letter queue
     */
    addToDeadLetter(record) {
        this.deadLetterQueue.unshift(record);
        if (this.deadLetterQueue.length > this.maxDeadLetter) {
            this.deadLetterQueue = this.deadLetterQueue.slice(0, this.maxDeadLetter);
        }
    }

    /**
     * Retries a failed webhook from dead letter queue
     */
    async retryFromDeadLetter(deliveryId) {
        const index = this.deadLetterQueue.findIndex(d => d.deliveryId === deliveryId);

        if (index === -1) {
            throw new Error('Delivery not found in dead letter queue');
        }

        const record = this.deadLetterQueue[index];
        const subscription = this.subscriptions.get(record.subscriptionId);

        if (!subscription) {
            throw new Error('Subscription no longer exists');
        }

        // Remove from dead letter queue
        this.deadLetterQueue.splice(index, 1);

        // Retry delivery
        return this.deliver(subscription, record.event, record.payload.data, 0);
    }

    /**
     * Gets delivery history
     */
    getHistory(limit = 50) {
        return this.deliveryHistory.slice(0, limit);
    }

    /**
     * Gets dead letter queue
     */
    getDeadLetterQueue() {
        return this.deadLetterQueue;
    }

    /**
     * Gets subscription by ID
     */
    getSubscription(id) {
        return this.subscriptions.get(id);
    }

    /**
     * Gets all subscriptions
     */
    getAllSubscriptions() {
        return Array.from(this.subscriptions.values());
    }

    /**
     * Deletes a subscription
     */
    deleteSubscription(id) {
        return this.subscriptions.delete(id);
    }

    /**
     * Gets webhook stats
     */
    getStats() {
        let totalDeliveries = 0;
        let totalFailures = 0;

        for (const sub of this.subscriptions.values()) {
            totalDeliveries += sub.deliveryCount;
            totalFailures += sub.failureCount;
        }

        return {
            subscriptions: this.subscriptions.size,
            totalDeliveries,
            totalFailures,
            deadLetterCount: this.deadLetterQueue.length,
            successRate: totalDeliveries > 0
                ? ((totalDeliveries - totalFailures) / totalDeliveries * 100).toFixed(2) + '%'
                : '0%',
        };
    }
}

module.exports = WebhookService;
