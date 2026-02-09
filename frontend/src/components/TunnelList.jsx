/**
 * TunnelList Component
 * 
 * Shows all active tunnels with:
 * - Public URL with copy button
 * - QR code button for mobile access
 * - Local port
 * - Request count
 * - Uptime
 */

import React from 'react';
import { RefreshCw, Copy, Smartphone, ArrowRight, Link, Globe } from 'lucide-react';

function TunnelList({ tunnels, onRefresh, onShowQR }) {
    /**
     * Formats uptime from milliseconds to readable string
     */
    const formatUptime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    /**
     * Copies URL to clipboard
     */
    const copyUrl = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    };

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 h-full flex flex-col shadow-lg shadow-blue-500/5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-dark-700 pb-2">
                <h2 className="font-semibold text-lg text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" />
                    <span>Active Tunnels</span>
                </h2>
                <button
                    onClick={onRefresh}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
                    title="Refresh List"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Tunnel List */}
            {tunnels.length === 0 ? (
                <div className="text-center py-8 flex-1 flex flex-col justify-center items-center opacity-50">
                    <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center mb-3">
                        <Link className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-gray-400 font-medium">No active tunnels</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Start a tunnel using the CLI
                    </p>
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                    {tunnels.map((tunnel) => (
                        <TunnelItem
                            key={tunnel.tunnelId}
                            tunnel={tunnel}
                            formatUptime={formatUptime}
                            onCopyUrl={copyUrl}
                            onShowQR={onShowQR}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Individual tunnel item component
 */
function TunnelItem({ tunnel, formatUptime, onCopyUrl, onShowQR }) {
    // Generate URL based on subdomain (assuming localhost environment for this demo)
    // In production, this would be the actual tunnel URL
    const publicUrl = `http://${tunnel.subdomain}.localhost:3000`;

    return (
        <div className="bg-dark-700/50 rounded-lg p-3 hover:bg-dark-700 transition-all border border-dark-600 hover:border-dark-500 group">
            {/* Subdomain and status */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </div>
                    <span className="font-mono text-sm text-white font-bold tracking-tight">
                        {tunnel.subdomain}
                    </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-gray-500 bg-dark-800/80 px-2 py-0.5 rounded border border-dark-600">
                    {formatUptime(tunnel.uptime)}
                </span>
            </div>

            {/* URL and action buttons */}
            <div className="flex items-center space-x-2 mb-3 bg-dark-900/50 p-2 rounded border border-dark-700/50 group-hover:border-dark-600 transition-colors">
                <Link className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="font-mono text-xs text-gray-400 truncate flex-1 select-all hover:text-gray-300 transition-colors">
                    {publicUrl}
                </span>
                <div className="flex items-center gap-1 border-l border-dark-700 pl-2 ml-1">
                    <button
                        onClick={() => onCopyUrl(publicUrl)}
                        className="text-gray-400 hover:text-white p-1 hover:bg-dark-700 rounded transition-colors"
                        title="Copy URL"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    {onShowQR && (
                        <button
                            onClick={() => onShowQR(tunnel)}
                            className="text-purple-400 hover:text-purple-300 p-1 hover:bg-purple-500/10 rounded transition-colors"
                            title="Show QR Code"
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between text-[10px] text-gray-500 px-1 font-mono uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-600">Local:</span>
                    <span className="text-gray-400 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        :{tunnel.localPort}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-400">{tunnel.requestCount}</span> reqs
                </div>
            </div>
        </div>
    );
}

export default TunnelList;
