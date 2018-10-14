const moment = require('moment');
const objectPath = require('object-path');
const normalizeJobs = (jobsRaw, podsRaw, predicate = () => true) => {
    if (!jobsRaw || !jobsRaw.body || !jobsRaw.body.items) {
        return [];
    }
    const pods = podsRaw.body.items.map((p) => {
        const containers = p.status.containerStatuses.map((c) => {
            const entries = Object.entries(c.state)[0];
            return {
                id: c.containerID,
                name: c.name,
                state: entries[0],
                reason: entries[1].reason,
                message: entries[1].message,
                exitCode: entries[1].exitCode
            };
        });
        return {
            jobName: p.metadata.labels['job-name'],
            phase: p.status.phase,
            name: p.metadata.name,
            failed: containers.find(x => x.state === 'terminated' && x.exitCode !== 0),
            containers
        };
    });

    const jobs = jobsRaw.body.items.filter(predicate).map((j) => {
        let ageHours = 0;
        const pod = pods.find(i => i.jobName === j.metadata.name);
        const completed = objectPath.get(j, 'status.conditions', []).find(i => i.type === 'Complete');
        const failed = objectPath.get(j, 'status.conditions', []).find(i => i.type === 'Failed') || (pod && pod.failed);
        ageHours = moment().diff(moment(j.status.startTime), 'hours', true);
        return {
            name: j.metadata.name,
            algorithmName: j.metadata.labels['algorithm-name'],
            active: j.status.active === 1,
            failed: !!failed,
            completed: !!completed,
            ageHours,
            pod
        };
    });
    return jobs;
};

module.exports = {
    normalizeJobs
};
