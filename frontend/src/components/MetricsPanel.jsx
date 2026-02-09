/**
 * MetricsPanel Component
 * 
 * Displays server metrics:
 * - Request rates and latencies
 * - Error rates
 * - Real-time charts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import {
    BarChart2, RefreshCw, BarChart, Activity, AlertCircle,
    ArrowDown, ArrowUp, Clock, Zap
} from 'lucide-react';

function MetricsPanel() {
    const [metrics, setMetrics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Fetch metrics from API
     */
    const fetchMetrics = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/metrics`);
            const data = await res.json();
            setMetrics(data);
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    if (isLoading) {
        return (
            <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                    <span className="text-gray-500">Loading metrics...</span>
                </div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-red-400">
                    <AlertCircle className="w-8 h-8" />
                    <span className="text-gray-500">Failed to load metrics</span>
                </div>
            </div>
        );
    }

    const requestLatency = metrics.requestLatency || {};
    const counters = metrics.counters || {};
    const rates = metrics.rates || {};

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 shadow-lg shadow-purple-500/5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-dark-600">
                <h2 className="flex items-center text-lg font-semibold text-white gap-2">
                    <BarChart2 className="w-5 h-5 text-purple-400" />
                    <span>System Metrics</span>
                </h2>
                <button
                    onClick={fetchMetrics}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Uptime */}
            <div className="text-center mb-4 p-3 bg-dark-700/50 rounded-lg border border-dark-600 flex items-center justify-center gap-3">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Uptime</span>
                <span className="text-xl font-mono text-white font-bold tracking-tight">
                    {formatUptime(metrics.uptime)}
                </span>
            </div>

            {/* Request Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <MetricCard
                    label="Total Requests"
                    value={counters.requestsTotal || 0}
                    color="blue"
                    icon={<Activity className="w-4 h-4" />}
                />
                <MetricCard
                    label="Success Rate"
                    value={rates.successRate || '0%'}
                    color="green"
                    icon={<Zap className="w-4 h-4" />}
                />
                <MetricCard
                    label="Errors"
                    value={counters.requestsError || 0}
                    color="red"
                    icon={<AlertCircle className="w-4 h-4" />}
                />
                <MetricCard
                    label="Req/min"
                    value={rates.requestsPerMinute || '0'}
                    color="yellow"
                    icon={<BarChart className="w-4 h-4" />}
                />
            </div>

            {/* Latency Stats */}
            <div className="bg-dark-700/50 rounded-lg p-4 border border-dark-600 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    <Clock className="w-3 h-3 text-cyan-400" /> Response Latency
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div className="bg-dark-800/50 rounded p-2">
                        <div className="text-gray-500 text-xs mb-1">min</div>
                        <div className="font-mono text-white font-bold">{requestLatency.min || 0}<span className="text-[10px] text-gray-600 font-normal ml-0.5">ms</span></div>
                    </div>
                    <div className="bg-dark-800/50 rounded p-2">
                        <div className="text-gray-500 text-xs mb-1">avg</div>
                        <div className="font-mono text-blue-400 font-bold">{requestLatency.avg || 0}<span className="text-[10px] text-gray-600 font-normal ml-0.5">ms</span></div>
                    </div>
                    <div className="bg-dark-800/50 rounded p-2">
                        <div className="text-gray-500 text-xs mb-1">p95</div>
                        <div className="font-mono text-yellow-400 font-bold">{requestLatency.p95 || 0}<span className="text-[10px] text-gray-600 font-normal ml-0.5">ms</span></div>
                    </div>
                    <div className="bg-dark-800/50 rounded p-2">
                        <div className="text-gray-500 text-xs mb-1">p99</div>
                        <div className="font-mono text-red-400 font-bold">{requestLatency.p99 || 0}<span className="text-[10px] text-gray-600 font-normal ml-0.5">ms</span></div>
                    </div>
                </div>
            </div>

            {/* Byte Transfer */}
            <div className="mt-auto pt-4 border-t border-dark-600 flex justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                    <div className="p-1.5 bg-blue-500/10 rounded-full text-blue-400">
                        <ArrowDown className="w-3 h-3" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Inbound</span>
                        <span className="text-white font-mono font-bold">{formatBytes(counters.bytesIn || 0)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-right">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Outbound</span>
                        <span className="text-white font-mono font-bold">{formatBytes(counters.bytesOut || 0)}</span>
                    </div>
                    <div className="p-1.5 bg-green-500/10 rounded-full text-green-400">
                        <ArrowUp className="w-3 h-3" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Metric card component
 */
function MetricCard({ label, value, color, icon }) {
    const colors = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        green: 'text-green-400 bg-green-500/10 border-green-500/20',
        red: 'text-red-400 bg-red-500/10 border-red-500/20',
        yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    };

    return (
        <div className={`rounded-xl p-3 text-center border ${colors[color]} flex flex-col items-center justify-center transition-transform hover:scale-105`}>
            {icon && <div className="mb-1 opacity-80">{icon}</div>}
            <div className="text-lg font-bold font-mono tracking-tight">{value}</div>
            <div className="text-[10px] uppercase font-bold opacity-60 mt-1">{label}</div>
        </div>
    );
}

/**
 * Formats uptime in seconds to readable string
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
        return `${days}d ${hours}h ${mins}m`;
    }
    if (hours > 0) {
        return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
        return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
}

/**
 * Formats bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default MetricsPanel;
