const configIt = require('@hkube/config');
const Logger = require('@hkube/logger');
const { rest: healthcheck } = require('@hkube/healthchecks');

const { main, logger } = configIt.load();
const log = new Logger(main.serviceName, logger);
const component = require('./lib/consts/components').MAIN;
const etcd = require('./lib/helpers/etcd');
const kubernetes = require('./lib/helpers/kubernetes');
const { init, checkHealth } = require('./lib/cleaner');

const modules = [
    etcd,
    kubernetes
];

class Bootstrap {
    async init() {
        try {
            this._handleErrors();
            log.info(`running application with env: ${configIt.env()}, version: ${main.version}, node: ${process.versions.node}`, { component });
            await Promise.all(modules.map(m => m.init(main)));
            if (main.healthchecks.enabled) {
                await healthcheck.init({ port: main.healthchecks.port });
                healthcheck.start(main.healthchecks.path, () => checkHealth(main.healthchecks.maxDiff), 'health');
            }
            await init({ cleanCron: main.cleanCron, maxJobAge: main.maxJobAge });
        }
        catch (error) {
            this._onInitFailed(error);
        }
    }

    _onInitFailed(error) {
        log.error(error.message, { component }, error);
        log.error(error);
        process.exit(1);
    }

    _handleErrors() {
        process.on('exit', (code) => {
            log.info(`exit code ${code}`, { component });
        });
        process.on('SIGINT', () => {
            log.info('SIGINT', { component });
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            log.info('SIGTERM', { component });
            process.exit(0);
        });
        process.on('unhandledRejection', (error) => {
            log.error(`unhandledRejection: ${error.message}`, { component }, error);
            process.exit(1);
        });
        process.on('uncaughtException', (error) => {
            log.error(`uncaughtException: ${error.message}`, { component }, error);
            process.exit(1);
        });
    }
}

module.exports = new Bootstrap();
