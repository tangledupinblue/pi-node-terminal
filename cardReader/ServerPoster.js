var http=require('http');
var request = require('request');
var comms = require('./ServerComms.js');

//globals
var CONNECTION_ERROR = 'Connection Issue';	
var MEAL_TIME_ERROR = 'Meal Time Error';
var MEAL_TIMES_TAKEN = 'Meals already taken for this period';

var counter = 0;

function ServerPoster() {
	var self = this;
	self.timeout = 20000;
	self.doPost = function(url, data, callback) {
		//NB!! data is stringified JSON
		request({
			url: url, 
			method: 'POST',
			form: data,
			timeout: self.timeout
		}, function(error, response, body){
			var result = new comms.ScanResult();
			if(error) {
				result.ErrorMessage = error.message; 
				result.ErrorClass = CONNECTION_ERROR;
			} else {
				result = JSON.parse(body);
			}
			callback(data, result);			
		});
	};
}

module.exports = new ServerPoster();

