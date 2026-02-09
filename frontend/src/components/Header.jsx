/**
 * Header Component
 * 
 * Top navigation bar showing:
 * - Logo and title
 * - Connection status indicator
 */

import React from 'react';
import { Activity, BookOpen, Circle } from 'lucide-react';

function Header({ isConnected }) {
    return (
        <header className="bg-dark-900/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-16">

                    {/* Logo and Title */}
                    <div className="flex items-center space-x-3 group cursor-pointer transition-opacity hover:opacity-80">
                        {/* Logo icon */}
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                            <Activity className="w-5 h-5 text-white" />
                        </div>

                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                DevTunnel
                                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">+</span>
                            </h1>
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Request Inspector</p>
                        </div>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center space-x-6">
                        {/* Status indicator */}
                        <div className="flex items-center space-x-2 bg-dark-800/50 px-3 py-1.5 rounded-full border border-white/5">
                            <div className="relative flex h-2.5 w-2.5">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>

                        {/* Documentation link */}
                        <a
                            href="#"
                            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                        >
                            <BookOpen className="w-4 h-4 group-hover:text-cyan-400 transition-colors" />
                            <span>Docs</span>
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;
