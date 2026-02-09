/**
 * useTraffic Hook
 * 
 * Manages live traffic data with:
 * - Real-time WebSocket updates from dashboard endpoint
 * - Real-time metrics pushed via WebSocket
 * - Computed latency, throughput, error rates
 * - Active tunnel management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL, WS_URL } from '../config';

export function useTraffic() {
    // Store all traffic requests
    const [traffic, setTraffic] = useState([]);

    // Store active tunnels
    const [tunnels, setTunnels] = useState([]);

    // Connection status
    const [isConnected, setIsConnected] = useState(false);

    // Real statistics from server (computed from traffic stream)
    const [stats, setStats] = useState({
        totalRequests: 0,
        totalResponses: 0,
        pendingRequests: 0,
        successRate: 0,
        errorRate: 0,
        avgResponseTime: 0,
        latency: { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, count: 0 },
        throughput: { requestsPerSecond: 0, requestsPerMinute: 0, bytesInPerSecond: 0, bytesOutPerSecond: 0 },
        errorBreakdown: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
        methodDistribution: {},
        topPaths: [],
        timeSeries: [],
        activeTunnels: 0,
    });

    // WebSocket reference
    const wsRef = useRef(null);

    // Reconnection timer
    const reconnectTimerRef = useRef(null);

    /**
     * Fetches active tunnels from API
     */
    const fetchTunnels = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/tunnels`);
            if (!response.ok) throw new Error('Failed to fetch tunnels');
            const data = await response.json();
            setTunnels(data.tunnels || []);
        } catch (error) {
            console.error('Failed to fetch tunnels:', error);
        }
    }, []);

    /**
     * Fetches initial traffic data from API
     */
    const fetchTraffic = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/traffic?limit=100`);
            if (!response.ok) throw new Error('Failed to fetch traffic');
            const data = await response.json();
            setTraffic(data.traffic || []);
        } catch (error) {
            console.error('Failed to fetch traffic:', error);
        }
    }, []);

    /**
     * Fetches initial stats from API (only on load, then use WebSocket)
     */
    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/stats`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();

            // Use comprehensive traffic stats from server
            if (data.traffic) {
                setStats(prev => ({
                    ...prev,
                    totalRequests: data.traffic.totalRequests || 0,
                    totalResponses: data.traffic.totalResponses || 0,
                    successRate: parseFloat(data.traffic.successRate) || 0,
                    errorRate: parseFloat(data.traffic.errorRate) || 0,
                    avgResponseTime: data.traffic.avgResponseTime || 0,
                    latency: data.traffic.latency || prev.latency,
                    throughput: data.traffic.throughput || prev.throughput,
                    errorBreakdown: data.traffic.errorBreakdown || prev.errorBreakdown,
                    methodDistribution: data.traffic.methodDistribution || prev.methodDistribution,
                    topPaths: data.traffic.topPaths || prev.topPaths,
                    timeSeries: data.traffic.timeSeries || prev.timeSeries,
                    activeTunnels: data.traffic.activeTunnels || prev.activeTunnels,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    /**
     * Connects to WebSocket for real-time updates
     */
    const connectWebSocket = useCallback(() => {
        // Don't reconnect if already connected
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        console.log('Connecting to dashboard WebSocket:', WS_URL);
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Dashboard WebSocket connected');
            setIsConnected(true);

            // Subscribe to traffic updates
            ws.send(JSON.stringify({ type: 'subscribe', channel: 'traffic' }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        ws.onclose = (event) => {
            console.log('Dashboard WebSocket disconnected:', event.code);
            setIsConnected(false);

            // Attempt reconnection after 3 seconds
            reconnectTimerRef.current = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }, []);

    /**
     * Handles incoming WebSocket messages
     */
    const handleWebSocketMessage = (message) => {
        switch (message.type) {
            case 'connected':
                console.log('Server says:', message.message);
                break;

            case 'traffic:request':
                // New request coming in - add to traffic feed
                setTraffic(prev => {
                    const existingIndex = prev.findIndex(t => t.requestId === message.data.requestId);
                    if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = { ...updated[existingIndex], ...message.data };
                        return updated;
                    }
                    return [message.data, ...prev].slice(0, 100);
                });
                break;

            case 'traffic:response':
                // Response received - update the corresponding request
                setTraffic(prev => {
                    const existingIndex = prev.findIndex(t => t.requestId === message.data.requestId);
                    if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = { ...updated[existingIndex], ...message.data };
                        return updated;
                    }
                    return [message.data, ...prev].slice(0, 100);
                });
                break;

            case 'tunnel:connected':
            case 'tunnel:disconnected':
                // Refresh tunnels list when a tunnel connects/disconnects
                fetchTunnels();
                break;

            case 'metrics:update':
                // Real-time metrics pushed from server (computed from traffic stream)
                if (message.data) {
                    setStats({
                        totalRequests: message.data.totalRequests || 0,
                        totalResponses: message.data.totalResponses || 0,
                        pendingRequests: message.data.pendingRequests || 0,
                        successRate: parseFloat(message.data.successRate) || 0,
                        errorRate: parseFloat(message.data.errorRate) || 0,
                        avgResponseTime: message.data.avgResponseTime || 0,
                        latency: message.data.latency || {},
                        throughput: message.data.throughput || {},
                        errorBreakdown: message.data.errorBreakdown || {},
                        methodDistribution: message.data.methodDistribution || {},
                        topPaths: message.data.topPaths || [],
                        timeSeries: message.data.timeSeries || [],
                        activeTunnels: message.data.activeTunnels || 0,
                    });
                }
                break;

            case 'pong':
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    };

    /**
     * Clears all traffic data
     */
    const clearTraffic = useCallback(async () => {
        try {
            await fetch(`${API_URL}/traffic`, { method: 'DELETE' });
            setTraffic([]);
        } catch (error) {
            console.error('Failed to clear traffic:', error);
            setTraffic([]);
        }
    }, []);

    // Initial data fetch
    useEffect(() => {
        fetchTraffic();
        fetchStats();
        fetchTunnels();

        // Poll tunnels every 5 seconds as a fallback
        const tunnelInterval = setInterval(fetchTunnels, 5000);
        return () => clearInterval(tunnelInterval);
    }, [fetchTraffic, fetchStats, fetchTunnels]);

    // Setup WebSocket connection
    useEffect(() => {
        connectWebSocket();

        return () => {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connectWebSocket]);

    return {
        // Original props
        traffic,
        stats,
        isConnected,
        clearTraffic,
        refreshTraffic: fetchTraffic,

        // Aliases for DashboardPage
        requests: traffic,
        tunnels,
        connected: isConnected,
        clearRequests: clearTraffic,
        fetchTunnels,
    };
}
