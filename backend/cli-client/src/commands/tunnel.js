/**
 * Tunnel Command Module
 * 
 * This file re-exports the TunnelClient for programmatic use
 * while the main CLI is in index.js
 */

// Gateway URL configuration — environment variables take priority,
// then explicit options, then these production defaults.
const GATEWAY_HTTP_URL = process.env.GATEWAY_HTTP_URL || 'https://devtunnel.onrender.com';
const GATEWAY_WS_URL = process.env.GATEWAY_WS_URL || 'wss://devtunnel.onrender.com';

const WebSocket = require('ws');
const chalk = require('chalk');
const ora = require('ora');
const boxen = require('boxen');
const http = require('http');
const {
    createTunnelRegisterMessage,
    createHttpResponseMessage,
    createHttpErrorMessage,
    parseMessage,
    serializeMessage,
    decodeBody,
    MessageType,
} = require('../../../shared/src');

/**
 * TunnelClient - Programmatic API for creating tunnels
 */
class TunnelClient {
    constructor(localPort, options = {}) {
        this.localPort = parseInt(localPort, 10);
        this.localHost = options.localHost || 'localhost';
        this.subdomain = options.subdomain || null;

        // Resolve gateway URLs (same priority as main CLI)
        if (options.gatewayWsUrl) {
            this.gatewayWsUrl = options.gatewayWsUrl;
        } else if (options.host && options.host !== 'devtunnel.onrender.com') {
            const port = options.gatewayPort || 3001;
            this.gatewayWsUrl = `ws://${options.host}:${port}`;
        } else {
            this.gatewayWsUrl = GATEWAY_WS_URL;
        }

        if (options.gatewayHttpUrl) {
            this.gatewayHttpUrl = options.gatewayHttpUrl;
        } else if (options.host && options.host !== 'devtunnel.onrender.com') {
            const port = options.gatewayPort || 3000;
            this.gatewayHttpUrl = `http://${options.host}:${port}`;
        } else {
            this.gatewayHttpUrl = GATEWAY_HTTP_URL;
        }

        this.ws = null;
        this.tunnelId = null;
        this.publicUrl = null;
        this.isConnected = false;
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;

        this.requestCount = 0;
        this.successCount = 0;
        this.errorCount = 0;
    }

