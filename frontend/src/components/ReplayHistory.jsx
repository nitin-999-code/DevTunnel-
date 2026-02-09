/**
 * ReplayHistory Component
 * 
 * Shows history of replayed requests:
 * - List of past replays
 * - Comparison with original
 * - Quick re-replay option
 */

import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import { History, Trash2, HelpCircle, Clock, Zap, ArrowRight, RotateCcw } from 'lucide-react';

function ReplayHistory({ onSelectReplay }) {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Fetch replay history
     */
    const fetchHistory = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/replay/history?limit=20`);
            const data = await response.json();
            setHistory(data.history || []);
        } catch (error) {
            console.error('Failed to fetch replay history:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Refresh every 5 seconds
    useEffect(() => {
        const interval = setInterval(fetchHistory, 5000);
        return () => clearInterval(interval);
    }, [fetchHistory]);

    /**
     * Clear all history
     */
    const handleClear = async () => {
        try {
            await fetch(`${API_URL}/replay/history`, { method: 'DELETE' });
            setHistory([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    /**
     * Format timestamp
     */
    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    /**
     * Get status badge color
     */
    const getStatusColor = (statusCode) => {
        if (!statusCode) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        if (statusCode >= 500) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (statusCode >= 400) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        return 'bg-green-500/20 text-green-400 border-green-500/30';
    };

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 shadow-lg shadow-purple-500/5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-dark-600">
                <h2 className="flex items-center text-lg font-semibold text-white gap-2">
                    <History className="w-5 h-5 text-purple-400" />
                    <span>Replay History</span>
                </h2>
                {history.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-dark-700 transition-colors"
                        title="Clear History"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <RotateCcw className="w-6 h-6 text-purple-400 animate-spin" />
                        <span className="text-gray-500">Loading history...</span>
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 border-2 border-dashed border-dark-600 rounded-lg">
                        <History className="w-8 h-8 opacity-20 mb-3" />
                        <p className="font-medium">No replays yet</p>
                        <p className="text-xs text-gray-600 mt-1 max-w-[200px] text-center">
                            Select a request and click "Replay" to see it here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {history.map((replay) => (
                            <ReplayHistoryItem
                                key={replay.replayId}
                                replay={replay}
                                onSelect={() => onSelectReplay?.(replay)}
                                formatTime={formatTime}
                                getStatusColor={getStatusColor}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Individual replay history item
 */
function ReplayHistoryItem({ replay, onSelect, formatTime, getStatusColor }) {
    const req = replay.request || {};
    const res = replay.response || {};

    return (
        <div
            onClick={onSelect}
            className="group bg-dark-700/50 rounded-lg p-3 border border-dark-600 hover:border-purple-500/50 hover:bg-dark-700 cursor-pointer transition-all duration-200"
        >
            {/* Top row: method, path, status */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 overflow-hidden">
                    <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${req.method === 'GET' ? 'bg-green-500/10 text-green-400' :
                            req.method === 'POST' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-purple-500/10 text-purple-400'
                        }`}>
                        {req.method}
                    </span>
                    <span className="font-mono text-xs text-gray-300 truncate max-w-[140px] opacity-80 group-hover:opacity-100 transition-opacity">
                        {req.path || '/'}
                    </span>
                </div>
                <div className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(res.statusCode)}`}>
                    {res.statusCode || (res.error ? <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Error</span> : <HelpCircle className="w-3 h-3" />)}
                </div>
            </div>

            {/* Bottom row: time, duration, modifications */}
            <div className="flex items-center justify-between text-[10px] text-gray-500">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(replay.replayedAt)}</span>
                    <span className="flex items-center gap-1 font-mono text-gray-400"><Zap className="w-3 h-3 text-yellow-500/50" /> {replay.duration}ms</span>
                </div>
                {replay.modifications && (
                    <span className="text-purple-400 flex items-center gap-1 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                        Modified <ArrowRight className="w-2 h-2" />
                    </span>
                )}
            </div>
        </div>
    );
}

export default ReplayHistory;
