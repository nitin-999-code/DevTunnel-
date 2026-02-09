/**
 * ConnectionHealthIndicator Component
 * 
 * Real-time connection health visualization:
 * - Heartbeat animation
 * - Tunnel health bar
 * - Connection status with live pulse
 */

import React, { useState, useEffect } from 'react';
import { Heart, Activity, Check, AlertTriangle, X, Clock, BarChart2, XCircle } from 'lucide-react';

function ConnectionHealthIndicator({ isConnected, tunnels = [], latencyMs = 0 }) {
    // Heartbeat state
    const [heartbeatCount, setHeartbeatCount] = useState(0);
    const [lastPing, setLastPing] = useState(Date.now());

    // Simulate heartbeat
    useEffect(() => {
        if (!isConnected) return;

        const interval = setInterval(() => {
            setHeartbeatCount(c => c + 1);
            setLastPing(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [isConnected]);

    // Calculate overall health (0-100)
    const calculateHealth = () => {
        if (!isConnected) return 0;

        let health = 100;

        // Deduct for high latency
        if (latencyMs > 500) health -= 30;
        else if (latencyMs > 200) health -= 15;
        else if (latencyMs > 100) health -= 5;

        // Deduct if no tunnels
        if (tunnels.length === 0) health -= 20;

        return Math.max(0, health);
    };

    const health = calculateHealth();
    const healthColor = health > 80 ? 'bg-green-500' : health > 50 ? 'bg-yellow-500' : 'bg-red-500';
    const healthTextColor = health > 80 ? 'text-green-400' : health > 50 ? 'text-yellow-400' : 'text-red-400';

    return (
        <div className="flex items-center space-x-4 bg-dark-800/50 px-4 py-2 rounded-full border border-dark-600 backdrop-blur-sm">
            {/* Heartbeat Indicator */}
            <div className="relative flex items-center justify-center w-8 h-8">
                {/* Pulse rings */}
                {isConnected && (
                    <>
                        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-20 animate-ping"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                    </>
                )}
                {!isConnected && (
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse"></span>
                )}
            </div>

            {/* Connection Status */}
            <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                    <span className={`text-sm font-bold tracking-tight uppercase ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                    {isConnected && (
                        <span className="text-xs text-gray-500 font-mono bg-dark-700 px-1.5 py-0.5 rounded border border-dark-600 flex items-center gap-1">
                            <Activity className="w-3 h-3 text-cyan-500" />
                            {latencyMs}ms
                        </span>
                    )}
                </div>

                {/* Mini health bar */}
                <div className="w-24 h-1.5 bg-dark-700 rounded-full overflow-hidden mt-1.5 border border-dark-600/50">
                    <div
                        className={`h-full transition-all duration-500 ${healthColor} shadow-[0_0_8px_rgba(0,0,0,0.5)]`}
                        style={{ width: `${health}%` }}
                    />
                </div>
            </div>

            {/* Heartbeat icon */}
            <div className="pl-2 border-l border-dark-600/50 flex items-center">
                <Heart
                    className={`w-5 h-5 transition-colors duration-300 ${isConnected ? 'text-red-500 animate-pulse fill-red-500/20' : 'text-gray-600 fill-gray-600/20'}`}
                    style={{ animationDuration: isConnected ? '1s' : '0s' }}
                />
            </div>
        </div>
    );
}

/**
 * TunnelHealthBar Component
 * 
 * Detailed health visualization per tunnel
 */
export function TunnelHealthBar({ tunnel }) {
    // Calculate tunnel health metrics
    const uptime = tunnel.uptime || 0;
    const requestCount = tunnel.requestCount || 0;
    const errorRate = tunnel.errorRate || 0;

    // Health score (0-100)
    const healthScore = Math.max(0, 100 - (errorRate * 100) - (uptime < 60000 ? 10 : 0));

    // Determine status
    const status = healthScore > 90 ? 'healthy' : healthScore > 70 ? 'degraded' : 'critical';

    // Status configuration with Lucide icons
    const getStatusConfig = (status) => {
        switch (status) {
            case 'healthy':
                return {
                    color: 'green',
                    label: 'Healthy',
                    icon: <Check className="w-3 h-3" />,
                    gradient: 'from-green-600 to-green-400'
                };
            case 'degraded':
                return {
                    color: 'yellow',
                    label: 'Degraded',
                    icon: <AlertTriangle className="w-3 h-3" />,
                    gradient: 'from-yellow-600 to-yellow-400'
                };
            case 'critical':
                return {
                    color: 'red',
                    label: 'Critical',
                    icon: <X className="w-3 h-3" />,
                    gradient: 'from-red-600 to-red-400'
                };
            default:
                return {
                    color: 'gray',
                    label: 'Unknown',
                    icon: <Clock className="w-3 h-3" />,
                    gradient: 'from-gray-600 to-gray-400'
                };
        }
    };

    const config = getStatusConfig(status);

    return (
        <div className="p-3 rounded-lg bg-dark-700/30 border border-dark-600/50 hover:bg-dark-700/50 transition-colors group">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <div className={`relative flex h-2 w-2`}>
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${config.color}-400 opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 bg-${config.color}-500`}></span>
                    </div>
                    <span className="font-mono text-xs font-bold text-gray-200 group-hover:text-white transition-colors">
                        {tunnel.subdomain}.localhost
                    </span>
                </div>
                <span className={`flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-${config.color}-500/10 text-${config.color}-400 border border-${config.color}-500/20`}>
                    {config.icon} {config.label}
                </span>
            </div>

            {/* Health bar with gradient */}
            <div className="relative h-1.5 bg-dark-800 rounded-full overflow-hidden border border-dark-600/30">
                <div
                    className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${config.gradient} shadow-[0_0_8px_rgba(0,0,0,0.3)]`}
                    style={{ width: `${healthScore}%` }}
                />
            </div>

            {/* Metrics row */}
            <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                <span className="flex items-center gap-1 group-hover:text-gray-400 transition-colors">
                    <Clock className="w-3 h-3 opacity-70" /> {formatUptime(uptime)}
                </span>
                <span className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">
                    <BarChart2 className="w-3 h-3 opacity-70" /> {requestCount} reqs
                </span>
                <span className={`flex items-center gap-1 transition-colors ${errorRate > 0.05 ? 'text-red-400 font-bold' : 'group-hover:text-gray-400'}`}>
                    <XCircle className={`w-3 h-3 opacity-70 ${errorRate > 0.05 ? 'text-red-400' : ''}`} />
                    {(errorRate * 100).toFixed(1)}% err
                </span>
            </div>
        </div>
    );
}

/**
 * Format uptime to readable string
 */
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

export default ConnectionHealthIndicator;
