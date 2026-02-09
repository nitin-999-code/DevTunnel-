/**
 * TrafficControlPanel Component
 * 
 * Advanced traffic manipulation controls:
 * - Pause/Resume traffic stream
 * - Network throttling profiles
 * - Chaos testing mode
 * - Request modification rules
 */

import React, { useState } from 'react';
import { API_URL } from '../config';
import {
    Play, Pause, Rocket, Wifi, Smartphone,
    XCircle, Settings, Sliders, ZapOff, ShieldAlert,
    Snail
} from 'lucide-react';

function TrafficControlPanel({ onStateChange }) {
    // Control state
    const [isPaused, setIsPaused] = useState(false);
    const [queueSize, setQueueSize] = useState(0);
    const [throttle, setThrottle] = useState('none');
    const [chaosMode, setChaosMode] = useState({
        enabled: false,
        dropRate: 10,
        corruptRate: 5,
        delayVariance: 500,
    });

    // Custom throttle settings
    const [customLatency, setCustomLatency] = useState(200);
    const [customBandwidth, setCustomBandwidth] = useState(1000);

    // Throttle profiles
    const throttleProfiles = [
        { id: 'none', label: 'No Throttle', icon: <Rocket className="w-5 h-5" />, color: 'text-green-400', borderColor: 'group-hover:border-green-500/50' },
        { id: 'fast3g', label: 'Fast 3G', icon: <Wifi className="w-5 h-5" />, color: 'text-blue-400', borderColor: 'group-hover:border-blue-500/50' },
        { id: 'slow3g', label: 'Slow 3G', icon: <Smartphone className="w-5 h-5" />, color: 'text-yellow-400', borderColor: 'group-hover:border-yellow-500/50' },
        { id: 'edge', label: 'EDGE', icon: <Snail className="w-5 h-5" />, color: 'text-orange-400', borderColor: 'group-hover:border-orange-500/50' },
        { id: 'offline', label: 'Offline', icon: <XCircle className="w-5 h-5" />, color: 'text-red-400', borderColor: 'group-hover:border-red-500/50' },
        { id: 'custom', label: 'Custom', icon: <Settings className="w-5 h-5" />, color: 'text-purple-400', borderColor: 'group-hover:border-purple-500/50' },
    ];

    /**
     * Toggle pause/resume
     */
    const togglePause = async () => {
        try {
            const endpoint = isPaused ? 'resume' : 'pause';
            const res = await fetch(`${API_URL}/traffic-control/${endpoint}`, { method: 'POST' });
            const data = await res.json();
            setIsPaused(data.paused);
            setQueueSize(data.queueSize || 0);
            onStateChange?.({ isPaused: data.paused });
        } catch (error) {
            console.error('Failed to toggle pause:', error);
        }
    };

    /**
     * Set throttle profile
     */
    const handleThrottleChange = async (profile) => {
        try {
            const body = profile === 'custom'
                ? { profile, latency: customLatency, bandwidth: customBandwidth * 1000 }
                : { profile };

            await fetch(`${API_URL}/traffic-control/throttle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            setThrottle(profile);
            onStateChange?.({ throttle: profile });
        } catch (error) {
            console.error('Failed to set throttle:', error);
        }
    };

    /**
     * Set custom throttle settings
     */
    const applyCustomThrottle = () => {
        handleThrottleChange('custom');
    };

    /**
     * Toggle chaos mode
     */
    const toggleChaosMode = async () => {
        try {
            const newState = { ...chaosMode, enabled: !chaosMode.enabled };

            // Only update local state immediately for UI responsiveness
            // In a real app we might want to wait for server confirmation, 
            // but for better UX we toggle immediately and revert on error
            setChaosMode(newState);
            onStateChange?.({ chaosMode: newState });

            await fetch(`${API_URL}/traffic-control/chaos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: newState.enabled,
                    dropRate: newState.dropRate / 100,
                    corruptRate: newState.corruptRate / 100,
                    delayVariance: newState.delayVariance,
                }),
            });
        } catch (error) {
            console.error('Failed to toggle chaos mode:', error);
            // Revert on error
            setChaosMode(chaosMode);
            onStateChange?.({ chaosMode: chaosMode });
        }
    };

    // Update chaos settings without toggling
    const updateChaosSettings = async (updates) => {
        const newSettings = { ...chaosMode, ...updates };
        setChaosMode(newSettings);

        // Debounce actual API call in a real implementation
        // For now, only calls if enabled
        if (chaosMode.enabled) {
            try {
                await fetch(`${API_URL}/traffic-control/chaos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        enabled: true,
                        dropRate: newSettings.dropRate / 100,
                        corruptRate: newSettings.corruptRate / 100,
                        delayVariance: newSettings.delayVariance,
                    }),
                });
            } catch (e) {
                console.error('Failed to update chaos settings', e);
            }
        }
    };

    return (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 shadow-lg shadow-cyan-500/5 h-full overflow-y-auto custom-scrollbar">
            <h2 className="flex items-center space-x-2 text-lg font-semibold mb-6 pb-4 border-b border-dark-600 text-white">
                <Sliders className="w-6 h-6 text-cyan-400" />
                <span>Traffic Control</span>
                {isPaused && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full animate-pulse border border-yellow-500/50 flex items-center gap-1">
                        <Pause className="w-3 h-3 fill-current" /> PAUSED
                    </span>
                )}
            </h2>

            {/* Pause/Resume Control */}
            <div className="mb-8">
                <button
                    onClick={togglePause}
                    className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 group ${isPaused
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                        }`}
                >
                    {isPaused ? (
                        <>
                            <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                            <span>Resume Stream</span>
                            {queueSize > 0 && <span className="text-sm opacity-70 font-normal ml-1">({queueSize} queued)</span>}
                        </>
                    ) : (
                        <>
                            <Pause className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                            <span>Pause Stream</span>
                        </>
                    )}
                </button>
            </div>

            {/* Network Throttling */}
            <div className="mb-8">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                    <Wifi className="w-4 h-4" /> Network Throttling
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {throttleProfiles.map((profile) => (
                        <button
                            key={profile.id}
                            onClick={() => handleThrottleChange(profile.id)}
                            className={`py-3 px-3 rounded-lg text-xs font-medium transition-all duration-200 flex flex-col items-center gap-2 group border ${throttle === profile.id
                                ? `bg-blue-500/10 border-blue-400 ${profile.color} shadow-lg shadow-blue-500/10`
                                : `bg-dark-700/50 text-gray-400 hover:bg-dark-700 border-dark-600 hover:text-white ${profile.borderColor}`
                                }`}
                        >
                            <span className={`block transition-transform group-hover:scale-110 duration-200 ${throttle === profile.id ? profile.color : 'text-gray-500 group-hover:text-white'}`}>
                                {profile.icon}
                            </span>
                            <span>{profile.label}</span>
                        </button>
                    ))}
                </div>

                {/* Custom throttle settings */}
                {throttle === 'custom' && (
                    <div className="mt-4 p-4 bg-dark-700/30 rounded-lg space-y-4 border border-dark-600 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-xs text-gray-400 font-medium">Latency</label>
                                <span className="text-xs text-purple-400 font-mono">{customLatency}ms</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2000"
                                step="50"
                                value={customLatency}
                                onChange={(e) => setCustomLatency(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-xs text-gray-400 font-medium">Bandwidth</label>
                                <span className="text-xs text-purple-400 font-mono">{customBandwidth} KB/s</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="10000"
                                step="100"
                                value={customBandwidth}
                                onChange={(e) => setCustomBandwidth(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>
                        <button
                            onClick={applyCustomThrottle}
                            className="w-full py-2 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2"
                        >
                            <Settings className="w-3 h-3" /> Apply Custom Settings
                        </button>
                    </div>
                )}
            </div>

            {/* Chaos Testing Mode */}
            <div className={`p-5 rounded-lg border transition-all duration-300 ${chaosMode.enabled
                    ? 'bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/40'
                    : 'bg-dark-700/30 border-dark-600'
                }`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <ShieldAlert className={`w-6 h-6 ${chaosMode.enabled ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
                        <span className={`font-bold ${chaosMode.enabled ? 'text-white' : 'text-gray-400'}`}>Chaos Mode</span>
                    </div>
                    <button
                        onClick={() => toggleChaosMode()}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 ${chaosMode.enabled ? 'bg-red-500' : 'bg-dark-600'}`}
                    >
                        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${chaosMode.enabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {chaosMode.enabled ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Packet Drop Rate</span>
                                <span className="text-red-400 font-mono font-bold">{chaosMode.dropRate}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                value={chaosMode.dropRate}
                                onChange={(e) => updateChaosSettings({ dropRate: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-red-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Corruption Rate</span>
                                <span className="text-orange-400 font-mono font-bold">{chaosMode.corruptRate}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="20"
                                value={chaosMode.corruptRate}
                                onChange={(e) => updateChaosSettings({ corruptRate: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Delay Variance</span>
                                <span className="text-yellow-400 font-mono font-bold">{chaosMode.delayVariance}ms</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2000"
                                step="100"
                                value={chaosMode.delayVariance}
                                onChange={(e) => updateChaosSettings({ delayVariance: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-gray-500 flex items-center gap-2 italic">
                        <ZapOff className="w-3 h-3" />
                        Simulate network failures and instability
                    </p>
                )}
            </div>
        </div>
    );
}

export default TrafficControlPanel;
