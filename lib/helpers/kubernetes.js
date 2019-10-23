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

    async getPodsBySelector(type) {
        return this._client.pods.get({ labelSelector: `type=${type},group=hkube` });
    }

    async getWorkerPods() {
        return this.getPodsBySelector('worker');
    }

    async getPipelineDriversPods() {
        return this.getPodsBySelector('pipeline-driver');
    }

    async getAlgorithmBuilderPods() {
        return this.getPodsBySelector('algorithm-builder');
    }
}

module.exports = new KubernetesApi();
