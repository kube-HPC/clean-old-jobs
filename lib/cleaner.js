const { CronJob } = require('cron');
const log = require('@hkube/logger').GetLogFromContainer();
const etcd = require('./helpers/etcd');
const PodTypes = require('./consts/pod-types');
const kubernetes = require('./helpers/kubernetes');
const { normalizePods } = require('./helpers/normalize');

let lastIntervalTime = Date.now();
const cleanJobs = async ({ type, pods, completedMaxAgeHours, failedMaxAgeHours, pendingMaxAgeHours }) => {
    const completedToDelete = pods.filter(p => p.completed && p.ageHours > completedMaxAgeHours);
    const failedToDelete = pods.filter(p => p.failed && p.ageHours > failedMaxAgeHours);
    const waitingToDelete = pods.filter(p => p.waiting && p.ageHours > failedMaxAgeHours);
    const pendingToDelete = pods.filter(p => p.unschedulable && (p.ageHours > pendingMaxAgeHours || !p.requested));
    const toDelete = [...pendingToDelete, ...completedToDelete, ...failedToDelete, ...waitingToDelete];

    if (toDelete.length > 0) {
        log.info(`Delete ${type} jobs: failed: ${failedToDelete.length}, completed: ${completedToDelete.length}, pending: ${pendingToDelete.length},  waiting: ${waitingToDelete.length}`);
    }

    for (const j of toDelete) { // eslint-disable-line
        await kubernetes.deleteJob(j); // eslint-disable-line
    }
};

const cleanWorkers = async (options) => {
    const requests = await etcd.getAlgorithmRequests();
    const podsRaw = await kubernetes.getWorkerPods();
    const jobsRaw = await kubernetes.getWorkerJobs();
    const pods = normalizePods(podsRaw, requests, jobsRaw);
    await cleanJobs({ type: PodTypes.WORKER, pods, ...options });
};

const cleanPipelineDrivers = async (options) => {
    const podsRaw = await kubernetes.getPipelineDriversPods();
    const pods = normalizePods(podsRaw);
    await cleanJobs({ type: PodTypes.PIPELINE_DRIVER, pods, ...options });
};

const cleanAlgorithmBuilders = async (options) => {
    const podsRaw = await kubernetes.getAlgorithmBuilderPods();
    const pods = normalizePods(podsRaw);
    await cleanJobs({ type: PodTypes.ALGORITHM_BUILDER, pods, ...options });
};

const _cleanCallback = async (options) => {
    await cleanWorkers(options);
    await cleanPipelineDrivers(options);
    await cleanAlgorithmBuilders(options);
    lastIntervalTime = Date.now();
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

const checkHealth = (maxDiff) => {
    log.debug('health-checks');
    const diff = Date.now() - lastIntervalTime;
    log.debug(`diff = ${diff}`);

    return (diff < maxDiff);
};
module.exports = {
    init,
    checkHealth
};
