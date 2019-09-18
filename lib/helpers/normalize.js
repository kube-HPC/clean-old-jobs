const moment = require('moment');
const objectPath = require('object-path');

const normalizeRequests = (requests) => {
    if (requests == null || requests.length === 0 || requests[0].data == null) {
        return [];
    }

    const reqArray = requests[0].data.map(r => ({ algorithmName: r.name }));
    const requestedTypes = reqArray.reduce((prev, cur) => {
        prev[cur.algorithmName] = (prev[cur.algorithmName] || 0) + 1; // eslint-disable-line
        return prev;
    }, {});
    return requestedTypes;
};

const normalizeJobs = (jobsRaw, predicate = () => true) => {
    if (!jobsRaw || !jobsRaw.body || !jobsRaw.body.items) {
        return [];
    }
    const jobs = jobsRaw.body.items.filter(predicate).map((j) => {
        let ageHours = 0;
        const completed = objectPath.get(j, 'status.conditions', []).find(i => i.type === 'Complete');
        const failed = objectPath.get(j, 'status.conditions', []).find(i => i.type === 'Failed');
        ageHours = moment().diff(moment(j.status.startTime), 'hours', true);
        return {
            name: j.metadata.name,
            active: j.status.active === 1,
            failed: !!failed,
            completed: !!completed,
            ageHours,
        };
    });
    return jobs;
};

const normalizeWorkerJobs = (jobsRaw, podsRaw, requestsRaw, predicate = () => true) => {
    const requests = normalizeRequests(requestsRaw);
    if (!jobsRaw || !jobsRaw.body || !jobsRaw.body.items) {
        return [];
    }
    const pods = podsRaw.body.items.map((p) => {
        const containers = !(p.status && p.status.containerStatuses) ? [] : p.status.containerStatuses.map((c) => {
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
        const conditions = !(p.status && p.status.conditions) ? [] : p.status.conditions.map(c => ({
            unschedulable: c.reason === 'Unschedulable'
        }));
        return {
            jobName: p.metadata.labels['job-name'],
            phase: p.status.phase,
            name: p.metadata.name,
            failed: containers.find(x => x.state === 'terminated' && x.exitCode !== 0),
            unschedulable: conditions.find(x => x.unschedulable) != null,
            containers
        };
    });

    const jobs = jobsRaw.body.items.filter(predicate).map((j) => {
        let ageHours = 0;
        const algorithmName = j.metadata.labels['algorithm-name'];
        const requested = requests[algorithmName] > 0;
        const pod = pods.find(i => i.jobName === j.metadata.name);
        const completed = objectPath.get(j, 'status.conditions', []).find(i => i.type === 'Complete');
        const failed = objectPath.get(j, 'status.conditions', []).find(i => i.type === 'Failed') || (pod && pod.failed);
        ageHours = moment().diff(moment(j.status.startTime), 'hours', true);
        return {
            name: j.metadata.name,
            algorithmName,
            active: j.status.active === 1,
            failed: !!failed,
            completed: !!completed,
            requested,
            ageHours,
            pod
        };
    });
    return jobs;
};

module.exports = {
    normalizeJobs,
    normalizeWorkerJobs
};
