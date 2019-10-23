const { CronJob } = require('cron');
const Logger = require('@hkube/logger');
const etcd = require('./helpers/etcd');
const kubernetes = require('./helpers/kubernetes');
const log = Logger.GetLogFromContainer();
const { normalizePods } = require('./helpers/normalize');

const cleanJobs = async ({ type, pods, completedMaxAgeHours, failedMaxAgeHours, pendingMaxAgeHours }) => {
    const completedToDelete = pods.filter(j => j.completed && j.ageHours > completedMaxAgeHours);
    const failedToDelete = pods.filter((j) => j.failed && j.ageHours > failedMaxAgeHours);
    const pendingToDelete = pendingMaxAgeHours ? pods.filter((j) => j.unschedulable && (j.ageHours > pendingMaxAgeHours || !j.requested)) : [];
    const toDelete = [...pendingToDelete, ...completedToDelete, ...failedToDelete];

    const total = failedToDelete.length + completedToDelete.length + pendingToDelete.length;
    if (total > 0) {
        log.info(`Delete ${type} jobs: failed: ${failedToDelete.length}, completed: ${completedToDelete.length}, pending: ${pendingToDelete.length}`);
    }

    for (const j of toDelete) { // eslint-disable-line
        await kubernetes.deleteJob(j.name); // eslint-disable-line
    }
};

const cleanWorkers = async (options) => {
    const requests = await etcd.getAlgorithmRequests();
    const podsRaw = await kubernetes.getWorkerPods();
    const pods = normalizePods(podsRaw, requests);
    await cleanJobs({ type: 'workers', pods, ...options });
};

const cleanPipelineDrivers = async (options) => {
    const podsRaw = await kubernetes.getPipelineDriversPods();
    const pods = normalizePods(podsRaw);
    await cleanJobs({ type: 'pipeline drivers', pods, ...options });
};

const cleanAlgorithmBuilders = async (options) => {
    const podsRaw = await kubernetes.getAlgorithmBuilderPods();
    const pods = normalizePods(podsRaw);
    await cleanJobs({ type: 'algorithm builders', pods, ...options });
};

const _cleanCallback = async (options) => {
    await cleanWorkers(options);
    await cleanPipelineDrivers(options);
    await cleanAlgorithmBuilders(options);
};

const init = async ({ cleanCron, maxJobAge }) => {
    log.info(`initializing cron with ${cleanCron}`);
    const cronJob = new CronJob(cleanCron, () => {
        log.debug('Clean started');
        _cleanCallback(maxJobAge);
    }, () => {
        log.debug('Clean finished');
    });
    cronJob.start();
    await _cleanCallback(maxJobAge);
};

module.exports = {
    init
};
