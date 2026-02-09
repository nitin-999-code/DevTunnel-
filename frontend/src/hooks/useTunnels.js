/**
 * useTunnels Hook
 * 
 * Manages tunnel list data:
 * - Fetches active tunnels
 * - Auto-refreshes periodically
 */

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';

export function useTunnels() {
    // List of active tunnels
    const [tunnels, setTunnels] = useState([]);

    // Loading state
    const [isLoading, setIsLoading] = useState(true);

    // Error state
    const [error, setError] = useState(null);

    /**
     * Fetches tunnels from API
     */
    const fetchTunnels = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/tunnels`);

            if (!response.ok) {
                throw new Error('Failed to fetch tunnels');
            }

            const data = await response.json();
            setTunnels(data.tunnels || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch tunnels:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchTunnels();
    }, [fetchTunnels]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const refreshInterval = setInterval(fetchTunnels, 10000);
        return () => clearInterval(refreshInterval);
    }, [fetchTunnels]);

    return {
        tunnels,
        isLoading,
        error,
        refreshTunnels: fetchTunnels,
    };
}
