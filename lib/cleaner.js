const kubernetes = require('./helpers/kubernetes');
const etcd = require('./helpers/etcd');
const Logger = require('@hkube/logger');
const { CronJob } = require('cron');
const log = Logger.GetLogFromContainer();
const { normalizeJobs } = require('./helpers/normalize');


const _cleanCallback = async ({ completedMaxAgeHours, failedMaxAgeHours, pendingMaxAgeHours } = {}) => {
    const requests = await etcd.getAlgorithmRequests();
    const jobsRaw = await kubernetes.getWorkerJobs();
    const podsRaw = await kubernetes.getWorkerPods();
    const jobs = normalizeJobs(jobsRaw, podsRaw, requests);
    const completedToDelete = completedMaxAgeHours == null ? [] : jobs.filter(j => j.completed && j.ageHours > completedMaxAgeHours);
    const failedToDelete = failedMaxAgeHours == null ? [] : jobs.filter(j => j.failed && j.ageHours > failedMaxAgeHours);
    const pendingToDelete = pendingMaxAgeHours ? jobs.filter(j => j.pod &&
        j.pod.unschedulable && (j.ageHours > pendingMaxAgeHours || !j.requested)) : [];
    const toDelete = [...pendingToDelete, ...completedToDelete, ...failedToDelete];

    log.info(`delete failed jobs: ${failedToDelete.length}`);
    log.info(`delete completed: ${completedToDelete.length}`);
    log.info(`delete pending: ${pendingToDelete.length}`);
    for (const j of toDelete) { // eslint-disable-line no-restricted-syntax 
        await kubernetes.deleteJob(j.name); // eslint-disable-line no-await-in-loop
    }
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
