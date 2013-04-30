var cluster = require('cluster'),
	colors = require('colors');

var numCPUs = require('os').cpus().length;

var NAME = "Jobs.js";
var MSG_SOURCE = "jobs.js";

var Jobs = module.exports = exports = {};

Jobs.Execution = function (masterFunction, workerFunction, config) {
   this._masterFunction = masterFunction;
   this._workerFunction = workerFunction;
   this._workers = [];
   this._config = (config) ? config : {};
};

Jobs.Execution.prototype.start = function () {
	var $this = this;
	if (cluster.isMaster) {
		this._log("Master started with PID " + process.pid);
		var numWorkers = (this._config.workers) ? this._config.workers : numCPUs;
 		for (var i = 0; i < numWorkers; i++) {
			this._workers.push(this._startWorker());
		}
		cluster.on('exit', function(worker) {
			$this._log("Worker " + worker.process.pid + " died. Restarting..");
			$this._deleteWorker(worker);
			$this._workers.push($this._startWorker());
		});
		var context = {};
		context.dispatch = function(job) {
			$this._getNextWorker().send({source:MSG_SOURCE, body:job});
		};
		this._masterFunction(context);
	} else {
		process.on('message', function(msg) {
			if (msg.source == MSG_SOURCE) {
				$this._workerFunction(msg.body);
			}
		});
	}
};

Jobs.Execution.prototype._deleteWorker = function (worker) {
	for(var i =0;i<this._workers.length;i++) {
		if (this._workers[i].process.pid == worker.process.pid) {
			this._workers.splice(i, 1);
			break;
		}
	}
}

Jobs.Execution.prototype._startWorker = function() {
	var worker = cluster.fork();
	this._log("Worker started with PID " + worker.process.pid);
	return worker;
}

Jobs.Execution.prototype._log = function (message) {
	if (this._config.debug) {
		console.log(("[" + NAME + "] ").green + message.grey);
	}
}

Jobs.Execution.prototype._getNextWorker = function () {
	var worker = this._workers.shift();
	this._workers.push(worker);
	return worker;
}