const EventEmitter = require('events');
const Logger = require('@hkube/logger');
const kubernetesClient = require('kubernetes-client');
const objectPath = require('object-path');
const component = require('../../common/consts/componentNames').K8S;
let log;

class KubernetesApi extends EventEmitter {
    async init(options = {}) {
        const k8sOptions = options.kubernetes || {};
        log = Logger.GetLogFromContainer();
        let config;
        if (!k8sOptions.isLocal) {
            try {
                config = kubernetesClient.config.fromKubeconfig();
            }
            catch (error) {
                log.error(`Error initializing kubernetes. error: ${error.message}`, { component }, error);
                return;
            }
        }
        else {
            config = kubernetesClient.config.getInCluster();
        }
        log.info(`Initialized kubernetes client with options ${JSON.stringify({ options: options.kubernetes, url: config.url })}`, { component });
        this._client = new kubernetesClient.Client({ config, version: '1.9' });
        this._namespace = k8sOptions.namespace;
    }

    async deleteJob(jobName) {
        log.debug(`Deleting job ${jobName}`, { component });
        try {
            const res = await this._client.apis.batch.v1.namespaces(this._namespace).jobs(jobName).delete({
                body: {
                    kind: 'DeleteOptions',
                    apiVersion: 'batch/v1',
                    propagationPolicy: 'Foreground'
                }
            });
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
            const res = await this._client.api.v1.namespaces(this._namespace).pods(podName).delete();
            return res;
        }
        catch (error) {
            log.error(`unable to delete pod ${podName}. error: ${error.message}`, { component }, error);
        }
        return null;
    }

    async getJobsBySelector(type) {
        const jobsRaw = await this._client.apis.batch.v1.namespaces(this._namespace).jobs().get({ qs: { labelSelector: `type=${type},group=hkube` } });
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
    async getPodsForJob(job) {
        if (!job) {
            return [];
        }
        const podSelector = objectPath.get(job, 'spec.selector.matchLabels');
        if (!podSelector) {
            return [];
        }
        const pods = await this._client.api.v1.namespaces(this._namespace).pods().get({ qs: { labelSelector: podSelector } });
        return pods;
    }

    async getWorkerPods() {
        return this._client.api.v1.namespaces(this._namespace).pods().get({ qs: { labelSelector: 'type=worker,group=hkube' } });
    }
}

module.exports = new KubernetesApi();
