var cluster = require('cluster'),
	colors = require('colors');

var numCPUs = require('os').cpus().length;

var NAME = "Jobalancer.js";
var MSG_SOURCE = "jobalancer";

var COMPLETED = 1;

var Jobalancer = module.exports = exports = {};

Jobalancer.Execution = function (masterFunction, workerFunction, config) {
   this._masterFunction = masterFunction;
   this._workerFunction = workerFunction;
   this._workers = [];
   this._config = (config) ? config : {};
   this._running = 0; // Running jobs
};

Jobalancer.Execution.prototype.start = function () {
	var $this = this;
	if (cluster.isMaster) {
		this._log("Master started with PID " + process.pid);
		var numWorkers = (this._config.workers) ? this._config.workers : numCPUs;
		if (numWorkers < 1) {
			this._log("Warning: at least one worker needed. Setting 'workers' property to '1'");
			numWorkers = 1;
		}
 		for (var i = 0; i < numWorkers; i++) {
			this._workers.push(this._startWorker());
		}
		cluster.on('exit', function(worker) {
			$this._log("Worker " + worker.process.pid + " died. Restarting..");
			$this._deleteWorker(worker);
			$this._workers.push($this._startWorker());
		});
		Object.keys(cluster.workers).forEach(function(id) {
		    cluster.workers[id].on('message', function(msg) {
				if (msg.source == MSG_SOURCE && msg.body == COMPLETED) {
					$this._running--;
				}
		    });
		});
		
		var context = {
			dispatch: function(job) {
				$this._running++;
				$this._getNextWorker().send({source:MSG_SOURCE, body:job});
			},
			getRunning: function() {
				return $this._running;
			},
			isAvailable: function() {
				return $this._running < numWorkers;
			}
		}
		
		this._masterFunction(context);
	} else {
		process.on('message', function(msg) {
			if (msg.source == MSG_SOURCE) {
				$this._workerFunction(msg.body, function() {
					// Notify master that the process is completed
					process.send({source:MSG_SOURCE, body:COMPLETED});
				});
			}
		});
	}
};

Jobalancer.Execution.prototype._deleteWorker = function (worker) {
	for(var i =0;i<this._workers.length;i++) {
		if (this._workers[i].process.pid == worker.process.pid) {
			this._workers.splice(i, 1);
			break;
		}
	}
}

Jobalancer.Execution.prototype._startWorker = function() {
	var worker = cluster.fork();
	this._log("Worker started with PID " + worker.process.pid);
	return worker;
}

Jobalancer.Execution.prototype._log = function (message) {
	if (this._config.debug) {
		console.log(("[" + NAME + "] ").green + message.grey);
	}
}

Jobalancer.Execution.prototype._getNextWorker = function () {
	var worker = this._workers.shift();
	this._workers.push(worker);
	return worker;
}