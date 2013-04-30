/*var Jobalancer = require('./lib/jobalancer');

var execution = new Jobalancer.Execution(function (context) {
  // Define the master process code here
  var index = 0;
  setInterval(function () {
	if (context.isAvailable()) {
    context.dispatch({
      num: index++
    });
  }
  }, 0);
}, function (message, next) {
  // Define the worker code here
  console.log(process.pid + " received number " + message.num);
  
  setTimeout(function() {
	  next();
  }, 1000);
}, {
  debug: true, 
  workers: 6
});

execution.start();
*/
var Jobalancer = require('./lib/jobalancer');

var execution = new Jobalancer.Execution(function (context) {
  // Define the master process code here
  var index = 0;
  setInterval(function () {
	if (context.isAvailable()) { // Only execute if a worker is available
      context.dispatch({
        num: index++
      });
    }
  }, 0);
}, function (message, next) {
  // We're simulating a 1s delay in the worker execution
  setTimeout(function() {
    console.log(process.pid + " received number " + message.num);
    next();
  }, 1000);
}, {
  debug: true, 
  workers: 6
});

execution.start();