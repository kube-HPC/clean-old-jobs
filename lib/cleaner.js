const { CronJob } = require('cron');
const Logger = require('@hkube/logger');
const etcd = require('./helpers/etcd');
const kubernetes = require('./helpers/kubernetes');
const log = Logger.GetLogFromContainer();
const { normalizeJobs, normalizeWorkerJobs } = require('./helpers/normalize');

const cleanJobs = async ({ type, jobs, completedMaxAgeHours, failedMaxAgeHours, pendingMaxAgeHours }) => {
    const completedToDelete = completedMaxAgeHours == null ? [] : jobs.filter(j => j.completed && j.ageHours > completedMaxAgeHours);
    const failedToDelete = failedMaxAgeHours == null ? [] : jobs.filter((j) => j.failed && j.ageHours > failedMaxAgeHours);
    const pendingToDelete = pendingMaxAgeHours ? jobs.filter((j) => j.pod && j.pod.unschedulable && (j.ageHours > pendingMaxAgeHours || !j.requested)) : [];
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
    const jobsRaw = await kubernetes.getWorkerJobs();
    const podsRaw = await kubernetes.getWorkerPods();
    const jobs = normalizeWorkerJobs(jobsRaw, podsRaw, requests);
    await cleanJobs({ type: 'workers', jobs, ...options });
};

const cleanPipelineDrivers = async (options) => {
    const jobsRaw = await kubernetes.getPipelineDriversJobs();
    const jobs = normalizeJobs(jobsRaw);
    await cleanJobs({ type: 'pipeline drivers', jobs, ...options });
};

const cleanAlgorithmBuilders = async (options) => {
    const jobsRaw = await kubernetes.getAlgorithmBuilderJobs();
    const jobs = normalizeJobs(jobsRaw);
    await cleanJobs({ type: 'algorithm builders', jobs, ...options });
};

const _cleanCallback = async (options) => {
    await cleanWorkers(options);
    await cleanPipelineDrivers(options);
    await cleanAlgorithmBuilders(options);
};

const init = async ({ cleanCron, maxJobAge }) => {
    log.info(`initializing cron with ${cleanCron}`);
    const cronJob = new CronJob(cleanCron, () => { // eslint-disable-line
        log.debug('Clean started');
        _cleanCallback(maxJobAge);
    }, () => {
        log.debug('Clean finished');
    }, true);

    await _cleanCallback(maxJobAge);
};

module.exports = {
    init
};
