/**
 * Status Command - Check gateway server status
 */

const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');

// Gateway URL configuration — environment variable takes priority.
const GATEWAY_HTTP_URL = process.env.GATEWAY_HTTP_URL || 'https://devtunnel.onrender.com';

async function execute(options) {
    const spinner = ora('Checking gateway status...').start();

    // Resolve health-check URL
    let url;
    if (options.gatewayHttpUrl) {
        url = `${options.gatewayHttpUrl.replace(/\/$/, '')}/health`;
    } else if (options.host) {
        url = `http://${options.host}:${options.port}/health`;
    } else {
        url = `${GATEWAY_HTTP_URL.replace(/\/$/, '')}/health`;
    }

    try {
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;

        spinner.succeed('Gateway is online');
        console.log('');
        console.log(chalk.cyan('  URL:         ') + chalk.white(url));
        console.log(chalk.cyan('  Status:      ') + chalk.green(data.status));
        console.log(chalk.cyan('  Tunnels:     ') + chalk.white(data.tunnels));
        console.log(chalk.cyan('  Uptime:      ') + chalk.white(`${Math.floor(data.uptime)}s`));
        console.log('');
    } catch (error) {
        spinner.fail('Gateway is offline or unreachable');
        console.log(chalk.red(`  URL: ${url}`));
        console.log(chalk.red(`  Error: ${error.message}`));
        process.exit(1);
    }
}

module.exports = { execute };
