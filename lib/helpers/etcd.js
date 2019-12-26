const EventEmitter = require('events');
const EtcdClient = require('@hkube/etcd');
const Logger = require('@hkube/logger');
let log;

class Etcd extends EventEmitter {
    constructor() {
        super();
        this._etcd = null;
    }

    async init(options) {
        log = Logger.GetLogFromContainer();
        this._etcd = new EtcdClient(options.etcd);
        log.info(`Initializing etcd with options: ${JSON.stringify(options.etcd)}`);
        await this._etcd.jobs.status.watch({ jobId: 'hookWatch' });
    }

    async getAlgorithmRequests() {
        const options = {
            name: 'data'
        };
        return this._etcd.algorithms.requirements.list(options);
    }
}

module.exports = new Etcd();
