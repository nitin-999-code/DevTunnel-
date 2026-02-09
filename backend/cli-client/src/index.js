#!/usr/bin/env node

/**
 * DevTunnel+ CLI
 * 
 * Usage: devtunnel start <port> [options]
 * 
 * Creates a tunnel from public URL to localhost:<port>
 */

const { program } = require('commander');
const WebSocket = require('ws');
const chalk = require('chalk');
const ora = require('ora');
const boxen = require('boxen');
const http = require('http');
const https = require('https');
const {
    createTunnelRegisterMessage,
    createHttpResponseMessage,
    createHttpErrorMessage,
    parseMessage,
    serializeMessage,
    decodeBody,
    MessageType,
} = require('../../shared/src');

// Package info
const pkg = require('../../package.json');

/**
 * TunnelClient - Real tunneling client with reconnect support
 */
class TunnelClient {
    constructor(port, options = {}) {
        this.localPort = parseInt(port, 10);
        this.localHost = options.localHost || 'localhost';
        this.gatewayHost = options.host || 'localhost';
        this.gatewayPort = options.gatewayPort || 3001;
        this.subdomain = options.subdomain || null;

        this.ws = null;
        this.tunnelId = null;
        this.publicUrl = null;
        this.isConnected = false;
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;

        // Stats
        this.requestCount = 0;
        this.successCount = 0;
        this.errorCount = 0;
        this.startTime = Date.now();
    }

    /**
     * Starts the tunnel with auto-reconnect
     */
    async start() {
        console.log(chalk.cyan('\n🚀 DevTunnel+ Starting...\n'));

        while (this.shouldReconnect) {
            try {
                await this.connect();
                // Connection closed, will retry if shouldReconnect is true
            } catch (error) {
                if (!this.shouldReconnect) break;

                this.reconnectAttempts++;
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error(chalk.red(`\n❌ Failed after ${this.maxReconnectAttempts} attempts. Giving up.`));
                    break;
                }

                const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
                console.log(chalk.yellow(`\n⚠️  Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`));
                await this.sleep(delay);
            }
        }
    }

    /**
     * Connects to gateway and registers tunnel
     */
    connect() {
        return new Promise((resolve, reject) => {
            const spinner = ora('Connecting to gateway...').start();
            const wsUrl = `ws://${this.gatewayHost}:${this.gatewayPort}`;

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
                    spinner.succeed('Tunnel established!');
                    this.handleRegistered(message.payload);
                    this.reconnectAttempts = 0; // Reset on successful connection
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
                if (spinner.isSpinning) {
                    spinner.fail(`Connection failed: ${error.message}`);
                }
                this.isConnected = false;
            });

            this.ws.on('close', (code) => {
                this.isConnected = false;
                if (this.tunnelId && this.shouldReconnect) {
                    console.log(chalk.yellow(`\n⚠️  Connection lost (code: ${code})`));
                }
                resolve(); // Resolve to allow reconnect loop
            });

            // Connection timeout
            setTimeout(() => {
                if (!this.isConnected && spinner.isSpinning) {
                    spinner.fail('Connection timeout');
                    this.ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Handles successful tunnel registration
     */
    handleRegistered(payload) {
        this.tunnelId = payload.tunnelId;
        this.publicUrl = payload.publicUrl;
        this.subdomain = payload.subdomain;
        this.isConnected = true;

        this.printBanner();
    }

    /**
     * Prints the tunnel info banner
     */
    printBanner() {
        const info = [
            '',
            chalk.bold.green('   ✓ Tunnel is live!'),
            '',
            `   ${chalk.gray('Public URL →')}  ${chalk.bold.cyan(this.publicUrl)}`,
            `   ${chalk.gray('Forwarding →')}  ${chalk.white(`http://${this.localHost}:${this.localPort}`)}`,
            '',
            `   ${chalk.gray('Tunnel ID:')}    ${chalk.dim(this.tunnelId)}`,
            '',
        ].join('\n');

        console.log(boxen(info, {
            padding: 1,
            margin: { top: 1, bottom: 1, left: 2, right: 2 },
            borderStyle: 'round',
            borderColor: 'green',
        }));

        console.log(chalk.gray('   Waiting for requests...\n'));
    }

    /**
     * Handles incoming HTTP request from gateway
     */
    async handleHttpRequest(payload) {
        const { requestId, method, path, headers, body, bodyEncoding } = payload;
        const startTime = Date.now();
        this.requestCount++;

        // Log incoming request
        process.stdout.write(
            chalk.gray(`   ${this.formatTime()} `) +
            this.colorMethod(method) +
            chalk.white(` ${this.truncate(path, 50)}`)
        );

        try {
            // Decode request body
            const requestBody = body ? decodeBody(body, bodyEncoding || 'base64') : null;

            // Forward to local server
            const response = await this.forwardToLocal({ method, path, headers, body: requestBody });
            const duration = Date.now() - startTime;
            this.successCount++;

            // Send response back through WebSocket
            this.ws.send(serializeMessage(createHttpResponseMessage({
                requestId,
                statusCode: response.statusCode,
                headers: response.headers,
                body: response.body,
            })));

            // Log response
            console.log(` → ${this.colorStatus(response.statusCode)} ${chalk.gray(`${duration}ms`)}`);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.errorCount++;

            // Determine error code
            let statusCode = 502;
            let errorCode = 'LOCAL_SERVER_ERROR';

            if (error.code === 'ECONNREFUSED') {
                statusCode = 503;
                errorCode = 'CONNECTION_REFUSED';
            } else if (error.code === 'ETIMEDOUT') {
                statusCode = 504;
                errorCode = 'TIMEOUT';
            }

            // Send error response
            this.ws.send(serializeMessage(createHttpErrorMessage({
                requestId,
                error: error.message,
                code: errorCode,
                statusCode,
            })));

            // Log error
            console.log(` → ${chalk.red('ERR')} ${chalk.gray(error.code || error.message)} ${chalk.gray(`${duration}ms`)}`);
        }
    }

    /**
     * Makes real HTTP request to local server
     */
    forwardToLocal({ method, path, headers, body }) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, `http://${this.localHost}:${this.localPort}`);

            // Prepare headers
            const localHeaders = { ...headers };
            localHeaders['host'] = `${this.localHost}:${this.localPort}`;
            delete localHeaders['connection'];

            if (body) {
                localHeaders['content-length'] = String(body.length);
            }

            const options = {
                hostname: this.localHost,
                port: this.localPort,
                path: url.pathname + url.search,
                method,
                headers: localHeaders,
            };

            const req = http.request(options, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const responseBody = Buffer.concat(chunks);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: responseBody.toString('base64'),
                    });
                });
                res.on('error', reject);
            });

            req.on('error', reject);
            req.setTimeout(30000, () => {
                req.destroy();
                const err = new Error('Request timeout');
                err.code = 'ETIMEDOUT';
                reject(err);
            });

            if (body) req.write(body);
            req.end();
        });
    }

    // Utility methods
    formatTime() {
        return new Date().toLocaleTimeString('en-US', { hour12: false });
    }

    truncate(str, len) {
        return str.length > len ? str.substring(0, len - 3) + '...' : str;
    }

    colorMethod(method) {
        const colors = {
            GET: chalk.green,
            POST: chalk.blue,
            PUT: chalk.yellow,
            PATCH: chalk.yellow,
            DELETE: chalk.red,
            HEAD: chalk.cyan,
            OPTIONS: chalk.magenta,
        };
        return (colors[method] || chalk.white)(method.padEnd(7));
    }

    colorStatus(status) {
        if (status >= 500) return chalk.red(status);
        if (status >= 400) return chalk.yellow(status);
        if (status >= 300) return chalk.cyan(status);
        if (status >= 200) return chalk.green(status);
        return chalk.white(status);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Stops the tunnel
     */
    stop() {
        this.shouldReconnect = false;
        if (this.ws) {
            this.ws.close();
        }
        this.printStats();
    }

    /**
     * Prints session statistics
     */
    printStats() {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        console.log(chalk.cyan('\n📊 Session Stats:'));
        console.log(chalk.gray(`   Uptime: ${Math.floor(uptime / 60)}m ${uptime % 60}s`));
        console.log(chalk.gray(`   Requests: ${this.requestCount} (${this.successCount} ok, ${this.errorCount} failed)`));
        console.log('');
    }
}

