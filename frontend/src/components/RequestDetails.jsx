/**
 * Request Details Component
 * 
 * Displays full request/response details in a drawer or panel
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Inbox, Clock, Download, Upload, Globe, Server, Code, FileText } from 'lucide-react';
import JsonViewer from './JsonViewer';

// Tab button component
function TabButton({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2
                      ${active
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'}`}
        >
            {children}
        </button>
    );
}

// Info row component
function InfoRow({ label, value, mono = false }) {
    return (
        <div className="flex items-start gap-4 py-2 border-b border-dark-600 last:border-0 hover:bg-dark-700/30 px-2 rounded -mx-2 transition-colors">
            <span className="text-gray-500 text-sm min-w-[100px] font-medium">{label}</span>
            <span className={`flex-1 text-sm ${mono ? 'font-mono text-cyan-400' : 'text-gray-200'} break-all`}>
                {value || '-'}
            </span>
        </div>
    );
}

// Status badge
function StatusBadge({ status }) {
    const getStatusStyle = () => {
        if (status >= 200 && status < 300) return 'bg-green-500/20 text-green-400 border-green-500/50';
        if (status >= 300 && status < 400) return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
        if (status >= 400 && status < 500) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        if (status >= 500) return 'bg-red-500/20 text-red-400 border-red-500/50';
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    };

    return (
        <span className={`px-2.5 py-0.5 rounded text-xs font-mono border ${getStatusStyle()}`}>
            {status}
        </span>
    );
}

// Method badge
function MethodBadge({ method }) {
    const colors = {
        GET: 'text-green-400',
        POST: 'text-blue-400',
        PUT: 'text-yellow-400',
        PATCH: 'text-orange-400',
        DELETE: 'text-red-400',
    };

    return (
        <span className={`font-mono font-bold text-sm ${colors[method] || 'text-gray-400'}`}>
            {method}
        </span>
    );
}

// Headers display
function HeadersDisplay({ headers }) {
    if (!headers || Object.keys(headers).length === 0) {
        return <div className="text-gray-500 text-sm italic">No headers</div>;
    }

    return (
        <div className="bg-dark-900 rounded-lg border border-dark-600 overflow-hidden text-xs">
            <div className="divide-y divide-dark-600">
                {Object.entries(headers).map(([key, value]) => (
                    <div key={key} className="flex group hover:bg-dark-800 transition-colors">
                        <div className="w-1/3 px-4 py-2 bg-dark-800/50 text-cyan-400 font-mono truncate border-r border-dark-700">
                            {key}
                        </div>
                        <div className="flex-1 px-4 py-2 text-gray-300 font-mono break-all group-hover:text-white">
                            {value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Body display
function BodyDisplay({ body, contentType }) {
    const [copied, setCopied] = useState(false);

    if (!body) {
        return <div className="text-gray-500 text-sm italic">No body content</div>;
    }

    const handleCopy = async () => {
        const text = typeof body === 'object' ? JSON.stringify(body, null, 2) : body;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Try to parse and display as JSON
    let jsonBody = body;
    if (typeof body === 'string') {
        try {
            jsonBody = JSON.parse(body);
        } catch {
            // Not JSON, display as text
            return (
                <div className="relative group">
                    <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-dark-700 text-gray-400 
                                 hover:text-white hover:bg-dark-600 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <pre className="bg-dark-900 rounded-lg border border-dark-600 p-4 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-[500px]">
                        {body}
                    </pre>
                </div>
            );
        }
    }

    return (
        <div className="relative group">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 z-10 px-2 py-1 text-xs rounded bg-dark-700 text-gray-400 
                         hover:text-white hover:bg-dark-600 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
            >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
            </button>
            <div className="max-h-[500px] overflow-y-auto rounded-lg border border-dark-600">
                <JsonViewer data={jsonBody} />
            </div>
        </div>
    );
}

// Timing display
function TimingDisplay({ request }) {
    const timings = [
        { label: 'DNS Lookup', value: request.dns || 0, color: 'cyan', icon: Globe },
        { label: 'TCP Connect', value: request.connect || 0, color: 'green', icon: Server },
        { label: 'TLS Handshake', value: request.tls || 0, color: 'purple', icon: Shield },
        { label: 'Time to First Byte', value: request.ttfb || 0, color: 'yellow', icon: Clock },
        { label: 'Content Download', value: request.download || 0, color: 'orange', icon: Download },
        { label: 'Total', value: request.responseTime || 0, color: 'red', icon: Activity },
    ];

    const maxTime = Math.max(...timings.map(t => t.value), 1);

    return (
        <div className="space-y-4">
            {timings.map(timing => {
                const Icon = timing.icon || Activity;
                return (
                    <div key={timing.label}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400 flex items-center gap-2">
                                <Icon className={`w-3 h-3 text-${timing.color}-400`} />
                                {timing.label}
                            </span>
                            <span className="text-gray-200 font-mono">{timing.value}ms</span>
                        </div>
                        <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full bg-${timing.color}-500`}
                                initial={{ width: 0 }}
                                animate={{ width: `${(timing.value / maxTime) * 100}%` }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                style={{
                                    backgroundColor: timing.color === 'cyan' ? '#06b6d4' :
                                        timing.color === 'green' ? '#10b981' :
                                            timing.color === 'purple' ? '#8b5cf6' :
                                                timing.color === 'yellow' ? '#f59e0b' :
                                                    timing.color === 'orange' ? '#f97316' : '#ef4444'
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Helper icons for timing
function Shield(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>; }
function Activity(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>; }

export default function RequestDetails({ request }) {
    const [activeTab, setActiveTab] = useState('overview');

    if (!request) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <div className="w-16 h-16 bg-dark-700/50 rounded-full flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8 text-gray-600" />
                </div>
                <div className="text-lg font-medium text-gray-400">No request selected</div>
                <div className="text-sm text-gray-600">Select a request from the list to view details</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between bg-dark-800/50 p-4 rounded-xl border border-dark-600/50">
                <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-3 mb-2">
                        <MethodBadge method={request.method} />
                        <StatusBadge status={request.statusCode} />
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(request.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                    <div className="text-sm font-mono text-gray-200 break-all bg-dark-900 px-2 py-1 rounded inline-block max-w-full truncate">
                        {request.path}
                    </div>
                </div>
                <div className="text-right whitespace-nowrap">
                    <div className="text-2xl font-bold text-white flex items-center justify-end gap-1">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        {request.responseTime || 0}<span className="text-xs font-normal text-gray-500 mt-2">ms</span>
                    </div>
                    <div className="text-xs text-gray-500">Latency</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-dark-600 pb-2 overflow-x-auto">
                <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
                    <FileText className="w-4 h-4" /> Overview
                </TabButton>
                <TabButton active={activeTab === 'request'} onClick={() => setActiveTab('request')}>
                    <Upload className="w-4 h-4" /> Request
                </TabButton>
                <TabButton active={activeTab === 'response'} onClick={() => setActiveTab('response')}>
                    <Download className="w-4 h-4" /> Response
                </TabButton>
                <TabButton active={activeTab === 'timing'} onClick={() => setActiveTab('timing')}>
                    <Clock className="w-4 h-4" /> Timing
                </TabButton>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <InfoRow label="Full URL" value={request.url || request.path} mono />
                        <InfoRow label="Method" value={request.method} />
                        <InfoRow label="Status" value={`${request.statusCode} ${request.statusText || ''}`} />
                        <InfoRow label="Response Time" value={`${request.responseTime || 0}ms`} />
                        <InfoRow label="Request Size" value={`${request.requestSize || 0} bytes`} />
                        <InfoRow label="Response Size" value={`${request.responseSize || 0} bytes`} />
                        <InfoRow label="Tunnel ID" value={request.tunnelId} mono />
                        <InfoRow label="Client IP" value={request.clientIp} mono />
                    </motion.div>
                )}

                {activeTab === 'request' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Code className="w-3 h-3" /> Headers
                            </h4>
                            <HeadersDisplay headers={request.requestHeaders || request.headers} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Body
                            </h4>
                            <BodyDisplay body={request.requestBody || request.body} />
                        </div>
                    </motion.div>
                )}

                {activeTab === 'response' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Code className="w-3 h-3" /> Headers
                            </h4>
                            <HeadersDisplay headers={request.responseHeaders} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Body
                            </h4>
                            <BodyDisplay body={request.responseBody} />
                        </div>
                    </motion.div>
                )}

                {activeTab === 'timing' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-dark-800/50 rounded-xl p-5 border border-dark-600/50"
                    >
                        <TimingDisplay request={request} />
                    </motion.div>
                )}
            </div>
        </div>
    );
}

// Icon helpers
function Zap(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>; }

