var cluster = require('cluster'),
	colors = require('colors'),
	EventEmitter = require('events').EventEmitter;

var numCPUs = require('os').cpus().length;

var NAME = "Boss.js";
var MSG_SOURCE = "boss";

var COMPLETED = 1;
var JOB = 2;
var DECREMENT = 3;
var MASTER = 4;
var READY = 5;

var Boss = module.exports = exports = new EventEmitter();

Boss.Execution = function (masterFunction, workerFunction, config) {
   this._masterFunction = masterFunction;
   this._workerFunction = workerFunction;
   this._workers = [];
   this._masterWorker = null;
   this._readyWorkers = 0;
   this._config = (config) ? config : {};
   this._running = 0; // Running jobs
};

Boss.Execution.prototype.start = function () {
	var $this = this;
	if (cluster.isMaster) {
		var numWorkers = (this._config.jobWorkers) ? this._config.jobWorkers + 1 : numCPUs;
		if (numWorkers < 2) {
			this._log(("Warning: at least two workers needed. Setting 'workers' property to '2'").yellow);
			numWorkers = 2;
		}
		if (numWorkers > numCPUs) {
			this._log(("You're using " + numWorkers + " processes (" + (numWorkers - 1) + " child workers and 1 master worker) while having only " + numCPUs + " CPU cores. Decreasing the number of workers.").red);
			process.exit(1);
		}
		
		this._log(("Starting application with " + (numWorkers - 1) + " child workers and 1 master worker.").green);
		this._log("Application started with PID " + process.pid);
		
 		for (var i = 0; i < numWorkers; i++) {
			this._workers.push(this._startWorker());
		}
		
		this._masterWorker = this._workers.shift();
		this._masterWorker
		this._log("The MASTER status was assigned to " + this._masterWorker.process.pid);
		
		cluster.on('exit', function(worker) {
			if (worker.process.pid == $this._masterWorker.process.pid) {
				$this._log(("The MASTER worker has died (" + worker.process.pid + "). Exiting.").red);
				process.exit(1);
			}
			$this._log(("Worker " + worker.process.pid + " died. Restarting..").yellow);
			$this._deleteWorker(worker);
			$this._workers.push($this._startWorker());
		});
		
		Boss.on('ready', function() {
			// Tell the master worker that is a master worker
			$this._masterWorker.send({source:MSG_SOURCE, type:MASTER, numWorkers:numWorkers});
		});
	} else {
		var isMasterWorker = false;		
		var numWorkers = 0;
		process.on('message', function(msg) {
			// Only handle Boss messages
			if (msg && msg.source == MSG_SOURCE) {
				if (msg.type == JOB && !isMasterWorker) {
					$this._workerFunction(msg.body, function() {
						// Notify master that the process is completed
						process.send({source:MSG_SOURCE, type:COMPLETED});
					});
				} else if (msg.type == MASTER) {
					isMasterWorker = true;
					numWorkers = msg.numWorkers;
					var context = {
						dispatch: function(job) {
							$this._running++;
							// Send process to Master, so it can assign it to a worker
							process.send({source:MSG_SOURCE, type:JOB, body:job});
						},
						getRunning: function() {
							return $this._running;
						},
						isAvailable: function() {
							return $this._running < numWorkers - 1; // One worker is the master
						}
					}
					
					$this._masterFunction(context);
				} else if (msg.type == DECREMENT) {
					$this._running--;
				}
				
			}	
		});
		
		// Notify that the worker is ready
		process.send({source:MSG_SOURCE, type:READY});
	}
};

Boss.Execution.prototype._deleteWorker = function (worker) {
	for(var i =0;i<this._workers.length;i++) {
		if (this._workers[i].process.pid == worker.process.pid) {
			this._workers.splice(i, 1);
			break;
		}
	}
}

Boss.Execution.prototype._startWorker = function() {
	$this = this;
	var worker = cluster.fork();
	worker.on('message', function(msg) {
		if (msg && msg.source == MSG_SOURCE) {
			if (msg.type == COMPLETED) {
				$this._masterWorker.send({source:MSG_SOURCE, type:DECREMENT});
			} else if (msg.type == JOB) {
				$this._getNextWorker().send({source:MSG_SOURCE, type:JOB, body:msg.body});
			} else if (msg.type == READY) {
				$this._readyWorkers++;
				if ($this._readyWorkers == $this._workers.length + 1) {
					Boss.emit('ready');
				}
			}
		}
	});
	this._log("Worker started with PID " + worker.process.pid);
	return worker;
}

Boss.Execution.prototype._log = function (message) {
	if (this._config.debug) {
		console.log(("[" + NAME + "] ").green + message.grey);
	}
}

Boss.Execution.prototype._getNextWorker = function () {
	var worker = this._workers.shift();
	this._workers.push(worker);
	return worker;
}
