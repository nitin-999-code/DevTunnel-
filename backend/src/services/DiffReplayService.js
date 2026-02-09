/**
 * DiffReplayService
 * 
 * Live diff replay functionality:
 * - Compare original and replayed responses
 * - Highlight differences in headers, body, timing
 * - Track regression patterns
 */

const EventEmitter = require('events');
const { createLogger } = require('../../shared/src');

class DiffReplayService extends EventEmitter {
    constructor(replayService, inspectorService) {
        super();
        this.logger = createLogger({ name: 'DiffReplay' });
        this.replayService = replayService;
        this.inspectorService = inspectorService;

        // Store diff results
        this.diffHistory = [];
        this.maxHistory = 100;
    }

    /**
     * Replay request and generate diff
     */
    async replayWithDiff(requestId, modifications = {}) {
        // Get original request/response
        const original = this.inspectorService.getTrafficById(requestId);
        if (!original) {
            throw new Error('Original request not found');
        }

        // Perform replay
        const replayResult = await this.replayService.replayRequest(requestId, modifications);

        // Generate diff
        const diff = this.generateDiff(original, replayResult);

        // Store in history
        this.diffHistory.unshift({
            id: `diff_${Date.now()}`,
            requestId,
            timestamp: Date.now(),
            original: {
                statusCode: original.statusCode,
                responseTime: original.responseTime,
                headers: original.responseHeaders,
                bodyPreview: this.truncate(original.responseBody, 500),
            },
            replay: {
                statusCode: replayResult.response?.statusCode,
                responseTime: replayResult.duration,
                headers: replayResult.response?.headers,
                bodyPreview: this.truncate(replayResult.response?.body, 500),
            },
            diff,
            hasChanges: diff.totalChanges > 0,
        });

        // Trim history
        if (this.diffHistory.length > this.maxHistory) {
            this.diffHistory = this.diffHistory.slice(0, this.maxHistory);
        }

        this.emit('diffCompleted', this.diffHistory[0]);
        return this.diffHistory[0];
    }

    /**
     * Generate detailed diff between original and replay
     */
    generateDiff(original, replay) {
        const diff = {
            status: this.diffStatus(original.statusCode, replay.response?.statusCode),
            timing: this.diffTiming(original.responseTime, replay.duration),
            headers: this.diffHeaders(original.responseHeaders, replay.response?.headers),
            body: this.diffBody(original.responseBody, replay.response?.body),
            totalChanges: 0,
        };

        // Count total changes
        diff.totalChanges =
            (diff.status.changed ? 1 : 0) +
            (diff.timing.significant ? 1 : 0) +
            diff.headers.changes.length +
            (diff.body.changed ? 1 : 0);

        return diff;
    }

    /**
     * Diff status codes
     */
    diffStatus(original, replay) {
        return {
            original: original || 0,
            replay: replay || 0,
            changed: original !== replay,
            severity: this.getStatusSeverity(original, replay),
        };
    }

    getStatusSeverity(original, replay) {
        if (original === replay) return 'none';
        const origClass = Math.floor(original / 100);
        const replayClass = Math.floor(replay / 100);
        if (origClass !== replayClass) return 'critical';
        return 'warning';
    }

    /**
     * Diff timing
     */
    diffTiming(original, replay) {
        const delta = (replay || 0) - (original || 0);
        const percentChange = original ? ((delta / original) * 100) : 0;

        return {
            original: original || 0,
            replay: replay || 0,
            delta,
            percentChange: Math.round(percentChange),
            significant: Math.abs(percentChange) > 20, // 20% threshold
            faster: delta < 0,
        };
    }

    /**
     * Diff headers
     */
    diffHeaders(original = {}, replay = {}) {
        const changes = [];
        const allKeys = new Set([...Object.keys(original), ...Object.keys(replay)]);

        for (const key of allKeys) {
            const origVal = original[key];
            const replayVal = replay[key];

            if (origVal === undefined) {
                changes.push({ key, type: 'added', value: replayVal });
            } else if (replayVal === undefined) {
                changes.push({ key, type: 'removed', value: origVal });
            } else if (origVal !== replayVal) {
                changes.push({ key, type: 'modified', original: origVal, replay: replayVal });
            }
        }

        return { changes, total: allKeys.size };
    }

    /**
     * Diff body content
     */
    diffBody(original, replay) {
        const origStr = typeof original === 'string' ? original : JSON.stringify(original);
        const replayStr = typeof replay === 'string' ? replay : JSON.stringify(replay);

        if (origStr === replayStr) {
            return { changed: false, type: 'identical' };
        }

        // Try JSON diff
        try {
            const origJson = JSON.parse(origStr);
            const replayJson = JSON.parse(replayStr);
            const jsonDiff = this.jsonDiff(origJson, replayJson);
            return {
                changed: true,
                type: 'json',
                additions: jsonDiff.additions,
                removals: jsonDiff.removals,
                modifications: jsonDiff.modifications,
            };
        } catch {
            // Text diff (simplified)
            return {
                changed: true,
                type: 'text',
                originalLength: origStr?.length || 0,
                replayLength: replayStr?.length || 0,
                lengthDelta: (replayStr?.length || 0) - (origStr?.length || 0),
            };
        }
    }

    /**
     * Simple JSON diff
     */
    jsonDiff(original, replay, path = '') {
        const result = { additions: [], removals: [], modifications: [] };

        if (typeof original !== typeof replay) {
            result.modifications.push({ path: path || 'root', original, replay });
            return result;
        }

        if (typeof original !== 'object' || original === null) {
            if (original !== replay) {
                result.modifications.push({ path: path || 'root', original, replay });
            }
            return result;
        }

        const allKeys = new Set([...Object.keys(original), ...Object.keys(replay)]);

        for (const key of allKeys) {
            const keyPath = path ? `${path}.${key}` : key;

            if (!(key in original)) {
                result.additions.push({ path: keyPath, value: replay[key] });
            } else if (!(key in replay)) {
                result.removals.push({ path: keyPath, value: original[key] });
            } else {
                const nested = this.jsonDiff(original[key], replay[key], keyPath);
                result.additions.push(...nested.additions);
                result.removals.push(...nested.removals);
                result.modifications.push(...nested.modifications);
            }
        }

        return result;
    }

    /**
     * Get diff history
     */
    getHistory(limit = 20) {
        return this.diffHistory.slice(0, limit);
    }

    /**
     * Get diff by ID
     */
    getDiffById(diffId) {
        return this.diffHistory.find(d => d.id === diffId);
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.diffHistory = [];
        return true;
    }

    /**
     * Truncate string helper
     */
    truncate(str, maxLen) {
        if (!str) return '';
        const s = typeof str === 'string' ? str : JSON.stringify(str);
        return s.length > maxLen ? s.substring(0, maxLen) + '...' : s;
    }
}

module.exports = DiffReplayService;
