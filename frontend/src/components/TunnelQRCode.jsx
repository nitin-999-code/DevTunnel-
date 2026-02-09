/**
 * TunnelQRCode Component
 * 
 * Displays a QR code for the tunnel URL with:
 * - Real tunnel link
 * - Expiration countdown timer
 * - Share/Download options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    Smartphone, X, Copy, Download, Share2,
    ChevronDown, ChevronUp, AlertTriangle, Clock,
    Wifi, Globe, Hash
} from 'lucide-react';

function TunnelQRCode({ tunnel, onClose }) {
    // Expiration time (default 1 hour from creation)
    const [expiresAt, setExpiresAt] = useState(() => {
        // Parse tunnel creation time or use current time
        const createdAt = tunnel.connectedAt ? new Date(tunnel.connectedAt).getTime() : Date.now();
        // Default expiration: 1 hour
        return createdAt + (60 * 60 * 1000);
    });

    // Time remaining
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    // QR settings
    const [qrSize, setQrSize] = useState(200);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [customExpiration, setCustomExpiration] = useState(60); // minutes

    // Generate the tunnel URL
    const tunnelUrl = tunnel.url || `http://${tunnel.subdomain}.localhost:3000`;

    /**
     * Update expiration countdown
     */
    useEffect(() => {
        const updateCountdown = () => {
            const now = Date.now();
            const remaining = expiresAt - now;

            if (remaining <= 0) {
                setIsExpired(true);
                setTimeRemaining('Expired');
                return;
            }

            setIsExpired(false);

            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
            } else if (minutes > 0) {
                setTimeRemaining(`${minutes}m ${seconds}s`);
            } else {
                setTimeRemaining(`${seconds}s`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    /**
     * Set custom expiration time
     */
    const handleSetExpiration = (minutes) => {
        const newExpiration = Date.now() + (minutes * 60 * 1000);
        setExpiresAt(newExpiration);
        setCustomExpiration(minutes);
    };

    /**
     * Copy URL to clipboard
     */
    const handleCopyUrl = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(tunnelUrl);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    }, [tunnelUrl]);

    /**
     * Download QR code as PNG
     */
    const handleDownloadQR = useCallback(() => {
        const svg = document.getElementById('tunnel-qr-code');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = qrSize;
            canvas.height = qrSize;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const link = document.createElement('a');
            link.download = `tunnel-${tunnel.subdomain}-qr.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }, [qrSize, tunnel.subdomain]);

    /**
     * Share URL (mobile)
     */
    const handleShare = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `DevTunnel+ - ${tunnel.subdomain}`,
                    text: `Access my local server at ${tunnelUrl}`,
                    url: tunnelUrl,
                });
            } catch (err) {
                // User cancelled share
            }
        } else {
            handleCopyUrl();
        }
    }, [tunnel.subdomain, tunnelUrl, handleCopyUrl]);

    // Expiration progress (0-100)
    const expirationProgress = Math.max(0, Math.min(100,
        ((expiresAt - Date.now()) / (customExpiration * 60 * 1000)) * 100
    ));

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center text-xl font-bold text-white gap-2">
                    <Smartphone className="w-6 h-6 text-purple-400" />
                    <span>Tunnel QR Code</span>
                </h2>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                )}
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center space-y-6">
                {/* QR Code */}
                <div className={`bg-white p-4 rounded-xl shadow-lg transition-all duration-300 ${isExpired ? 'opacity-50 grayscale blur-[1px]' : 'hover:scale-105'}`}>
                    <QRCodeSVG
                        id="tunnel-qr-code"
                        value={tunnelUrl}
                        size={qrSize}
                        level="H"
                        includeMargin={false}
                        fgColor={isExpired ? '#888888' : '#0f172a'}
                        bgColor="#ffffff"
                    />
                </div>

                {/* Expiration Warning */}
                {isExpired && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-pulse">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span>This link has expired. Extend to share again.</span>
                    </div>
                )}

                {/* URL Display */}
                <div className="w-full">
                    <div className="bg-dark-900/50 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 group">
                        <span className="font-mono text-sm text-cyan-400 truncate flex-1 select-all">{tunnelUrl}</span>
                        <button
                            onClick={handleCopyUrl}
                            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Copy URL"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Expiration Timer */}
                <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Time Remaining
                        </span>
                        <span className={`font-mono font-bold ${isExpired ? 'text-red-400' :
                            timeRemaining.includes('s') && !timeRemaining.includes('m') ? 'text-yellow-400 animate-pulse' :
                                'text-green-400'
                            }`}>
                            {timeRemaining}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ${expirationProgress > 50 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                                expirationProgress > 20 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                                    'bg-gradient-to-r from-red-500 to-red-400'
                                }`}
                            style={{ width: `${expirationProgress}%` }}
                        />
                    </div>
                </div>

                {/* Quick Expiration Buttons */}
                <div className="flex flex-wrap gap-2 justify-center">
                    {[15, 30, 60, 120, 360].map(mins => (
                        <button
                            key={mins}
                            onClick={() => handleSetExpiration(mins)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${customExpiration === mins
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 scale-105'
                                : 'bg-dark-700 text-gray-400 hover:bg-dark-600 hover:text-white border border-white/5'
                                }`}
                        >
                            {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                        onClick={handleShare}
                        className="bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 flex items-center justify-center gap-2 group"
                    >
                        <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>Share</span>
                    </button>
                    <button
                        onClick={handleDownloadQR}
                        className="bg-dark-700 hover:bg-dark-600 text-white py-2.5 rounded-xl font-medium transition-all border border-white/5 flex items-center justify-center gap-2 group"
                    >
                        <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                        <span>Download</span>
                    </button>
                </div>

                {/* Advanced Options Toggle */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                </button>

                {/* Advanced Options */}
                {showAdvanced && (
                    <div className="w-full bg-dark-800/50 rounded-xl p-4 space-y-4 border border-white/5 animate-in slide-in-from-top-2">
                        {/* QR Size */}
                        <div>
                            <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">QR Code Size</label>
                            <div className="flex items-center space-x-3">
                                <input
                                    type="range"
                                    min="150"
                                    max="300"
                                    value={qrSize}
                                    onChange={(e) => setQrSize(parseInt(e.target.value))}
                                    className="flex-1 accent-purple-500 h-1.5 bg-dark-600 rounded-full appearance-none decoration-purple-500"
                                />
                                <span className="text-xs text-purple-400 font-mono w-12 text-right">{qrSize}px</span>
                            </div>
                        </div>

                        {/* Tunnel Info */}
                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 flex items-center gap-2"><Globe className="w-3 h-3" /> Subdomain</span>
                                <span className="text-cyan-400 font-mono">{tunnel.subdomain}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 flex items-center gap-2"><Hash className="w-3 h-3" /> Tunnel ID</span>
                                <span className="text-gray-400 font-mono">{tunnel.tunnelId}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 flex items-center gap-2"><Wifi className="w-3 h-3" /> Local Port</span>
                                <span className="text-gray-400 font-mono">{tunnel.localPort || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TunnelQRCode;
