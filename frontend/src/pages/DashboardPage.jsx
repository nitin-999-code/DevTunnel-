/**
 * DevTunnel+ Enhanced Dashboard
 * 
 * Real analytics platform with:
 * - Traffic timeline graph
 * - Latency over time
 * - Route heatmap
 * - Error spikes
 * - Payload size tracking
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { useTraffic } from '../hooks/useTraffic';
import RequestDetails from '../components/RequestDetails';
import TunnelList from '../components/TunnelList';
import TrafficControlPanel from '../components/TrafficControlPanel';
import TrafficHeatmap from '../components/TrafficHeatmap';
import DiffReplayPanel from '../components/DiffReplayPanel';
import QRCodeModal from '../components/QRCodeModal';
import {
    LayoutGrid, Activity, CheckCircle, Zap, Flame,
    Settings, RotateCcw, Trash2, Globe, Server, X,
    Wifi, WifiOff, FileText, Search, BookOpen
} from 'lucide-react';

// Custom Tooltip for charts
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    return (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
            <p className="text-gray-400 text-xs mb-1">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
                    {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                </p>
            ))}
        </div>
    );
}

// Stat Card with animation
function StatCard({ icon, value, label, trend, color = 'cyan' }) {
    const colorClasses = {
        cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
        green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400',
        purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
        orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400',
        red: 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-5
                       hover:scale-[1.02] transition-transform duration-300`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-3xl font-bold text-white mb-1">{value}</div>
                    <div className="text-sm text-gray-400">{label}</div>
                </div>
                <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
            </div>
            {trend !== undefined && (
                <div className={`mt-3 text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last hour
                </div>
            )}
        </motion.div>
    );
}

// Traffic Timeline Chart
function TrafficTimelineChart({ data }) {
    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Traffic Timeline
                <span className="text-xs text-gray-500 font-normal">Last 30 minutes</span>
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="requests"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            fill="url(#colorRequests)"
                            name="Requests"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Latency Chart
function LatencyChart({ data }) {
    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Latency Over Time
                <span className="text-xs text-gray-500 font-normal">ms</span>
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="p50"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                            name="P50"
                        />
                        <Line
                            type="monotone"
                            dataKey="p95"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                            name="P95"
                        />
                        <Line
                            type="monotone"
                            dataKey="p99"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                            name="P99"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    P50
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    P95
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    P99
                </span>
            </div>
        </div>
    );
}

// Status Code Distribution
function StatusCodeChart({ data }) {
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']; // Green, Blue, Yellow, Red

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-400" /> Status Codes
            </h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-gray-400">{item.name}:</span>
                        <span className="font-medium">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Error Spikes Chart
function ErrorSpikesChart({ data }) {
    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                Error Rate
                <span className="text-xs text-gray-500 font-normal">%</span>
            </h3>
            <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#6b7280" fontSize={10} />
                        <YAxis stroke="#6b7280" fontSize={10} domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="errorRate" fill="#ef4444" radius={[4, 4, 0, 0]} name="Error %" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Payload Size Chart
function PayloadSizeChart({ data }) {
    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-400" />
                Payload Size
                <span className="text-xs text-gray-500 font-normal">KB</span>
            </h3>
            <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorPayload" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#6b7280" fontSize={10} />
                        <YAxis stroke="#6b7280" fontSize={10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="size"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            fill="url(#colorPayload)"
                            name="Size (KB)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Live Traffic List
function LiveTrafficList({ requests, onSelectRequest }) {
    const getStatusColor = (status) => {
        if (status >= 200 && status < 300) return 'text-green-400 bg-green-500/10 border-green-500/30';
        if (status >= 300 && status < 400) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
        if (status >= 400 && status < 500) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
        if (status >= 500) return 'text-red-400 bg-red-500/10 border-red-500/30';
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    };

    const getMethodColor = (method) => {
        const colors = {
            GET: 'text-green-400',
            POST: 'text-blue-400',
            PUT: 'text-yellow-400',
            PATCH: 'text-orange-400',
            DELETE: 'text-red-400',
        };
        return colors[method] || 'text-gray-400';
    };

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-600">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    Live Traffic
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </h3>
                <span className="text-sm text-gray-500">{requests.length} requests</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-96">
                {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                        <div className="p-4 bg-dark-700/50 rounded-full mb-3">
                            <Activity className="w-8 h-8 text-gray-600" />
                        </div>
                        <div>No requests yet</div>
                        <div className="text-sm">Requests will appear here in real-time</div>
                    </div>
                ) : (
                    <div className="divide-y divide-dark-600">
                        {requests.slice(0, 50).map((req, i) => (
                            <motion.div
                                key={req.id || i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="px-5 py-3 hover:bg-dark-700/50 cursor-pointer transition-colors"
                                onClick={() => onSelectRequest(req)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-mono font-bold ${getMethodColor(req.method)}`}>
                                        {req.method}
                                    </span>
                                    <span className="text-sm text-gray-300 truncate flex-1 font-mono">
                                        {req.path}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(req.statusCode)}`}>
                                        {req.statusCode || '...'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {req.responseTime ? `${req.responseTime}ms` : '-'}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Connection Status Indicator
function ConnectionStatus({ connected, latency }) {
    return (
        <div className="flex items-center gap-3">
            <motion.div
                className={`relative ${connected ? 'text-green-500' : 'text-red-500'}`}
                animate={connected ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
            >
                {connected
                    ? <Wifi className="w-5 h-5" />
                    : <WifiOff className="w-5 h-5" />
                }
            </motion.div>
            <div>
                <div className={`font-medium ${connected ? 'text-green-400' : 'text-red-400'}`}>
                    {connected ? 'Connected' : 'Disconnected'}
                </div>
                {connected && latency !== undefined && (
                    <div className="text-xs text-gray-500">{latency}ms</div>
                )}
            </div>
        </div>
    );
}

// Main Dashboard Component
export default function DashboardPage() {
    const {
        requests,
        tunnels,
        stats,
        connected,
        fetchTunnels,
        clearRequests
    } = useTraffic();

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activePanel, setActivePanel] = useState(null);
    const [qrTunnel, setQrTunnel] = useState(null);
    const [view, setView] = useState('overview'); // overview, analytics

    // Generate time-series data from requests
    const timeSeriesData = useMemo(() => {
        const now = Date.now();
        const buckets = [];

        // Create 30 buckets for last 30 minutes
        for (let i = 29; i >= 0; i--) {
            const bucketStart = now - (i + 1) * 60000;
            const bucketEnd = now - i * 60000;
            const time = new Date(bucketEnd).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            const bucketRequests = requests.filter(r => {
                const reqTime = new Date(r.timestamp).getTime();
                return reqTime >= bucketStart && reqTime < bucketEnd;
            });

            const latencies = bucketRequests.filter(r => r.responseTime).map(r => r.responseTime);
            const errors = bucketRequests.filter(r => r.statusCode >= 400).length;
            const payloadSizes = bucketRequests.map(r =>
                ((r.requestSize || 0) + (r.responseSize || 0)) / 1024
            );

            buckets.push({
                time,
                requests: bucketRequests.length,
                p50: latencies.length ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.5)] : 0,
                p95: latencies.length ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0,
                p99: latencies.length ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)] : 0,
                errorRate: bucketRequests.length > 0 ? (errors / bucketRequests.length) * 100 : 0,
                size: payloadSizes.reduce((a, b) => a + b, 0) / Math.max(payloadSizes.length, 1)
            });
        }

        return buckets;
    }, [requests]);

    // Status code distribution
    const statusCodeData = useMemo(() => {
        const counts = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
        requests.forEach(r => {
            if (r.statusCode >= 200 && r.statusCode < 300) counts['2xx']++;
            else if (r.statusCode >= 300 && r.statusCode < 400) counts['3xx']++;
            else if (r.statusCode >= 400 && r.statusCode < 500) counts['4xx']++;
            else if (r.statusCode >= 500) counts['5xx']++;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [requests]);

    return (
        <div className="min-h-screen bg-dark-900 text-gray-100">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link to="/" className="flex items-center gap-2">
                                <Activity className="w-6 h-6 text-cyan-500" />
                                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                    DevTunnel+
                                </span>
                            </Link>
                            <nav className="hidden md:flex items-center gap-1">
                                <button
                                    onClick={() => setView('overview')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border
                                              ${view === 'overview'
                                            ? 'bg-dark-700 text-white border-dark-600'
                                            : 'text-gray-400 hover:text-white border-transparent'}`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setView('analytics')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border
                                              ${view === 'analytics'
                                            ? 'bg-dark-700 text-white border-dark-600'
                                            : 'text-gray-400 hover:text-white border-transparent'}`}
                                >
                                    Analytics
                                </button>
                                <Link to="/docs" className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" /> Docs
                                </Link>
                            </nav>
                        </div>
                        <ConnectionStatus connected={connected} latency={stats?.avgLatency} />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1800px] mx-auto px-6 py-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                    <StatCard
                        icon={<Globe className="w-6 h-6" />}
                        value={tunnels.length}
                        label="Active Tunnels"
                        color="cyan"
                    />
                    <StatCard
                        icon={<Activity className="w-6 h-6" />}
                        value={stats?.totalRequests || requests.length}
                        label="Total Requests"
                        color="purple"
                    />
                    <StatCard
                        icon={<CheckCircle className="w-6 h-6" />}
                        value={`${(stats?.successRate || 100).toFixed(1)}%`}
                        label="Success Rate"
                        color="green"
                    />
                    <StatCard
                        icon={<Zap className="w-6 h-6" />}
                        value={`${stats?.avgResponseTime?.toFixed(0) || 0}ms`}
                        label="Avg Latency"
                        color="orange"
                    />
                    <StatCard
                        icon={<Flame className="w-6 h-6" />}
                        value={stats?.throughput?.requestsPerSec?.toFixed(1) || '0.0'}
                        label="Requests/sec"
                        color="red"
                    />
                </div>

                {/* Feature Toggles */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {[
                        { id: 'control', icon: <Settings className="w-4 h-4" />, label: 'Traffic Control' },
                        { id: 'heatmap', icon: <LayoutGrid className="w-4 h-4" />, label: 'Heatmap' },
                        { id: 'replay', icon: <RotateCcw className="w-4 h-4" />, label: 'Diff Replay' },
                    ].map(panel => (
                        <button
                            key={panel.id}
                            onClick={() => setActivePanel(activePanel === panel.id ? null : panel.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                                      ${activePanel === panel.id
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                    : 'bg-dark-700 text-gray-400 hover:text-white border border-dark-500'}`}
                        >
                            {panel.icon} {panel.label}
                        </button>
                    ))}
                    <button
                        onClick={clearRequests}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-700 text-gray-400 
                                 hover:text-white border border-dark-500 transition-colors ml-auto flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Clear
                    </button>
                </div>

                {/* Active Panel */}
                <AnimatePresence>
                    {activePanel && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 overflow-hidden"
                        >
                            {activePanel === 'control' && <TrafficControlPanel />}
                            {activePanel === 'heatmap' && <TrafficHeatmap requests={requests} />}
                            {activePanel === 'replay' && <DiffReplayPanel requests={requests} />}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column: Tunnels + Traffic */}
                    <div className="lg:col-span-1 space-y-6">
                        <TunnelList
                            tunnels={tunnels}
                            onRefresh={fetchTunnels}
                            onShowQR={setQrTunnel}
                        />
                        <LiveTrafficList
                            requests={requests}
                            onSelectRequest={setSelectedRequest}
                        />
                    </div>

                    {/* Right Column: Charts */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Traffic Timeline */}
                        <TrafficTimelineChart data={timeSeriesData} />

                        {/* Latency + Status Code */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <LatencyChart data={timeSeriesData} />
                            <StatusCodeChart data={statusCodeData} />
                        </div>

                        {/* Error + Payload */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <ErrorSpikesChart data={timeSeriesData} />
                            <PayloadSizeChart data={timeSeriesData} />
                        </div>
                    </div>
                </div>
            </main>

            {/* Request Details Drawer */}
            <AnimatePresence>
                {selectedRequest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedRequest(null)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-dark-800 border-l border-dark-600 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-dark-800 border-b border-dark-600 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-cyan-400" />
                                    Request Details
                                </h2>
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6">
                                <RequestDetails request={selectedRequest} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Code Modal */}
            {qrTunnel && (
                <QRCodeModal tunnel={qrTunnel} onClose={() => setQrTunnel(null)} />
            )}
        </div>
    );
}
