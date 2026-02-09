/**
 * StatsPanel Component
 * 
 * Displays real-time metrics computed from live traffic:
 * - Latency percentiles (p50, p95, p99)
 * - Throughput (requests/sec, bytes/sec)
 * - Error rates with breakdown
 * - Method distribution
 */

import React from 'react';
import {
    Server, BarChart2, CheckCircle, Zap, TrendingUp,
    Rocket, ArrowDown, Download, Upload, PieChart,
    Type, Flame, Clock
} from 'lucide-react';

function StatsPanel({ stats, tunnelCount }) {
    // Core metrics cards
    const coreMetrics = [
        {
            label: 'Active Tunnels',
            value: tunnelCount || 0,
            icon: <Server className="w-6 h-6" />,
            color: 'text-blue-400',
        },
        {
            label: 'Total Requests',
            value: stats.totalRequests || 0,
            icon: <BarChart2 className="w-6 h-6" />,
            color: 'text-purple-400',
        },
        {
            label: 'Success Rate',
            value: `${stats.successRate || 0}%`,
            icon: <CheckCircle className="w-6 h-6" />,
            color: parseFloat(stats.successRate) >= 95 ? 'text-green-400' : 'text-yellow-400',
        },
        {
            label: 'Avg Latency',
            value: `${stats.avgResponseTime || 0}ms`,
            icon: <Zap className="w-6 h-6" />,
            color: (stats.avgResponseTime || 0) < 100 ? 'text-green-400' : 'text-yellow-400',
        },
    ];

    // Latency percentiles
    const latency = stats.latency || {};

    // Throughput
    const throughput = stats.throughput || {};

    // Error breakdown
    const errorBreakdown = stats.errorBreakdown || {};

    return (
        <div className="space-y-4">
            {/* Core metrics grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {coreMetrics.map((metric) => (
                    <div key={metric.label} className="bg-dark-800 rounded-xl border border-dark-600 p-4 shadow-lg shadow-cyan-500/5 hover:border-dark-500 transition-colors">
                        <div className="flex items-center space-x-3">
                            <span className={`${metric.color} opacity-80`}>{metric.icon}</span>
                            <div>
                                <p className={`text-2xl font-bold ${metric.color}`}>
                                    {metric.value}
                                </p>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{metric.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Latency & Throughput Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Latency Percentiles */}
                <div className="bg-dark-800 rounded-xl border border-dark-600 p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-cyan-400" /> Latency Percentiles
                    </h3>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <PercentileStat label="p50" value={latency.p50} />
                        <PercentileStat label="p95" value={latency.p95} warning />
                        <PercentileStat label="p99" value={latency.p99} danger />
                    </div>
                    <div className="mt-4 pt-3 border-t border-dark-600 flex justify-between text-xs text-gray-500 bg-dark-700/30 rounded px-2 py-1">
                        <span>Min: <span className="text-green-400 font-mono">{latency.min || 0}ms</span></span>
                        <span>Max: <span className="text-red-400 font-mono">{latency.max || 0}ms</span></span>
                        <span>Samples: <span className="text-gray-400 font-mono">{latency.count || 0}</span></span>
                    </div>
                </div>

                {/* Throughput */}
                <div className="bg-dark-800 rounded-xl border border-dark-600 p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Rocket className="w-4 h-4 text-purple-400" /> Throughput (1 min window)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <ThroughputStat
                            label="Requests/sec"
                            value={throughput.requestsPerSecond || 0}
                            icon={<ArrowDown className="w-4 h-4 text-blue-400" />}
                        />
                        <ThroughputStat
                            label="Requests/min"
                            value={throughput.requestsPerMinute || 0}
                            icon={<Clock className="w-4 h-4 text-purple-400" />}
                        />
                        <ThroughputStat
                            label="Bytes In/sec"
                            value={formatBytes(throughput.bytesInPerSecond || 0)}
                            icon={<Download className="w-4 h-4 text-green-400" />}
                        />
                        <ThroughputStat
                            label="Bytes Out/sec"
                            value={formatBytes(throughput.bytesOutPerSecond || 0)}
                            icon={<Upload className="w-4 h-4 text-orange-400" />}
                        />
                    </div>
                </div>
            </div>

            {/* Status Code & Method Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status Code Breakdown */}
                <div className="bg-dark-800 rounded-xl border border-dark-600 p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-yellow-400" /> Response Status
                    </h3>
                    <div className="flex items-center space-x-2">
                        <StatusBar
                            label="2xx"
                            count={errorBreakdown['2xx'] || 0}
                            total={stats.totalResponses || 1}
                            color="bg-green-500"
                        />
                        <StatusBar
                            label="3xx"
                            count={errorBreakdown['3xx'] || 0}
                            total={stats.totalResponses || 1}
                            color="bg-blue-500"
                        />
                        <StatusBar
                            label="4xx"
                            count={errorBreakdown['4xx'] || 0}
                            total={stats.totalResponses || 1}
                            color="bg-yellow-500"
                        />
                        <StatusBar
                            label="5xx"
                            count={errorBreakdown['5xx'] || 0}
                            total={stats.totalResponses || 1}
                            color="bg-red-500"
                        />
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-gray-500 bg-dark-700/30 rounded px-2 py-1">
                        <span>Error Rate: <span className={`font-mono ${parseFloat(stats.errorRate) > 5 ? 'text-red-400' : 'text-green-400'}`}>{stats.errorRate || 0}%</span></span>
                        <span>Total: <span className="font-mono text-gray-300">{stats.totalResponses || 0}</span> responses</span>
                    </div>
                </div>

                {/* Method Distribution */}
                <div className="bg-dark-800 rounded-xl border border-dark-600 p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Type className="w-4 h-4 text-cyan-400" /> HTTP Methods
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(stats.methodDistribution || {}).map(([method, count]) => (
                            <MethodBadge key={method} method={method} count={count} />
                        ))}
                        {(!stats.methodDistribution || Object.keys(stats.methodDistribution).length === 0) && (
                            <span className="text-gray-500 text-sm italic">No requests yet</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Paths */}
            {stats.topPaths && stats.topPaths.length > 0 && (
                <div className="bg-dark-800 rounded-xl border border-dark-600 p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-400" /> Top Endpoints
                    </h3>
                    <div className="space-y-2">
                        {stats.topPaths.map(({ path, count }, idx) => (
                            <div key={path} className="flex items-center justify-between text-sm p-2 bg-dark-700/30 rounded border border-transparent hover:border-dark-600 transition-colors">
                                <div className="flex items-center space-x-2 overflow-hidden">
                                    <span className="text-gray-500 w-5 font-mono text-xs">{idx + 1}.</span>
                                    <span className="font-mono text-gray-300 truncate">{path}</span>
                                </div>
                                <span className="text-purple-400 font-mono font-bold bg-purple-500/10 px-2 py-0.5 rounded text-xs">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Percentile stat component
function PercentileStat({ label, value, warning, danger }) {
    let colorClass = 'text-green-400';
    if (danger && value > 500) colorClass = 'text-red-400';
    else if (warning && value > 200) colorClass = 'text-yellow-400';

    return (
        <div className="bg-dark-700/50 rounded-lg p-3 border border-dark-600 hover:border-dark-500 transition-colors">
            <div className="text-xs text-gray-500 mb-1 font-medium">{label}</div>
            <div className={`text-lg font-bold font-mono ${colorClass}`}>
                {value || 0}<span className="text-xs text-gray-500 ml-0.5">ms</span>
            </div>
        </div>
    );
}

// Throughput stat component
function ThroughputStat({ label, value, icon }) {
    return (
        <div className="bg-dark-700/50 rounded-lg p-3 border border-dark-600 flex items-center space-x-3 hover:border-dark-500 transition-colors">
            <div className="bg-dark-800 p-1.5 rounded text-gray-400">{icon}</div>
            <div className="min-w-0">
                <div className="text-sm font-mono text-white font-bold truncate">{value}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{label}</div>
            </div>
        </div>
    );
}

// Status bar component
function StatusBar({ label, count, total, color }) {
    const percentage = total > 0 ? (count / total * 100) : 0;

    return (
        <div className="flex-1 text-center group">
            <div className="h-10 bg-dark-700 rounded overflow-hidden relative border border-dark-600">
                <div
                    className={`h-full ${color} transition-all duration-500 ease-out opacity-20 group-hover:opacity-30`}
                    style={{ width: '100%' }}
                />
                <div
                    className={`absolute bottom-0 left-0 h-1 ${color} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-white">{count > 0 ? count : ''}</span>
                </div>
            </div>
            <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
        </div>
    );
}

// Method badge component
function MethodBadge({ method, count }) {
    const colors = {
        GET: 'bg-green-500/20 text-green-400 border-green-500/30',
        POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        PATCH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
        HEAD: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        OPTIONS: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };

    return (
        <span className={`px-2 py-1.5 rounded-lg text-xs font-mono border ${colors[method] || 'bg-gray-500/20 text-gray-400 border-dark-600'} flex items-center gap-2 transition-transform hover:scale-105`}>
            <span className="font-bold">{method}</span>
            <span className="bg-dark-900/50 px-1.5 rounded text-[10px]">{count}</span>
        </span>
    );
}

// Format bytes helper
function formatBytes(bytes) {
    const num = parseFloat(bytes);
    if (num === 0) return '0';
    if (num < 1024) return `${num}B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)}KB`;
    return `${(num / (1024 * 1024)).toFixed(1)}MB`;
}

export default StatsPanel;
