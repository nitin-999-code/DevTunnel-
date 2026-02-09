/**
 * TrafficFeed Component
 * 
 * Real-time list of HTTP requests showing:
 * - Method and path
 * - Status code
 * - Response time
 * - Timestamp
 */

import React from 'react';
import {
    Activity, Trash2, Clock, Globe, ArrowRight,
    Search, Server, Zap, CheckCircle, AlertTriangle, XCircle
} from 'lucide-react';

function TrafficFeed({ traffic, onSelectRequest, selectedRequestId, onClear }) {
    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-0 shadow-lg shadow-cyan-500/5 h-full flex flex-col overflow-hidden">
            {/* Header with actions */}
            <div className="flex items-center justify-between p-4 border-b border-dark-600 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                    <div className="bg-green-500/10 p-1.5 rounded-lg border border-green-500/20">
                        <Activity className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-none">Traffic Feed</h2>
                        <div className="flex items-center mt-1 space-x-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Live Monitoring</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onClear}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-700/50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-500/20"
                        title="Clear Traffic Log"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Traffic table container */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {traffic.length === 0 ? (
                    // Empty state
                    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                        <div className="w-16 h-16 rounded-full bg-dark-700/50 flex items-center justify-center mb-4 border border-dark-600">
                            <Search className="w-8 h-8 text-gray-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-300 mb-2">No requests captured</h3>
                        <p className="text-sm text-gray-500 max-w-xs">
                            Requests sent to your tunnel URL will appear here in real-time.
                        </p>
                    </div>
                ) : (
                    // Request list
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-dark-700/30 sticky top-0 z-10 backdrop-blur-md">
                            <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-dark-600">
                                <th className="px-4 py-3 w-20">Method</th>
                                <th className="px-4 py-3">Path</th>
                                <th className="px-4 py-3 w-24 text-center">Status</th>
                                <th className="px-4 py-3 w-24 text-right">Time</th>
                                <th className="px-4 py-3 w-32 hidden md:table-cell">Tunnel</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700/50">
                            {traffic.map((request) => (
                                <TrafficRow
                                    key={request.requestId}
                                    request={request}
                                    isSelected={request.requestId === selectedRequestId}
                                    onClick={() => onSelectRequest(request)}
                                />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

/**
 * Individual traffic row component
 */
function TrafficRow({ request, isSelected, onClick }) {
    // Get method color based on HTTP method
    const getMethodColor = (method) => {
        const colors = {
            GET: 'bg-green-500/10 text-green-400 border-green-500/20',
            POST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            PUT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            PATCH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
        return colors[method] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

    // Get status badge style based on status code
    const getStatusIcon = (status) => {
        if (!status) return <Clock className="w-3 h-3 text-gray-400" />;
        if (status >= 500) return <XCircle className="w-3 h-3 text-red-400" />;
        if (status >= 400) return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
        if (status >= 300) return <ArrowRight className="w-3 h-3 text-blue-400" />;
        if (status >= 200) return <CheckCircle className="w-3 h-3 text-green-400" />;
        return <Clock className="w-3 h-3 text-gray-400" />;
    };

    const getStatusColor = (status) => {
        if (!status) return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        if (status >= 500) return 'bg-red-500/10 text-red-400 border-red-500/20';
        if (status >= 400) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        if (status >= 300) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (status >= 200) return 'bg-green-500/10 text-green-400 border-green-500/20';
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

    // Truncate path if too long
    const truncatePath = (path, maxLength = 50) => {
        if (!path) return '/';
        if (path.length <= maxLength) return path;
        return path.substring(0, maxLength) + '...';
    };

    return (
        <tr
            onClick={onClick}
            className={`
                cursor-pointer transition-all duration-200 group
                ${isSelected
                    ? 'bg-blue-500/10 hover:bg-blue-500/20'
                    : 'hover:bg-dark-700/50'
                }
            `}
        >
            {/* Method */}
            <td className="px-4 py-3 align-middle">
                <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-bold border ${getMethodColor(request.request?.method)} w-16 text-center shadow-sm`}>
                    {request.request?.method || '-'}
                </span>
            </td>

            {/* Path */}
            <td className="px-4 py-3 align-middle">
                <div className="flex items-center space-x-2 overflow-hidden">
                    <span className="text-gray-500">
                        <Globe className="w-3 h-3 opacity-50" />
                    </span>
                    <span className={`font-mono text-xs truncate transition-colors ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`} title={request.request?.path}>
                        {truncatePath(request.request?.path)}
                    </span>
                </div>
            </td>

            {/* Status */}
            <td className="px-4 py-3 align-middle text-center">
                {request.response?.statusCode ? (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(request.response.statusCode)}`}>
                        {getStatusIcon(request.response.statusCode)}
                        {request.response.statusCode}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20 animate-pulse">
                        <Clock className="w-3 h-3" />
                        Pending
                    </span>
                )}
            </td>

            {/* Response Time */}
            <td className="px-4 py-3 align-middle text-right">
                <span className="font-mono text-xs text-gray-400 group-hover:text-gray-300">
                    {request.responseTime ? (
                        <span className={request.responseTime > 500 ? 'text-yellow-500' : request.responseTime > 1000 ? 'text-red-500' : ''}>
                            {request.responseTime}ms
                        </span>
                    ) : '-'}
                </span>
            </td>

            {/* Tunnel subdomain */}
            <td className="px-4 py-3 align-middle hidden md:table-cell">
                <span className="flex items-center gap-1.5 font-mono text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                    <Zap className="w-3 h-3 opacity-50" />
                    {request.subdomain}
                </span>
            </td>
        </tr>
    );
}

export default TrafficFeed;
