/**
 * SecurityPanel Component
 * 
 * Dashboard panel for security management:
 * - Rate limit status
 * - IP blacklist/whitelist
 * - API key management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import {
    Shield, RefreshCw, Lock, Unlock, Key, Plus,
    CheckCircle, XCircle, AlertTriangle, Globe, X, Check
} from 'lucide-react';

function SecurityPanel() {
    const [securityStatus, setSecurityStatus] = useState(null);
    const [apiKeys, setApiKeys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Form states
    const [newIp, setNewIp] = useState('');
    const [newKeyName, setNewKeyName] = useState('');
    const [message, setMessage] = useState(null);

    /**
     * Fetch security status
     */
    const fetchStatus = useCallback(async () => {
        try {
            const [statusRes, keysRes] = await Promise.all([
                fetch(`${API_URL}/security/status`),
                fetch(`${API_URL}/auth/keys`),
            ]);

            const status = await statusRes.json();
            const keys = await keysRes.json();

            setSecurityStatus(status);
            setApiKeys(keys.keys || []);
        } catch (error) {
            console.error('Failed to fetch security status:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    /**
     * Add IP to blacklist
     */
    const handleBlacklist = async () => {
        if (!newIp.trim()) return;

        try {
            await fetch(`${API_URL}/security/blacklist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: newIp }),
            });
            setMessage({ type: 'success', text: `IP ${newIp} blacklisted` });
            setNewIp('');
            fetchStatus();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to blacklist IP' });
        }
    };

    /**
     * Add IP to whitelist
     */
    const handleWhitelist = async () => {
        if (!newIp.trim()) return;

        try {
            await fetch(`${API_URL}/security/whitelist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: newIp }),
            });
            setMessage({ type: 'success', text: `IP ${newIp} whitelisted` });
            setNewIp('');
            fetchStatus();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to whitelist IP' });
        }
    };

    /**
     * Clear all blocks
     */
    const handleClearBlocks = async () => {
        try {
            await fetch(`${API_URL}/security/unblock`, { method: 'POST' });
            setMessage({ type: 'success', text: 'All blocks cleared' });
            fetchStatus();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to clear blocks' });
        }
    };

    /**
     * Create new API key
     */
    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;

        try {
            const res = await fetch(`${API_URL}/auth/keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName }),
            });
            const data = await res.json();

            // Show the new key (only time it's visible)
            alert(`New API Key created:\n\n${data.apiKey}\n\nCopy this now - it won't be shown again!`);
            setNewKeyName('');
            fetchStatus();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to create API key' });
        }
    };

    if (isLoading) {
        return (
            <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                    <span className="text-gray-500">Loading security status...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 shadow-lg shadow-blue-500/5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-dark-600">
                <h2 className="flex items-center text-lg font-semibold text-white gap-2">
                    <Shield className="w-6 h-6 text-blue-400" />
                    <span>Security</span>
                </h2>
                <button
                    onClick={fetchStatus}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg mb-4 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-dark-600 pb-2 mb-4 overflow-x-auto">
                {[
                    { id: 'overview', label: 'Overview', icon: <Shield className="w-4 h-4" /> },
                    { id: 'ip-management', label: 'IP Management', icon: <Globe className="w-4 h-4" /> },
                    { id: 'api-keys', label: 'API Keys', icon: <Key className="w-4 h-4" /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === tab.id
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-dark-700 border border-transparent'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'overview' && (
                    <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                label="Whitelisted IPs"
                                value={securityStatus?.security?.whitelistCount || 0}
                                color="green"
                                icon={<CheckCircle className="w-5 h-5" />}
                            />
                            <StatCard
                                label="Blacklisted IPs"
                                value={securityStatus?.security?.blacklistCount || 0}
                                color="red"
                                icon={<XCircle className="w-5 h-5" />}
                            />
                            <StatCard
                                label="Blocked IPs"
                                value={securityStatus?.security?.blockedIpCount || 0}
                                color="yellow"
                                icon={<Lock className="w-5 h-5" />}
                            />
                            <StatCard
                                label="Rate Limit"
                                value={`${securityStatus?.rateLimit?.requestsPerMinute || 0}/min`}
                                color="blue"
                                icon={<Shield className="w-5 h-5" />}
                            />
                        </div>

                        {/* Quick Actions */}
                        <div className="pt-4 border-t border-dark-600">
                            <button
                                onClick={handleClearBlocks}
                                className="w-full py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 border border-dark-500 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                                <Unlock className="w-4 h-4" /> Clear All Temporary Blocks
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'ip-management' && (
                    <div className="space-y-4 h-full flex flex-col">
                        {/* IP Input */}
                        <div className="p-4 bg-dark-700/30 rounded-lg border border-dark-600">
                            <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">IP Address Configuration</label>
                            <input
                                type="text"
                                value={newIp}
                                onChange={(e) => setNewIp(e.target.value)}
                                placeholder="192.168.1.100"
                                className="w-full bg-dark-800 text-white px-3 py-2.5 rounded-lg text-sm font-mono border border-dark-600 focus:border-blue-500 outline-none mb-3 placeholder-dark-500"
                            />

                            {/* Actions */}
                            <div className="flex space-x-3">
                                <button
                                    onClick={handleWhitelist}
                                    className="flex-1 py-2 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Whitelist
                                </button>
                                <button
                                    onClick={handleBlacklist}
                                    className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" /> Blacklist
                                </button>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3 text-xs text-blue-300">
                            <div className="mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /></div>
                            <div>
                                <p className="font-bold mb-1">Access Control Policies</p>
                                <ul className="space-y-1 opacity-80 list-disc list-inside">
                                    <li>Whitelisted IPs bypass rate limits completely.</li>
                                    <li>Blacklisted IPs are blocked at the perimeter.</li>
                                    <li>Other IPs are subject to standard rate limiting.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'api-keys' && (
                    <div className="space-y-4 h-full flex flex-col">
                        {/* Create Key */}
                        <div className="flex space-x-2">
                            <div className="relative flex-1">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    placeholder="Key name (e.g., Production)"
                                    className="w-full pl-9 pr-3 py-2.5 bg-dark-700 text-white rounded-lg text-sm border border-dark-600 focus:border-blue-500 outline-none placeholder-dark-500"
                                />
                            </div>
                            <button
                                onClick={handleCreateKey}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
                            >
                                <Plus className="w-4 h-4" /> Create
                            </button>
                        </div>

                        {/* Key List */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {apiKeys.length === 0 ? (
                                <div className="h-32 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-dark-600 rounded-lg">
                                    <Key className="w-8 h-8 opacity-20 mb-2" />
                                    <p>No API keys generated</p>
                                </div>
                            ) : (
                                apiKeys.map((key, i) => (
                                    <div key={i} className="bg-dark-700/50 rounded-lg p-3 border border-dark-600 hover:border-dark-500 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-gray-300 flex items-center gap-2">
                                                <Key className="w-3 h-3 text-blue-400" /> {key.name}
                                            </span>
                                            <span className="bg-dark-900/50 px-2 py-0.5 rounded text-xs font-mono text-gray-500 border border-dark-700">
                                                {key.keyPreview}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 flex justify-between mt-2">
                                            <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                                            <span className="text-green-400 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Active
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Stat card component
 */
function StatCard({ label, value, color, icon }) {
    const colors = {
        green: 'text-green-400 bg-green-500/10 border-green-500/20',
        red: 'text-red-400 bg-red-500/10 border-red-500/20',
        yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    };

    return (
        <div className={`rounded-xl p-4 text-center border ${colors[color]} flex flex-col items-center justify-center transition-transform hover:scale-105`}>
            {icon && <div className="mb-2 opacity-80">{icon}</div>}
            <div className={`text-2xl font-bold font-mono tracking-tight`}>{value}</div>
            <div className="text-[10px] uppercase font-bold opacity-60 mt-1">{label}</div>
        </div>
    );
}

export default SecurityPanel;