    /**
     * Connects to gateway and starts tunnel
     */
    async connect() {
        const spinner = ora('Connecting to gateway...').start();

        return new Promise((resolve, reject) => {
            const wsUrl = this.gatewayWsUrl;
            this.ws = new WebSocket(wsUrl);

            this.ws.on('open', () => {
                spinner.text = 'Registering tunnel...';
                this.ws.send(serializeMessage(createTunnelRegisterMessage({
                    subdomain: this.subdomain,
                    localPort: this.localPort,
                })));
            });

            this.ws.on('message', (data) => {
                const message = parseMessage(data);
                if (!message) return;

                if (message.type === MessageType.TUNNEL_REGISTERED) {
                    this.tunnelId = message.payload.tunnelId;
                    this.publicUrl = message.payload.publicUrl;
                    this.subdomain = message.payload.subdomain;
                    this.isConnected = true;
                    spinner.succeed('Tunnel established!');
                    this.printBanner();
                    resolve();
                } else if (message.type === MessageType.HTTP_REQUEST) {
                    this.handleHttpRequest(message.payload);
                } else if (message.type === MessageType.ERROR) {
                    spinner.fail(`Error: ${message.payload.error}`);
                    reject(new Error(message.payload.error));
                } else if (message.type === MessageType.PING) {
                    this.ws.send(serializeMessage({ type: MessageType.PONG, payload: { timestamp: Date.now() } }));
                }
            });

            this.ws.on('error', (error) => {
                if (spinner.isSpinning) spinner.fail(`Connection failed: ${error.message}`);
                reject(error);
            });

            this.ws.on('close', () => {
                this.isConnected = false;
            });

            setTimeout(() => {
                if (!this.isConnected) {
                    spinner.fail('Connection timeout');
                    this.ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    printBanner() {
        const info = [
            '',
            chalk.bold.green('  DevTunnel+ is running!'),
            '',
            `  ${chalk.cyan('Public URL:')}    ${chalk.bold(this.publicUrl)}`,
            `  ${chalk.cyan('Subdomain:')}     ${this.subdomain}`,
            `  ${chalk.cyan('Forwarding to:')} http://${this.localHost}:${this.localPort}`,
            `  ${chalk.cyan('Tunnel ID:')}     ${this.tunnelId}`,
            '',
            chalk.gray('  Press Ctrl+C to stop'),
            '',
        ].join('\n');

        console.log(boxen(info, {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
        }));

        console.log(chalk.gray('  Waiting for requests...\n'));
    }

    async handleHttpRequest(payload) {
        const { requestId, method, path, headers, body, bodyEncoding } = payload;
        const startTime = Date.now();
        this.requestCount++;

        console.log(
            chalk.gray(`[${new Date().toLocaleTimeString()}]`) +
            ` ${this.colorMethod(method)} ${path}`
        );

        try {
            const requestBody = body ? decodeBody(body, bodyEncoding || 'base64') : null;
            const response = await this.forwardToLocal({ method, path, headers, body: requestBody });
            const duration = Date.now() - startTime;
            this.successCount++;

            this.ws.send(serializeMessage(createHttpResponseMessage({
                requestId,
                statusCode: response.statusCode,
                headers: response.headers,
                body: response.body,
            })));

            console.log(
                chalk.gray(`[${new Date().toLocaleTimeString()}]`) +
                ` ${this.colorStatus(response.statusCode)} ${chalk.gray(`${duration}ms`)}`
            );
        } catch (error) {
            const duration = Date.now() - startTime;
            this.errorCount++;

            this.ws.send(serializeMessage(createHttpErrorMessage({
                requestId,
                error: error.message,
                code: error.code === 'ECONNREFUSED' ? 'CONNECTION_REFUSED' : 'LOCAL_SERVER_ERROR',
                statusCode: error.code === 'ECONNREFUSED' ? 503 : 502,
            })));

            console.log(
                chalk.gray(`[${new Date().toLocaleTimeString()}]`) +
                ` ${chalk.red('ERR')} ${error.message} ${chalk.gray(`${duration}ms`)}`
            );
        }
    }

    forwardToLocal({ method, path, headers, body }) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, `http://${this.localHost}:${this.localPort}`);
            const localHeaders = { ...headers, host: `${this.localHost}:${this.localPort}` };
            delete localHeaders['connection'];
            if (body) localHeaders['content-length'] = String(body.length);

            const req = http.request({
                hostname: this.localHost,
                port: this.localPort,
                path: url.pathname + url.search,
                method,
                headers: localHeaders,
            }, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: Buffer.concat(chunks).toString('base64'),
                    });
                });
            });

            req.on('error', reject);
            req.setTimeout(30000, () => {
                req.destroy();
                reject(Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' }));
            });
            if (body) req.write(body);
            req.end();
        });
    }

    colorMethod(method) {
        const colors = { GET: chalk.green, POST: chalk.blue, PUT: chalk.yellow, DELETE: chalk.red };
        return (colors[method] || chalk.white)(method.padEnd(7));
    }

    colorStatus(status) {
        if (status >= 500) return chalk.red(status);
        if (status >= 400) return chalk.yellow(status);
        if (status >= 200) return chalk.green(status);
        return chalk.white(status);
    }

    close() {
        this.shouldReconnect = false;
        if (this.ws) this.ws.close();
    }

    getStats() {
        return {
            tunnelId: this.tunnelId,
            publicUrl: this.publicUrl,
            requestCount: this.requestCount,
            successCount: this.successCount,
            errorCount: this.errorCount,
        };
    }
}

/**
 * Execute tunnel (for backward compatibility with http command)
 */
async function execute(port, options = {}) {
    const client = new TunnelClient(port, options);

    process.on('SIGINT', () => {
        console.log(chalk.yellow('\nShutting down tunnel...'));
        client.close();
        process.exit(0);
    });

    await client.connect();
}

module.exports = { execute, TunnelClient };
