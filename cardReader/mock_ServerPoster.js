var comms = require('./ServerComms.js');

//globals
var CONNECTION_ERROR = 'Connection Issue';	
var MEAL_TIME_ERROR = 'Meal Time Error';
var MEAL_TIMES_TAKEN = 'Meals already taken for this period';

var counter = 0;

function MockServerPoster() {
	var self = this;
	self.doPost = function(url,data, callback) {
		//check the rules - data should be stringified JSON
		console.log("Posting: " + JSON.stringify(data));
		//var test = JSON.parse(data);

		var result = new comms.ScanResult;

		if (counter % 5 == 0) {
			//online
			result.ErrorMessage = MEAL_TIMES_TAKEN; 
			result.ErrorClass = MEAL_TIME_ERROR;
		}
		else if (counter % 5 == 1) {
			//online; server error
			result.Success = true;
			result.Message = 'Thank you!!';
		}
		else {
			//offline
			result.ErrorMessage = "Socket Timeout"; 
			result.ErrorClass = CONNECTION_ERROR;
		}
		console.log("Response: " + result);
		//self.ShowResult(data, result);			
		callback(data, result);			
		counter++;
	};
}

module.exports = new MockServerPoster();