// CLI Setup
program
    .name('devtunnel')
    .description('DevTunnel+ - Expose your localhost to the world')
    .version(pkg.version);

program
    .command('start <port>')
    .description('Start a tunnel to localhost:<port>')
    .option('-s, --subdomain <name>', 'Request a specific subdomain')
    .option('-h, --host <host>', 'Gateway host', 'localhost')
    .option('-p, --gateway-port <port>', 'Gateway WebSocket port', '3001')
    .option('-l, --local-host <host>', 'Local host to forward to', 'localhost')
    .action(async (port, options) => {
        // Validate port
        const portNum = parseInt(port, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            console.error(chalk.red(`Error: Invalid port "${port}". Must be 1-65535.`));
            process.exit(1);
        }

        const client = new TunnelClient(portNum, {
            subdomain: options.subdomain,
            host: options.host,
            gatewayPort: parseInt(options.gatewayPort, 10),
            localHost: options.localHost,
        });

        // Graceful shutdown
        const shutdown = () => {
            console.log(chalk.yellow('\n\n👋 Shutting down tunnel...'));
            client.stop();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        try {
            await client.start();
        } catch (error) {
            console.error(chalk.red(`\n❌ Fatal error: ${error.message}`));
            process.exit(1);
        }
    });

program
    .command('status')
    .description('Check gateway status')
    .option('-h, --host <host>', 'Gateway host', 'localhost')
    .option('-p, --port <port>', 'Gateway HTTP port', '3000')
    .action(async (options) => {
        try {
            const res = await fetch(`http://${options.host}:${options.port}/health`);
            const data = await res.json();
            console.log(chalk.green('✓ Gateway is running'));
            console.log(chalk.gray(`  Tunnels: ${data.tunnels}`));
            console.log(chalk.gray(`  Uptime: ${Math.floor(data.uptime)}s`));
        } catch (error) {
            console.error(chalk.red('✗ Gateway is not reachable'));
            console.error(chalk.gray(`  ${error.message}`));
        }
    });

// Parse arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
