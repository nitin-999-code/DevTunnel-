/**
 * WebhooksPanel Component
 * 
 * Manages webhook subscriptions:
 * - Create new webhooks
 * - View delivery history
 * - Retry failed deliveries
 */

import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import {
    Webhook, RefreshCw, Plus, Trash2, Check, AlertCircle,
    RotateCcw, History, FileText, Globe, Clock, CheckCircle
} from 'lucide-react';

function WebhooksPanel() {
    const [subscriptions, setSubscriptions] = useState([]);
    const [history, setHistory] = useState([]);
    const [deadLetter, setDeadLetter] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('subscriptions');

    // Form state
    const [newUrl, setNewUrl] = useState('');
    const [message, setMessage] = useState(null);

    /**
     * Fetch webhook data
     */
    const fetchData = useCallback(async () => {
        try {
            const [subsRes, histRes, dlRes] = await Promise.all([
                fetch(`${API_URL}/webhooks`),
                fetch(`${API_URL}/webhooks/history?limit=20`),
                fetch(`${API_URL}/webhooks/deadletter`),
            ]);

            const subs = await subsRes.json();
            const hist = await histRes.json();
            const dl = await dlRes.json();

            setSubscriptions(subs.subscriptions || []);
            setHistory(hist.history || []);
            setDeadLetter(dl.queue || []);
        } catch (error) {
            console.error('Failed to fetch webhooks:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    /**
     * Create new webhook
     */
    const handleCreate = async () => {
        if (!newUrl.trim()) return;

        try {
            const res = await fetch(`${API_URL}/webhooks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: newUrl,
                    events: ['*'],
                }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Webhook created' });
                setNewUrl('');
                fetchData();
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to create webhook' });
        }
    };

    /**
     * Delete webhook
     */
    const handleDelete = async (id) => {
        try {
            await fetch(`${API_URL}/webhooks/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Failed to delete webhook:', error);
        }
    };

    /**
     * Retry failed delivery
     */
    const handleRetry = async (deliveryId) => {
        try {
            await fetch(`${API_URL}/webhooks/deadletter/${deliveryId}/retry`, { method: 'POST' });
            setMessage({ type: 'success', text: 'Retry initiated' });
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: 'Retry failed' });
        }
    };

    if (isLoading) {
        return (
            <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                    <span className="text-gray-500">Loading webhooks...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 shadow-lg shadow-green-500/5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-dark-600">
                <h2 className="flex items-center text-lg font-semibold text-white gap-2">
                    <Webhook className="w-6 h-6 text-green-400" />
                    <span>Webhooks</span>
                </h2>
                <button
                    onClick={fetchData}
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
                    {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-dark-600 pb-2 mb-4 overflow-x-auto">
                {[
                    { id: 'subscriptions', label: 'Subscriptions', icon: <Webhook className="w-4 h-4" /> },
                    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
                    { id: 'failed', label: 'Failed', icon: <AlertCircle className="w-4 h-4" /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-all ${activeTab === tab.id
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-dark-700 border border-transparent'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.id === 'failed' && deadLetter.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                                {deadLetter.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'subscriptions' && (
                    <div className="space-y-4 h-full flex flex-col">
                        {/* Create Form */}
                        <div className="flex gap-2 p-1">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    <Globe className="w-4 h-4" />
                                </span>
                                <input
                                    type="url"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    placeholder="https://example.com/webhook"
                                    className="w-full bg-dark-700 text-white pl-9 pr-3 py-2.5 rounded-lg text-sm border border-dark-600 focus:border-green-500 outline-none transition-colors"
                                />
                            </div>
                            <button
                                onClick={handleCreate}
                                className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-lg shadow-green-600/20"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>

                        {/* Subscription List */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {subscriptions.length === 0 ? (
                                <div className="h-32 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-dark-600 rounded-lg">
                                    <Webhook className="w-8 h-8 opacity-20 mb-2" />
                                    <p>No webhooks configured</p>
                                </div>
                            ) : (
                                subscriptions.map(sub => (
                                    <div key={sub.id} className="bg-dark-700/50 rounded-lg p-3 border border-dark-600 group hover:border-dark-500 transition-colors">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-mono text-green-400 truncate flex items-center gap-2 mb-1">
                                                    <Globe className="w-3 h-3 text-gray-500" /> {sub.url}
                                                </div>
                                                <div className="text-xs text-gray-500 flex gap-3">
                                                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> {sub.deliveryCount} sent</span>
                                                    <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> {sub.failureCount} failed</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(sub.id)}
                                                className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                                                title="Delete Webhook"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="h-full overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {history.length === 0 ? (
                            <div className="h-32 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-dark-600 rounded-lg">
                                <History className="w-8 h-8 opacity-20 mb-2" />
                                <p>No deliveries yet</p>
                            </div>
                        ) : (
                            history.map(item => (
                                <div key={item.deliveryId} className="bg-dark-700/50 rounded-lg p-3 border border-dark-600 flex items-center justify-between gap-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${item.status === 'success'
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                            {item.status}
                                        </span>
                                        <span className="text-gray-400 font-mono text-xs flex items-center gap-1">
                                            <FileText className="w-3 h-3" /> {item.event}
                                        </span>
                                    </div>
                                    <span className="text-gray-500 text-xs flex items-center gap-1 font-mono">
                                        <Clock className="w-3 h-3" /> {item.duration}ms
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'failed' && (
                    <div className="h-full overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {deadLetter.length === 0 ? (
                            <div className="h-32 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-dark-600 rounded-lg">
                                <CheckCircle className="w-8 h-8 text-green-500 opacity-20 mb-2" />
                                <p>No failed deliveries - Great job!</p>
                            </div>
                        ) : (
                            deadLetter.map(item => (
                                <div key={item.deliveryId} className="bg-dark-700/50 rounded-lg p-3 border border-red-500/20 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                            <span className="text-gray-300 font-mono text-xs">{item.event}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRetry(item.deliveryId)}
                                            className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-500/20 transition-colors flex items-center gap-1"
                                        >
                                            <RotateCcw className="w-3 h-3" /> Retry
                                        </button>
                                    </div>
                                    <div className="text-xs text-red-400 bg-red-950/30 p-2 rounded font-mono break-all">
                                        Error: {item.error}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default WebhooksPanel;
