const EventEmitter = require('events');
const Logger = require('@hkube/logger');
const KubernetesClient = require('@hkube/kubernetes-client').Client;
const component = require('../consts/components').K8S;
const PodTypes = require('../consts/pod-types');
let log;

class KubernetesApi extends EventEmitter {
    async init(options = {}) {
        log = Logger.GetLogFromContainer();
        this._client = new KubernetesClient(options.kubernetes);
        log.info(`Initialized kubernetes client with options ${JSON.stringify({ ...options.kubernetes, url: this._client._config.url })}`, { component });
    }

    async deleteJob({ podName, jobName }) {
        log.debug(`Deleting job ${jobName}`, { component });
        let error;
        try {
            const body = {
                kind: 'DeleteOptions',
                apiVersion: 'batch/v1',
                propagationPolicy: 'Foreground'
            };
            await this._client.jobs.delete({ jobName, body });
        }
        catch (e) {
            log.error(`unable to delete job ${jobName}. error: ${e.message}`, { component }, e);
            error = e;
        }
        // if we didn't find the job we will try to delete the pod
        if (error && error.code === 404) {
            await this._tryToDeletePod(podName);
        }
    }

    async _tryToDeletePod(podName) {
        try {
            await this._client.pods.delete({ podName });
        }
        catch (e) {
            log.error(`unable to delete pod ${podName}. error: ${e.message}`, { component }, e);
        }
    }

    async getPodsBySelector(type) {
        return this._client.pods.get({ labelSelector: `type=${type},group=hkube` });
    }

    async getWorkerPods() {
        return this.getPodsBySelector(PodTypes.WORKER);
    }

    async getPipelineDriversPods() {
        return this.getPodsBySelector(PodTypes.PIPELINE_DRIVER);
    }

    async getAlgorithmBuilderPods() {
        return this.getPodsBySelector(PodTypes.ALGORITHM_BUILDER);
    }
}

module.exports = new KubernetesApi();
