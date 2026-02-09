/**
 * RequestInspector Component
 * 
 * Detailed view of a single request showing:
 * - Real request headers and body
 * - Real response headers and body
 * - Actual timing information
 * - Copy as cURL option
 * - Replay button
 */

import React, { useState } from 'react';
import JsonViewer from './JsonViewer';
import { API_URL } from '../config';
import {
    Search, RotateCcw, Copy, X, Check, ArrowRight,
    Clock, Globe, Server, Hash, Code
} from 'lucide-react';

function RequestInspector({ request, onClose, onReplay }) {
    // Active tab: 'request' or 'response'
    const [activeTab, setActiveTab] = useState('request');

    // Show headers or body
    const [showSection, setShowSection] = useState('body');

    // Copy status
    const [copyStatus, setCopyStatus] = useState(null);

    /**
     * Copies cURL command to clipboard
     */
    const copyCurlCommand = async () => {
        try {
            const response = await fetch(`${API_URL}/traffic/${request.requestId}/curl`);
            const data = await response.json();
            await navigator.clipboard.writeText(data.curl);
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus(null), 2000);
        } catch (error) {
            console.error('Failed to copy cURL:', error);
            setCopyStatus('Failed');
        }
    };

    /**
     * Decodes base64 body if needed
     */
    const decodeBody = (body) => {
        if (!body) return null;

        // Try base64 decode first
        try {
            const decoded = atob(body);
            // Check if it looks like valid text
            if (decoded && !decoded.includes('\ufffd')) {
                try {
                    // Try to parse as JSON
                    return JSON.parse(decoded);
                } catch {
                    return decoded;
                }
            }
        } catch {
            // Not base64, try direct parse
        }

        // Try direct JSON parse
        try {
            return JSON.parse(body);
        } catch {
            return body;
        }
    };

    // Get request and response data
    const reqData = request.request || {};
    const resData = request.response || {};

    // Decode bodies - handle already parsed and base64 encoded
    const requestBody = reqData.parsedBody || decodeBody(reqData.body);
    const responseBody = resData.parsedBody || decodeBody(resData.body);

    // Calculate content size
    const getBodySize = (body) => {
        if (!body) return '0 B';
        const str = typeof body === 'string' ? body : JSON.stringify(body);
        const bytes = new Blob([str]).size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 shadow-lg shadow-blue-500/5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-dark-600">
                <div className="flex items-center space-x-3">
                    <h2 className="flex items-center text-lg font-semibold text-white gap-2">
                        <Search className="w-5 h-5 text-blue-400" />
                        <span>Request Inspector</span>
                    </h2>
                    <span className="text-xs text-gray-400 font-mono bg-dark-700 px-2 py-0.5 rounded border border-dark-600 flex items-center gap-1">
                        <Hash className="w-3 h-3" /> {request.requestId.substring(0, 8)}...
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onReplay}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-1"
                    >
                        <RotateCcw className="w-3 h-3" /> Replay
                    </button>
                    <button
                        onClick={copyCurlCommand}
                        className="bg-dark-700 hover:bg-dark-600 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-dark-600 flex items-center gap-1 min-w-[90px] justify-center"
                    >
                        {copyStatus ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {copyStatus || 'Copy cURL'}
                    </button>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1 rounded hover:bg-dark-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Summary bar with real data */}
            <div className="bg-dark-700/50 rounded-lg p-3 mb-4 border border-dark-600">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div>
                        <span className="text-gray-500 text-xs block mb-0.5 font-bold uppercase tracking-wider">Method</span>
                        <span className={`font-bold font-mono ${getMethodColor(reqData.method)}`}>
                            {reqData.method}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-gray-500 text-xs block mb-0.5 font-bold uppercase tracking-wider">Path</span>
                        <span className="font-mono text-gray-300 break-all text-xs">
                            {reqData.path}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 text-xs block mb-0.5 font-bold uppercase tracking-wider">Status</span>
                        <span className={`font-bold ${getStatusColor(resData.statusCode)}`}>
                            {resData.statusCode || 'Pending'}
                            {resData.statusCode && <span className="text-xs font-normal text-gray-500 ml-1">({getStatusText(resData.statusCode)})</span>}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 text-xs block mb-0.5 font-bold uppercase tracking-wider">Time</span>
                        <span className="text-yellow-400 font-mono font-bold">
                            {request.responseTime ? `${request.responseTime}ms` : '-'}
                        </span>
                    </div>
                </div>

                {/* Additional info row */}
                <div className="grid grid-cols-3 gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-dark-600/50">
                    <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3 opacity-70" />
                        <span className="text-gray-400 font-mono">{request.subdomain}.localhost</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Server className="w-3 h-3 opacity-70" />
                        <span className="text-gray-400 font-mono">{reqData.clientIp || 'Unknown IP'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 opacity-70" />
                        <span className="text-gray-400">
                            {reqData.timestamp ? new Date(reqData.timestamp).toLocaleTimeString() : '-'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-dark-600 mb-4">
                <TabButton
                    active={activeTab === 'request'}
                    onClick={() => setActiveTab('request')}
                >
                    Request {requestBody && <span className="ml-1 text-xs opacity-60 font-mono">({getBodySize(requestBody)})</span>}
                </TabButton>
                <TabButton
                    active={activeTab === 'response'}
                    onClick={() => setActiveTab('response')}
                >
                    Response {responseBody && <span className="ml-1 text-xs opacity-60 font-mono">({getBodySize(responseBody)})</span>}
                </TabButton>
            </div>

            {/* Section selector */}
            <div className="flex space-x-2 mb-4 bg-dark-900/30 p-1 rounded-lg w-fit">
                <SectionButton
                    active={showSection === 'body'}
                    onClick={() => setShowSection('body')}
                >
                    <Code className="w-3 h-3 mr-1" /> Body
                </SectionButton>
                <SectionButton
                    active={showSection === 'headers'}
                    onClick={() => setShowSection('headers')}
                >
                    Headers <span className="ml-1 opacity-60">({Object.keys(activeTab === 'request' ? reqData.headers || {} : resData.headers || {}).length})</span>
                </SectionButton>
                {activeTab === 'request' && reqData.query && Object.keys(reqData.query).length > 0 && (
                    <SectionButton
                        active={showSection === 'query'}
                        onClick={() => setShowSection('query')}
                    >
                        Query Params
                    </SectionButton>
                )}
            </div>

            {/* Content area */}
            <div className="bg-dark-900 rounded-lg border border-dark-700 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    {activeTab === 'request' ? (
                        showSection === 'body' ? (
                            requestBody ? (
                                <JsonViewer data={requestBody} />
                            ) : (
                                <EmptyState message="No request body" />
                            )
                        ) : showSection === 'headers' ? (
                            <HeadersView headers={reqData.headers} />
                        ) : (
                            <JsonViewer data={reqData.query} />
                        )
                    ) : (
                        showSection === 'body' ? (
                            responseBody ? (
                                <JsonViewer data={responseBody} />
                            ) : (
                                <EmptyState message="No response body" />
                            )
                        ) : (
                            <HeadersView headers={resData.headers} />
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

// Tab button component
function TabButton({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 
                ${active ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-white'}`}
        >
            {children}
        </button>
    );
}

// Section button component
function SectionButton({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center
                ${active ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-gray-400 hover:text-white hover:bg-dark-700'}`}
        >
            {children}
        </button>
    );
}

// Headers view component - shows real headers
function HeadersView({ headers }) {
    if (!headers || Object.keys(headers).length === 0) {
        return <EmptyState message="No headers" />;
    }

    // Sort headers for consistent display
    const sortedHeaders = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));

    return (
        <div className="space-y-1 font-mono text-xs">
            {sortedHeaders.map(([key, value]) => (
                <div key={key} className="flex group hover:bg-dark-800 rounded px-2 py-1 -mx-2 transition-colors">
                    <span className="text-purple-400 min-w-[120px] font-bold text-right mr-3 select-all">{key}</span>
                    <span className="text-gray-300 break-all select-all">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// Empty state component
function EmptyState({ message }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 opacity-50">
            <Code className="w-8 h-8 mb-2" />
            <p className="text-sm">{message}</p>
        </div>
    );
}

// Get color class for HTTP method
function getMethodColor(method) {
    const colors = {
        GET: 'text-green-400',
        POST: 'text-blue-400',
        PUT: 'text-yellow-400',
        PATCH: 'text-orange-400',
        DELETE: 'text-red-400',
        HEAD: 'text-cyan-400',
        OPTIONS: 'text-purple-400',
    };
    return colors[method] || 'text-gray-400';
}

// Get color class for status code
function getStatusColor(status) {
    if (!status) return 'text-gray-400';
    if (status >= 500) return 'text-red-400';
    if (status >= 400) return 'text-yellow-400';
    if (status >= 300) return 'text-cyan-400';
    if (status >= 200) return 'text-green-400';
    return 'text-gray-400';
}

// Get status text
function getStatusText(status) {
    const texts = {
        200: 'OK',
        201: 'Created',
        204: 'No Content',
        301: 'Moved',
        302: 'Found',
        304: 'Not Modified',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        500: 'Server Error',
        502: 'Bad Gateway',
        503: 'Unavailable',
        504: 'Timeout',
    };
    return texts[status] || '';
}

export default RequestInspector;
