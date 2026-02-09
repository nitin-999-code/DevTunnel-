/**
 * TrafficHeatmap Component
 * 
 * Visualizes traffic patterns over time:
 * - Hourly/daily request heatmap
 * - Color intensity based on request volume
 * - Interactive tooltips
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Flame, Clock, Activity, AlertOctagon, BarChart2 } from 'lucide-react';

function TrafficHeatmap({ traffic = [], timeRange = '24h' }) {
    // Generate heatmap data from traffic
    const heatmapData = useMemo(() => {
        const now = Date.now();
        const ranges = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
        };
        const range = ranges[timeRange] || ranges['24h'];
        const bucketSize = range / 24; // 24 buckets

        // Initialize buckets
        const buckets = Array(24).fill(0).map((_, i) => ({
            index: i,
            count: 0,
            errors: 0,
            avgLatency: 0,
            latencies: [],
            startTime: now - range + (i * bucketSize),
            endTime: now - range + ((i + 1) * bucketSize),
        }));

        // Fill buckets with traffic data
        traffic.forEach(req => {
            const timestamp = new Date(req.timestamp).getTime();
            if (timestamp < now - range) return;

            const bucketIndex = Math.floor((timestamp - (now - range)) / bucketSize);
            if (bucketIndex >= 0 && bucketIndex < 24) {
                buckets[bucketIndex].count++;
                if (req.statusCode >= 400) buckets[bucketIndex].errors++;
                if (req.responseTime) buckets[bucketIndex].latencies.push(req.responseTime);
            }
        });

        // Calculate averages
        buckets.forEach(bucket => {
            if (bucket.latencies.length > 0) {
                bucket.avgLatency = bucket.latencies.reduce((a, b) => a + b, 0) / bucket.latencies.length;
            }
        });

        const maxCount = Math.max(...buckets.map(b => b.count), 1);
        return { buckets, maxCount };
    }, [traffic, timeRange]);

    // Hovered bucket
    const [hoveredBucket, setHoveredBucket] = useState(null);

    /**
     * Get color intensity based on count
     */
    const getColor = (count, maxCount, errors) => {
        if (count === 0) return 'bg-dark-700/50 border-transparent';

        const intensity = count / maxCount;
        const hasErrors = errors > 0;

        if (hasErrors) {
            if (intensity > 0.8) return 'bg-red-500 border-red-400';
            if (intensity > 0.5) return 'bg-red-600 border-red-500';
            if (intensity > 0.2) return 'bg-red-700 border-red-600';
            return 'bg-red-800 border-red-700';
        }

        if (intensity > 0.8) return 'bg-cyan-400 border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]';
        if (intensity > 0.6) return 'bg-cyan-500 border-cyan-400';
        if (intensity > 0.4) return 'bg-cyan-600 border-cyan-500';
        if (intensity > 0.2) return 'bg-cyan-700 border-cyan-600';
        return 'bg-cyan-800 border-cyan-700';
    };

    /**
     * Format time for display
     */
    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 shadow-lg shadow-cyan-500/5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center text-lg font-semibold text-white gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <span>Traffic Heatmap</span>
                </h2>

                {/* Time range selector */}
                <div className="flex bg-dark-700/50 p-1 rounded-lg border border-dark-600">
                    {['1h', '6h', '24h'].map(range => (
                        <button
                            key={range}
                            onClick={() => { /* Functionality to change timeRange would be here */ }}
                            className={`px-3 py-1 text-xs font-medium rounded transition-all ${timeRange === range
                                ? 'bg-cyan-500/20 text-cyan-400 shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-dark-600/50'
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Heatmap grid */}
            <div className="relative flex-1 flex flex-col justify-center">
                <div className="flex gap-1 h-32 items-end">
                    {heatmapData.buckets.map((bucket, i) => {
                        const heightPercent = Math.max(10, (bucket.count / heatmapData.maxCount) * 100);
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-sm cursor-pointer transition-all duration-300 relative group border-t ${getColor(bucket.count, heatmapData.maxCount, bucket.errors)}`}
                                style={{ height: bucket.count > 0 ? `${heightPercent}%` : '4px' }}
                                onMouseEnter={() => setHoveredBucket(i)}
                                onMouseLeave={() => setHoveredBucket(null)}
                            >
                                {/* Hover effect/tooltip anchor */}
                                <div className={`absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors ${hoveredBucket === i ? 'ring-2 ring-white z-10' : ''}`} />
                            </div>
                        )
                    })}
                </div>

                {/* Time labels */}
                <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                    <span>{formatTime(heatmapData.buckets[0]?.startTime)}</span>
                    <span className="hidden sm:inline">{formatTime(heatmapData.buckets[11]?.startTime)}</span>
                    <span>Now</span>
                </div>

                {/* Tooltip */}
                {hoveredBucket !== null && (
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
                        <div className="bg-dark-900/90 backdrop-blur border border-dark-600 rounded-xl p-4 shadow-xl min-w-[200px] animate-in slide-in-from-bottom-2 zoom-in-95">
                            <div className="text-xs text-gray-400 mb-3 font-mono border-b border-white/5 pb-2">
                                {formatTime(heatmapData.buckets[hoveredBucket].startTime)} - {formatTime(heatmapData.buckets[hoveredBucket].endTime)}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-cyan-400 leading-none mb-1">{heatmapData.buckets[hoveredBucket].count}</div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold">Requests</div>
                                </div>
                                <div className="text-center border-l border-white/5 pl-4">
                                    <div className="text-lg font-bold text-red-400 leading-none mb-1">{heatmapData.buckets[hoveredBucket].errors}</div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold">Errors</div>
                                </div>
                                <div className="text-center border-l border-white/5 pl-4">
                                    <div className="text-lg font-bold text-yellow-400 leading-none mb-1">
                                        {Math.round(heatmapData.buckets[hoveredBucket].avgLatency)}<span className="text-[10px]">ms</span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold">Latency</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-dark-700 text-xs">
                <div className="flex items-center space-x-3">
                    <span className="text-gray-500 font-medium">Activity Level</span>
                    <div className="flex gap-1">
                        <div className="w-2 h-4 rounded-sm bg-dark-700/50" title="None" />
                        <div className="w-2 h-4 rounded-sm bg-cyan-800" title="Low" />
                        <div className="w-2 h-4 rounded-sm bg-cyan-600" title="Medium" />
                        <div className="w-2 h-4 rounded-sm bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.5)]" title="High" />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-gray-500 font-medium">Errors detected</span>
                </div>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-4 mt-4 bg-dark-700/30 rounded-lg p-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                        <Activity className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-lg font-bold text-white">
                            {heatmapData.buckets.reduce((sum, b) => sum + b.count, 0)}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Total</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-lg font-bold text-white">
                            {Math.round(heatmapData.buckets.reduce((sum, b) => sum + b.avgLatency, 0) / (heatmapData.buckets.filter(b => b.count > 0).length || 1))}ms
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Avg Latency</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                        <AlertOctagon className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-lg font-bold text-white">
                            {heatmapData.buckets.reduce((sum, b) => sum + b.errors, 0)}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Errors</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TrafficHeatmap;
