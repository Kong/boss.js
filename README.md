# Jobalancer.js

Automatically load balance asyncronous jobs across multiple processes in a round-robin fashion.

# Installation

```bash
npm install jobalancer
```

# Usage

```javascript
var Jobalancer = require('jobalancer');

var execution = new Jobalancer.Execution(function(context) {
	
	// Master process code. Use context.dispatch(message) to send a message to a worker.

}, function(message) {
	
	// Worker code. The "message" argument is the message object to handle.
	
}, options);

execution.start(); // Start the execution
```

## Options

* `debug`: Set to `true` to enable debugging console information
* `workers`: The number of workers to execute. If not specified, the total number of cores will be used.

# Example

```javascript
var Jobalancer = require('jobalancer');

var execution = new Jobalancer.Execution(function (context) {
  // Define the master process code here
  var index = 0;
  setInterval(function () {
    context.dispatch({
      num: index++
    });
  }, 0);
}, function (message) {
  // Define the worker code here
  console.log(process.pid + " received number " + { message.num });
}, {
  debug: true, 
  workers: 6
});

execution.start();
```

# License

The MIT License

Copyright (c) 2013 Mashape (http://mashape.com)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
