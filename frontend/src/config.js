/**
 * Configuration for the Dashboard
 * 
 * All API and WebSocket endpoints in one place
 */

// Gateway server API URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// WebSocket URL for dashboard real-time updates (connects to dashboard WebSocket handler)
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/dashboard';

// Refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
    traffic: 5000,
    tunnels: 10000,
    stats: 5000,
};

// Maximum items to display
export const MAX_ITEMS = {
    traffic: 100,
    tunnels: 50,
};
