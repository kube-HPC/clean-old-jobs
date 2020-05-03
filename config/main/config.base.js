const formatter = require('../../lib/helpers/formatters');

const config = {};

config.serviceName = 'clean-old-jobs';

config.kubernetes = {
    isLocal: !!process.env.KUBERNETES_SERVICE_HOST,
    namespace: process.env.NAMESPACE || 'default',
    timeout: process.env.KUBERNETES_SERVICE_TIMEOUT || 60000
};

config.etcd = {
    protocol: 'http',
    host: process.env.ETCD_CLIENT_SERVICE_HOST || '127.0.0.1',
    port: process.env.ETCD_CLIENT_SERVICE_PORT || 4001,
    serviceName: config.serviceName
};

config.maxJobAge = {
    completedMaxAgeHours: process.env.MAX_COMPLETED_JOB_AGE_HOURS || 0.0166,
    failedMaxAgeHours: process.env.MAX_FAILED_JOB_AGE_HOURS || 0.0166,
    pendingMaxAgeHours: process.env.MAX_PENDING_JOB_AGE_HOURS || 0.0166, // 1 minutes
};

config.cleanCron = process.env.CLEAN_CRON || '*/1 * * * *';

config.healthchecks = {
    path: process.env.HEALTHCHECK_PATH || '/healthz',
    port: process.env.HEALTHCHECK_PORT || '5000',
    maxDiff: process.env.HEALTHCHECK_MAX_DIFF || `${60 * 1000 * 3}`,
    enabled: formatter.parseBool(process.env.HEALTHCHECKS_ENABLE, true)
};

module.exports = config;
