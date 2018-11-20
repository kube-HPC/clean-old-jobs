const kubernetes = require('./helpers/kubernetes');
const Logger = require('@hkube/logger');
const log = Logger.GetLogFromContainer();
const { normalizeJobs } = require('./helpers/normalize');

const cleanOldJobs = async ({ completedMaxAgeHours, failedMaxAgeHours } = {}) => {
    const jobsRaw = await kubernetes.getWorkerJobs();
    const podsRaw = await kubernetes.getWorkerPods();
    const jobs = normalizeJobs(jobsRaw, podsRaw);
    const completedToDelete = completedMaxAgeHours == null ? [] : jobs.filter(j => j.completed && j.ageHours > completedMaxAgeHours);
    const failedToDelete = failedMaxAgeHours == null ? [] : jobs.filter(j => j.failed && j.ageHours > failedMaxAgeHours);
    const toDelete = [...completedToDelete, ...failedToDelete];

    log.info(`delete failed: ${JSON.stringify(failedToDelete, null, 2)}`);
    log.info(`delete completed: ${JSON.stringify(completedToDelete, null, 2)}`);
    for (const j of toDelete) { // eslint-disable-line no-restricted-syntax 
        await kubernetes.deleteJob(j.name); // eslint-disable-line no-await-in-loop
    }
};

module.exports = {
    cleanOldJobs
};
