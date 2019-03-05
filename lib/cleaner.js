const kubernetes = require('./helpers/kubernetes');
const etcd = require('./helpers/etcd');
const Logger = require('@hkube/logger');
const { CronJob } = require('cron');
const log = Logger.GetLogFromContainer();
const { normalizeJobs, normalizeWorkerJobs } = require('./helpers/normalize');

const cleanWorkers = async ({ completedMaxAgeHours, failedMaxAgeHours, pendingMaxAgeHours } = {}) => {
    const requests = await etcd.getAlgorithmRequests();
    const jobsRaw = await kubernetes.getWorkerJobs();
    const podsRaw = await kubernetes.getWorkerPods();
    const jobs = normalizeWorkerJobs(jobsRaw, podsRaw, requests);
    const completedToDelete = completedMaxAgeHours == null ? [] : jobs.filter(j => j.completed && j.ageHours > completedMaxAgeHours);
    const failedToDelete = failedMaxAgeHours == null ? [] : jobs.filter(j => j.failed && j.ageHours > failedMaxAgeHours);
    const pendingToDelete = pendingMaxAgeHours ? jobs.filter(j => j.pod &&
        j.pod.unschedulable && (j.ageHours > pendingMaxAgeHours || !j.requested)) : [];
    const toDelete = [...pendingToDelete, ...completedToDelete, ...failedToDelete];

    log.info('Delete workers:');
    log.info(`delete failed jobs: ${failedToDelete.length}`);
    log.info(`delete completed: ${completedToDelete.length}`);
    log.info(`delete pending: ${pendingToDelete.length}`);
    for (const j of toDelete) { // eslint-disable-line no-restricted-syntax 
        await kubernetes.deleteJob(j.name); // eslint-disable-line no-await-in-loop
    }
};
const cleanPipelineDrivers = async ({ completedMaxAgeHours, failedMaxAgeHours, pendingMaxAgeHours } = {}) => {
    const jobsRaw = await kubernetes.getPipelineDriversJobs();
    const jobs = normalizeJobs(jobsRaw);
    const completedToDelete = completedMaxAgeHours == null ? [] : jobs.filter(j => j.completed && j.ageHours > completedMaxAgeHours);
    const failedToDelete = failedMaxAgeHours == null ? [] : jobs.filter(j => j.failed && j.ageHours > failedMaxAgeHours);
    const pendingToDelete = pendingMaxAgeHours ? jobs.filter(j => j.pod &&
        j.pod.unschedulable && (j.ageHours > pendingMaxAgeHours || !j.requested)) : [];
    const toDelete = [...pendingToDelete, ...completedToDelete, ...failedToDelete];

    log.info('Delete pipeline drivers:');
    log.info(`delete failed jobs: ${failedToDelete.length}`);
    log.info(`delete completed: ${completedToDelete.length}`);
    log.info(`delete pending: ${pendingToDelete.length}`);
    for (const j of toDelete) { // eslint-disable-line no-restricted-syntax 
        await kubernetes.deleteJob(j.name); // eslint-disable-line no-await-in-loop
    }
};
const cleanAlgorithmBuilders = async ({ completedMaxAgeHours, failedMaxAgeHours, pendingMaxAgeHours } = {}) => {
    const jobsRaw = await kubernetes.getAlgorithmBuilderJobs();
    const jobs = normalizeJobs(jobsRaw);
    const completedToDelete = completedMaxAgeHours == null ? [] : jobs.filter(j => j.completed && j.ageHours > completedMaxAgeHours);
    const failedToDelete = failedMaxAgeHours == null ? [] : jobs.filter(j => j.failed && j.ageHours > failedMaxAgeHours);
    const pendingToDelete = pendingMaxAgeHours ? jobs.filter(j => j.pod &&
        j.pod.unschedulable && (j.ageHours > pendingMaxAgeHours || !j.requested)) : [];
    const toDelete = [...pendingToDelete, ...completedToDelete, ...failedToDelete];

    log.info('Delete algorithm builders:');
    log.info(`delete failed jobs: ${failedToDelete.length}`);
    log.info(`delete completed: ${completedToDelete.length}`);
    log.info(`delete pending: ${pendingToDelete.length}`);
    for (const j of toDelete) { // eslint-disable-line no-restricted-syntax 
        await kubernetes.deleteJob(j.name); // eslint-disable-line no-await-in-loop
    }
};
const _cleanCallback = async (options) => {
    await cleanWorkers(options);
    await cleanPipelineDrivers(options);
    await cleanAlgorithmBuilders(options);
};

const init = async ({ cleanCron, completedMaxAgeHours, failedMaxAgeHours, pendingMaxAgeHours } = {}) => {
    log.info(`initializing cron with ${cleanCron}`);
    const cronJob = new CronJob(cleanCron, () => { // eslint-disable-line
        log.info('Clean started');
        _cleanCallback({ completedMaxAgeHours, failedMaxAgeHours, pendingMaxAgeHours });
    }, () => {
        log.info('Clean finished');
    }, true);

    await _cleanCallback({ completedMaxAgeHours, failedMaxAgeHours, pendingMaxAgeHours });
};

module.exports = {
    init
};
