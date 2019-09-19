const config = {};

config.serviceName = 'clean-old-jobs';

config.kubernetes = {
    isLocal: !!process.env.KUBERNETES_SERVICE_HOST,
    namespace: process.env.NAMESPACE || 'default'
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

module.exports = config;
