/**
 * DiffReplayPanel Component
 * 
 * Live diff replay visualization:
 * - Side-by-side comparison
 * - Status, timing, headers, body diffs
 * - Color-coded changes
 */

import React, { useState } from 'react';
import { API_URL } from '../config';
import {
    GitCompare, X, Play, Zap, AlertTriangle, Check,
    Activity, ArrowRight, Clock, FastForward, Snail,
    FileText, File, RotateCcw
} from 'lucide-react';

function DiffReplayPanel({ request, onClose }) {
    const [isLoading, setIsLoading] = useState(false);
    const [diffResult, setDiffResult] = useState(null);
    const [error, setError] = useState(null);

    /**
     * Execute diff replay
     */
    const executeDiffReplay = async () => {
        if (!request?.requestId) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/replay/${request.requestId}/diff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) throw new Error('Diff replay failed');

            const data = await res.json();
            setDiffResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 shadow-lg shadow-blue-500/5">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-dark-600">
                <h2 className="flex items-center text-lg font-semibold text-white">
                    <GitCompare className="w-5 h-5 mr-2 text-cyan-400" />
                    <span>Live Diff Replay</span>
                </h2>
                {onClose && (
                    <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Request info */}
            <div className="bg-dark-700 rounded-lg p-3 mb-4 border border-dark-600">
                <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${request?.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                        request?.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-purple-500/20 text-purple-400'
                        }`}>
                        {request?.method}
                    </span>
                    <span className="font-mono text-sm text-gray-300 truncate flex-1">
                        {request?.path || request?.url}
                    </span>
                </div>
            </div>

            {/* Execute button */}
            {!diffResult && !isLoading && (
                <button
                    onClick={executeDiffReplay}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Diff Replay</span>
                </button>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin mb-3">
                        <RotateCcw className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div className="text-gray-400 text-sm">Replaying and comparing...</div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Diff Results */}
            {diffResult && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Summary badge */}
                    <div className={`p-4 rounded-lg flex items-center justify-between border ${diffResult.hasChanges
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-green-500/10 border-green-500/30'
                        }`}>
                        <div className="flex items-center gap-2">
                            {diffResult.hasChanges ? (
                                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            ) : (
                                <Check className="w-5 h-5 text-green-400" />
                            )}
                            <span className={`font-medium ${diffResult.hasChanges ? 'text-yellow-400' : 'text-green-400'}`}>
                                {diffResult.hasChanges
                                    ? `${diffResult.diff?.totalChanges} changes detected`
                                    : 'No changes - response identical'}
                            </span>
                        </div>
                        <button
                            onClick={() => setDiffResult(null)}
                            className="text-xs text-gray-500 hover:text-white flex items-center gap-1 hover:underline"
                        >
                            <RotateCcw className="w-3 h-3" /> Replay Again
                        </button>
                    </div>

                    {/* Status diff */}
                    <DiffSection title="Status Code" icon={<Activity className="w-4 h-4" />}>
                        <div className="flex items-center space-x-4">
                            <StatusBadge code={diffResult.original?.statusCode} label="Original" />
                            <ArrowRight className="w-5 h-5 text-gray-600" />
                            <StatusBadge code={diffResult.replay?.statusCode} label="Replay" />
                            {diffResult.diff?.status?.changed && (
                                <span className="text-red-400 text-xs font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                                    CHANGED
                                </span>
                            )}
                        </div>
                    </DiffSection>

                    {/* Timing diff */}
                    <DiffSection title="Response Time" icon={<Clock className="w-4 h-4" />}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="text-center min-w-[60px]">
                                <div className="text-xl font-mono text-yellow-400">
                                    {diffResult.original?.responseTime || 0}<span className="text-xs text-gray-500 ml-1">ms</span>
                                </div>
                                <div className="text-xs text-gray-500">Original</div>
                            </div>
                            <div className="flex-1">
                                <TimingBar
                                    original={diffResult.original?.responseTime || 0}
                                    replay={diffResult.replay?.responseTime || 0}
                                />
                            </div>
                            <div className="text-center min-w-[60px]">
                                <div className={`text-xl font-mono ${(diffResult.replay?.responseTime || 0) < (diffResult.original?.responseTime || 0)
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                    }`}>
                                    {diffResult.replay?.responseTime || 0}<span className="text-xs text-gray-500 ml-1">ms</span>
                                </div>
                                <div className="text-xs text-gray-500">Replay</div>
                            </div>
                        </div>
                        {diffResult.diff?.timing && (
                            <div className="mt-3 text-center text-sm flex justify-center items-center gap-1">
                                {diffResult.diff.timing.faster ? (
                                    <FastForward className="w-4 h-4 text-green-400" />
                                ) : (
                                    <Snail className="w-4 h-4 text-red-400" />
                                )}
                                <span className={diffResult.diff.timing.faster ? 'text-green-400' : 'text-red-400'}>
                                    {Math.abs(diffResult.diff.timing.delta)}ms
                                    ({diffResult.diff.timing.percentChange > 0 ? '+' : ''}{diffResult.diff.timing.percentChange}%)
                                </span>
                            </div>
                        )}
                    </DiffSection>

                    {/* Headers diff */}
                    {diffResult.diff?.headers?.changes?.length > 0 && (
                        <DiffSection title="Headers" icon={<FileText className="w-4 h-4" />}>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {diffResult.diff.headers.changes.map((change, i) => (
                                    <div key={i} className={`p-2 rounded text-xs font-mono border ${change.type === 'added' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                        change.type === 'removed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                            'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                        }`}>
                                        <span className="opacity-70 font-bold mr-2">{change.type.toUpperCase()}</span>
                                        <span className="font-bold text-gray-300">{change.key}:</span>{' '}
                                        {change.type === 'modified' ? (
                                            <div className="ml-4 mt-1 border-l-2 border-dark-600 pl-2">
                                                <div className="line-through opacity-50 text-gray-500">{change.original}</div>
                                                <div className="text-white">↓ {change.replay}</div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 ml-1">{change.value}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </DiffSection>
                    )}

                    {/* Body diff */}
                    {diffResult.diff?.body?.changed && (
                        <DiffSection title="Response Body" icon={<File className="w-4 h-4" />}>
                            <div className="text-sm flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                <span className="text-yellow-400 font-medium">Body changed</span>
                                <span className="text-gray-500 text-xs">
                                    ({diffResult.diff.body.originalLength} → {diffResult.diff.body.replayLength} bytes)
                                </span>
                            </div>
                            {diffResult.diff.body.type === 'json' && (
                                <div className="mt-2 space-y-1 bg-dark-900/50 p-2 rounded border border-dark-600">
                                    {diffResult.diff.body.additions?.map((add, i) => (
                                        <div key={`add-${i}`} className="text-xs text-green-400 font-mono flex gap-2">
                                            <span>+</span>
                                            <span>{add.path}:</span>
                                            <span className="text-gray-400">{JSON.stringify(add.value)}</span>
                                        </div>
                                    ))}
                                    {diffResult.diff.body.removals?.map((rem, i) => (
                                        <div key={`rem-${i}`} className="text-xs text-red-400 font-mono flex gap-2">
                                            <span>-</span>
                                            <span>{rem.path}:</span>
                                            <span className="text-gray-400">{JSON.stringify(rem.value)}</span>
                                        </div>
                                    ))}
                                    {diffResult.diff.body.modifications?.map((mod, i) => (
                                        <div key={`mod-${i}`} className="text-xs text-yellow-400 font-mono flex gap-2">
                                            <span>~</span>
                                            <span>{mod.path}:</span>
                                            <span className="text-gray-500 line-through">{JSON.stringify(mod.original)}</span>
                                            <span className="text-gray-300">→</span>
                                            <span className="text-white">{JSON.stringify(mod.replay)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </DiffSection>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Diff section wrapper
 */
function DiffSection({ title, icon, children }) {
    return (
        <div className="bg-dark-700/50 rounded-lg p-4 border border-dark-600">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                {icon}
                <span>{title}</span>
            </div>
            {children}
        </div>
    );
}

/**
 * Status code badge
 */
function StatusBadge({ code, label }) {
    const getColor = (code) => {
        if (!code) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        if (code < 300) return 'bg-green-500/20 text-green-400 border-green-500/30';
        if (code < 400) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        if (code < 500) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    };

    return (
        <div className="text-center group">
            <div className={`px-4 py-2 rounded-lg text-2xl font-bold font-mono border ${getColor(code)} transition-all group-hover:scale-105`}>
                {code || '—'}
            </div>
            <div className="text-[10px] uppercase font-bold text-gray-600 mt-1">{label}</div>
        </div>
    );
}

/**
 * Timing comparison bar
 */
function TimingBar({ original, replay }) {
    const max = Math.max(original, replay, 1);
    const origWidth = (original / max) * 100;
    const replayWidth = (replay / max) * 100;

    return (
        <div className="space-y-1.5 w-full">
            <div className="h-2 bg-dark-800 rounded-full overflow-hidden w-full relative">
                <div
                    className="h-full bg-yellow-500/80 rounded-full transition-all absolute top-0 left-0"
                    style={{ width: `${origWidth}%` }}
                />
            </div>
            <div className="h-2 bg-dark-800 rounded-full overflow-hidden w-full relative">
                <div
                    className={`h-full rounded-full transition-all absolute top-0 left-0 ${replay < original ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    style={{ width: `${replayWidth}%` }}
                />
            </div>
        </div>
    );
}

export default DiffReplayPanel;
