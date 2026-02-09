/**
 * TunnelManager Unit Tests
 */

const TunnelManager = require('../src/services/TunnelManager');

describe('TunnelManager', () => {
    let manager;
    let mockWs;

    beforeEach(() => {
        manager = new TunnelManager();
        mockWs = { readyState: 1, send: jest.fn(), terminate: jest.fn() };
    });

    describe('registerTunnel', () => {
        it('should register tunnel with generated subdomain', () => {
            const result = manager.registerTunnel({
                ws: mockWs,
                localPort: 8080,
            });

            expect(result.success).toBe(true);
            expect(result.tunnel).toBeDefined();
            expect(result.tunnel.subdomain).toMatch(/^[a-z0-9]{8}$/);
            expect(result.tunnel.tunnelId).toHaveLength(12);
            expect(manager.getTunnelCount()).toBe(1);
        });

        it('should register tunnel with requested subdomain', () => {
            const result = manager.registerTunnel({
                ws: mockWs,
                requestedSubdomain: 'myapp',
                localPort: 3000,
            });

            expect(result.success).toBe(true);
            expect(result.tunnel.subdomain).toBe('myapp');
        });

        it('should reject invalid subdomain', () => {
            const result = manager.registerTunnel({
                ws: mockWs,
                requestedSubdomain: 'ab', // too short
                localPort: 8080,
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should reject reserved subdomain', () => {
            const result = manager.registerTunnel({
                ws: mockWs,
                requestedSubdomain: 'admin',
                localPort: 8080,
            });

            expect(result.success).toBe(false);
            expect(result.code).toBe('SUBDOMAIN_TAKEN');
        });

        it('should reject duplicate subdomain', () => {
            manager.registerTunnel({ ws: mockWs, requestedSubdomain: 'testapp', localPort: 8080 });
            const result = manager.registerTunnel({
                ws: { ...mockWs },
                requestedSubdomain: 'testapp',
                localPort: 9000,
            });

            expect(result.success).toBe(false);
            expect(result.code).toBe('SUBDOMAIN_TAKEN');
        });
    });

    describe('getTunnelBySubdomain', () => {
        it('should return tunnel by subdomain', () => {
            const { tunnel } = manager.registerTunnel({
                ws: mockWs,
                requestedSubdomain: 'findme',
                localPort: 8080,
            });

            const found = manager.getTunnelBySubdomain('findme');
            expect(found).toBe(tunnel);
        });

        it('should return null for unknown subdomain', () => {
            expect(manager.getTunnelBySubdomain('nonexistent')).toBeNull();
        });
    });

    describe('closeTunnel', () => {
        it('should close tunnel and emit event', () => {
            const onClosed = jest.fn();
            manager.on('tunnel:closed', onClosed);

            const { tunnel } = manager.registerTunnel({
                ws: mockWs,
                requestedSubdomain: 'closeme',
                localPort: 8080,
            });

            manager.closeTunnel(tunnel.tunnelId, 'Test close');

            expect(manager.getTunnelCount()).toBe(0);
            expect(manager.getTunnelBySubdomain('closeme')).toBeNull();
            expect(onClosed).toHaveBeenCalledTimes(1);
            expect(onClosed).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Number), // duration
                'Test close'
            );
        });
    });
});
