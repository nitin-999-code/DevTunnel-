/**
 * ReplayPanel Component
 * 
 * Panel for replaying captured requests through the real tunnel pipeline:
 * - Shows original request details with real stored data
 * - Allows editing before replay
 * - Replays through WebSocket tunnel to CLI client
 * - Displays real replay results from local server
 */

import React, { useState } from 'react';
import { API_URL } from '../config';
import JsonEditor from './JsonEditor';
import JsonViewer from './JsonViewer';
import {
    RotateCcw, Copy, X, ArrowLeft, Play, Loader,
    Check, XCircle, Zap, Link as LinkIcon, AlertCircle
} from 'lucide-react';

function ReplayPanel({ request, onClose, onReplayComplete }) {
    // Editable request state
    const [method, setMethod] = useState(request.request?.method || 'GET');
    const [path, setPath] = useState(request.request?.path || '/');
    const [headers, setHeaders] = useState(request.request?.headers || {});
    const [body, setBody] = useState(
        request.request?.parsedBody ||
        decodeBody(request.request?.body) ||
        ''
    );

    // UI state
    const [isReplaying, setIsReplaying] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('edit');

    /**
     * Decode base64 body if needed
     */
    function decodeBody(body) {
        if (!body) return null;
        try {
            const decoded = atob(body);
            try {
                return JSON.parse(decoded);
            } catch {
                return decoded;
            }
        } catch {
            try {
                return JSON.parse(body);
            } catch {
                return body;
            }
        }
    }

    /**
     * Execute replay through real tunnel pipeline
     */
    const handleReplay = async () => {
        setIsReplaying(true);
        setError(null);
        setResult(null);

        try {
            // Build modifications object
            const modifications = {};

            if (method !== request.request?.method) {
                modifications.method = method;
            }
            if (path !== request.request?.path) {
                modifications.path = path;
            }
            if (JSON.stringify(headers) !== JSON.stringify(request.request?.headers)) {
                modifications.headers = headers;
            }

            const originalBody = request.request?.parsedBody || decodeBody(request.request?.body);
            if (JSON.stringify(body) !== JSON.stringify(originalBody)) {
                modifications.body = body;
            }

            // Send replay request - goes through real tunnel
            const response = await fetch(`${API_URL}/replay/${request.requestId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modifications }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Replay failed');
            }

            setResult(data);
            setActiveTab('result');

            if (onReplayComplete) {
                onReplayComplete(data);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsReplaying(false);
        }
    };

    /**
     * Copy curl command
     */
    const handleCopyCurl = async () => {
        try {
            const response = await fetch(`${API_URL}/traffic/${request.requestId}/curl`);
            const data = await response.json();
            await navigator.clipboard.writeText(data.curl);
        } catch (err) {
            console.error('Failed to copy cURL:', err);
        }
    };

    /**
     * Reset to original values
     */
    const handleReset = () => {
        setMethod(request.request?.method || 'GET');
        setPath(request.request?.path || '/');
        setHeaders(request.request?.headers || {});
        setBody(request.request?.parsedBody || decodeBody(request.request?.body) || '');
        setResult(null);
        setError(null);
    };

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 shadow-lg shadow-blue-500/5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-dark-600">
                <div className="flex items-center space-x-3">
                    <h2 className="flex items-center text-lg font-semibold text-white gap-2">
                        <RotateCcw className="w-5 h-5 text-blue-400" />
                        <span>Replay Request</span>
                    </h2>
                    <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Live Tunnel
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleCopyCurl}
                        className="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 border border-dark-600"
                    >
                        <Copy className="w-3 h-3" /> Copy cURL
                    </button>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded hover:bg-dark-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Original request info */}
            <div className="bg-dark-700/50 rounded-lg p-3 mb-4 border border-dark-600 text-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Original</span>
                </div>
                <div className="h-4 w-px bg-dark-600" />
                <div>
                    <span className={`font-mono font-bold ${request.request?.method === 'GET' ? 'text-green-400' :
                            request.request?.method === 'POST' ? 'text-blue-400' :
                                'text-purple-400'
                        }`}>{request.request?.method}</span>
                    <span className="text-gray-300 mx-2 font-mono">{request.request?.path}</span>
                </div>
                <div className="h-4 w-px bg-dark-600" />
                <div>
                    <span className={request.response?.statusCode >= 400 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                        {request.response?.statusCode}
                    </span>
                </div>
                <div className="h-4 w-px bg-dark-600" />
                <div>
                    <span className="font-mono text-cyan-400 text-xs">{request.subdomain}.localhost</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-dark-600 mb-4">
                <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'edit'
                            ? 'text-blue-400 border-blue-400'
                            : 'text-gray-400 border-transparent hover:text-white'
                        }`}
                >
                    Edit Request
                </button>
                <button
                    onClick={() => setActiveTab('result')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'result'
                            ? 'text-blue-400 border-blue-400'
                            : 'text-gray-400 border-transparent hover:text-white'
                        }`}
                    disabled={!result}
                >
                    Result {result && (
                        result.success
                            ? <Check className="w-3 h-3 text-green-400" />
                            : <XCircle className="w-3 h-3 text-red-400" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === 'edit' ? (
                    <div className="space-y-4">
                        {/* Method and Path */}
                        <div className="flex space-x-3">
                            <div className="w-32">
                                <label className="block text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Method</label>
                                <select
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    className="w-full bg-dark-700 text-white px-3 py-2 rounded-lg text-sm border border-dark-600 focus:border-blue-500 outline-none appearance-none"
                                >
                                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Path</label>
                                <input
                                    type="text"
                                    value={path}
                                    onChange={(e) => setPath(e.target.value)}
                                    className="w-full bg-dark-700 text-white px-3 py-2 rounded-lg text-sm font-mono border border-dark-600 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Body Editor */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Request Body</label>
                            <div className="border border-dark-600 rounded-lg overflow-hidden">
                                <JsonEditor value={body} onChange={setBody} />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex space-x-3 pt-2">
                            <button
                                onClick={handleReplay}
                                disabled={isReplaying}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isReplaying ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        <span>Replaying...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 fill-current" />
                                        <span>Replay Request</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg font-medium transition-colors border border-dark-600"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                ) : (
                    // Result tab
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {result && (
                            <>
                                {/* Result summary */}
                                <div className={`rounded-lg p-4 border ${result.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                    <div className="flex flex-wrap items-center gap-6 text-sm">
                                        <div>
                                            <span className="text-gray-500 text-xs block mb-0.5">Status</span>
                                            <span className={`font-bold text-lg ${result.response?.statusCode >= 400 ? 'text-red-400' : 'text-green-400'}`}>
                                                {result.response?.statusCode || 'Error'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs block mb-0.5">Duration</span>
                                            <span className="text-yellow-400 font-mono text-lg">{result.duration}<span className="text-xs ml-0.5">ms</span></span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs block mb-0.5">Route</span>
                                            <span className={`font-mono flex items-center gap-1 ${result.replayedVia === 'tunnel' ? 'text-cyan-400' : 'text-orange-400'}`}>
                                                {result.replayedVia === 'tunnel' ? <Zap className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                                                {result.replayedVia === 'tunnel' ? 'WebSocket Tunnel' : 'Direct HTTP'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Replay ID */}
                                <div className="text-xs text-gray-500 mono bg-dark-900/50 p-2 rounded border border-dark-700 flex justify-between items-center">
                                    <span>Replay ID</span>
                                    <span className="font-mono text-gray-400">{result.replayId}</span>
                                </div>

                                {/* Response headers */}
                                {result.response?.headers && (
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Response Headers</label>
                                        <div className="bg-dark-900 rounded-lg p-3 max-h-32 overflow-auto border border-dark-700">
                                            <div className="space-y-1 text-xs font-mono">
                                                {Object.entries(result.response.headers).slice(0, 8).map(([key, value]) => (
                                                    <div key={key} className="flex gap-2">
                                                        <span className="text-purple-400 min-w-[100px] text-right">{key}:</span>
                                                        <span className="text-gray-300 break-all">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Response body */}
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Response Body</label>
                                    <div className="bg-dark-900 rounded-lg border border-dark-700 max-h-64 overflow-auto">
                                        {result.response?.body ? (
                                            <JsonViewer data={result.response.body} />
                                        ) : result.error ? (
                                            <div className="p-4 text-red-400">{result.error}</div>
                                        ) : (
                                            <div className="p-4 text-gray-500 italic">No response body</div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex space-x-3 pt-2">
                                    <button
                                        onClick={() => setActiveTab('edit')}
                                        className="flex-1 bg-dark-700 hover:bg-dark-600 text-gray-300 py-2.5 rounded-lg font-medium transition-colors border border-dark-600 flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Edit & Replay Again
                                    </button>
                                    <button
                                        onClick={handleReplay}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" /> Replay Same
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReplayPanel;
