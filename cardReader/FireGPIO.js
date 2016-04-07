//run the external program
var exec = require('child_process').exec;

function FireGPIO() {
	var self = this;
	self.fire = function() {
		console.log("Set Relay On!");
		exec('sh gpio_start.sh'); 
		setTimeout(function() {
			console.log("Set Relay Off!");
			exec('sh gpio_stop.sh');
		}, 3000 );
	};	
};

module.exports = new FireGPIO();



