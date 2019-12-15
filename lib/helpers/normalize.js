const moment = require('moment');

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

/**
 * For completed pods we check that all the containers has been terminated with exitCode 0
 * For failed pods we check that at least one is terminated with non-zero code or
 * at least one is terminated and one is not.
 */
const normalizePods = (podsRaw, requestsRaw) => {
    if (!podsRaw || !podsRaw.body || !podsRaw.body.items) {
        return [];
    }
    const requests = requestsRaw && normalizeRequests(requestsRaw);
    const pods = podsRaw.body.items.map((p) => {
        const cs = p.status.containerStatuses || [];
        const completed = cs.every(c => c.state.terminated && c.state.terminated.exitCode === 0);
        const failed = cs.some(c => c.state.terminated && c.state.terminated.exitCode !== 0)
            || (cs.some(c => c.state.terminated) && cs.some(c => !c.state.terminated));

        const conditions = !(p.status && p.status.conditions) ? [] : p.status.conditions.map(c => ({
            unschedulable: c.reason === 'Unschedulable'
        }));
        const unschedulable = conditions.some(c => c.unschedulable);
        const algorithmName = p.metadata.labels['algorithm-name'];
        const requested = requests && requests[algorithmName] > 0;
        const ageHours = moment().diff(moment(p.status.startTime), 'hours', true);

        return {
            podName: p.metadata.name,
            jobName: p.metadata.labels['job-name'],
            failed,
            completed,
            unschedulable,
            requested,
            ageHours
        };
    });
    return pods;
};

module.exports = {
    normalizePods
};
