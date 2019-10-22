const EventEmitter = require('events');
const Logger = require('@hkube/logger');
const KubernetesClient = require('@hkube/kubernetes-client').Client;
const component = require('../../common/consts/componentNames').K8S;
let log;

class KubernetesApi extends EventEmitter {
    async init(options = {}) {
        log = Logger.GetLogFromContainer();
        this._client = new KubernetesClient(options.kubernetes);
        log.info(`Initialized kubernetes client with options ${JSON.stringify({ ...options.kubernetes, url: this._client._config.url })}`, { component });
    }

    async deleteJob(jobName) {
        log.debug(`Deleting job ${jobName}`, { component });
        try {
            const body = {
                kind: 'DeleteOptions',
                apiVersion: 'batch/v1',
                propagationPolicy: 'Foreground'
            };
            const res = await this._client.jobs.delete({ jobName, body });
            return res;
        }
        catch (error) {
            log.error(`unable to delete job ${jobName}. error: ${error.message}`, { component }, error);
        }
        return null;
    }

    async deletePod(podName) {
        log.debug(`Deleting pod ${podName}`, { component });
        try {
            const res = await this._client.pods.delete({ podName });
            return res;
        }
        catch (error) {
            log.error(`unable to delete pod ${podName}. error: ${error.message}`, { component }, error);
        }
        return null;
    }

    async getJobsBySelector(type) {
        const jobsRaw = await this._client.jobs.get({ labelSelector: `type=${type},group=hkube` });
        return jobsRaw;
    }

    async getWorkerJobs() {
        return this.getJobsBySelector('worker');
    }

    async getPipelineDriversJobs() {
        return this.getJobsBySelector('pipeline-driver');
    }

    async getAlgorithmBuilderJobs() {
        return this.getJobsBySelector('algorithm-builder');
    }

    async getAlgorithmBuilderPods() {
        return this._client.pods.get({ labelSelector: 'type=algorithm-builder,group=hkube' });
    }

    async getWorkerPods() {
        return this._client.pods.get({ labelSelector: 'type=worker,group=hkube' });
    }
}

module.exports = new KubernetesApi();
