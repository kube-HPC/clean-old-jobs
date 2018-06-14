const moment = require('moment');
const objectPath = require('object-path');
const normalizeJobs = (jobsRaw, predicate = () => true) => {
    if (!jobsRaw || !jobsRaw.body || !jobsRaw.body.items) {
        return [];
    }
    const jobs = jobsRaw.body.items
        .filter(predicate)
        .map((j) => {
            const completed = objectPath.get(j, 'status.conditions', []).find(i => i.type === 'Complete');
            const failed = objectPath.get(j, 'status.conditions', []).find(i => i.type === 'Failed');
            let ageHours = 0;
            if (failed) {
                ageHours = moment().diff(moment(failed.lastTransitionTime), 'hours', true);
            }
            else if (completed) {
                ageHours = moment().diff(moment(j.status.completionTime), 'hours', true);
            }
            return {
                name: j.metadata.name,
                algorithmName: j.metadata.labels['algorithm-name'],
                active: j.status.active === 1,
                failed: !!failed,
                completed: !!completed,
                ageHours

            };
        });
    return jobs;
};

module.exports = {
    normalizeJobs
};
