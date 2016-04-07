var http=require('http');
var request = require('request');
var schedule = require('node-schedule');
var exec = require('child_process').exec;
 
/////Config Settings
var tillServerUrl = 'http://192.168.0.17:8088/';
var guiServerUrl = 'http://localhost:3000';
var callName = 'CardScanned';
//var cachedCallName = null; // 'CardScannedDelayed';
var serviceType = 'MealController';
var tillId=  '565924f5-bef0-4fdb-923d-ba480b2b5716'; //'5f652104-485b-4f98-a712-370d7f579e68'; ///'e1213a3e-1599-43ae-b71b-5c95bae16548';
//////End Config Settings


//globals
var CONNECTION_ERROR = 'Connection Issue';	
	
//client websocket
var socket = require('socket.io-client')(guiServerUrl);
socket.on('connect', function(){
	console.log("connected bitches!!!!");
	socket.emit('displayMessage', "Reader Starting....");
});
socket.on('disconnect', function(){
	console.log("disconnected bitches!!!!");
	socket.emit('displayMessage', "Reader Disconnected!!!");	
	while (!socket.connected) {
		setTimeout(socket.connect());		
	}
});
socket.on('event', function(data){});
socket.connect();

//comms classes
function MethodInvocation() {
	var self=this;
	self.MemberName = callName;
	self.ServiceType = serviceType;
	//self.DateSubmitted = new Date();
	//self.DateReceived = new Date();
	self.ParameterValues = [];
}
function ScanResult(){
	var self=this;
	self.Success=false;
	self.Message='';
	self.ErrorMessage='';
	self.ErrorClass='';
}
function ScanDetails(){
	var self = this;	
	self.Call = '';
	self.TimeStamp = new Date();
}

function FireGPIO() {
	var self = this;
	self.fire = function() {
		console.log("Set Relay On!");
		exec('sh gpio_start.sh'); 
		setTimeout(function() {
			console.log("Set Relay Off!");
			exec('sh gpio_stop.sh');
		}, 1000 );
	};	
};
 
//the card reader class
function CardReader(){
	var self=this;
	self.dopost = function(url,data) {
		//NB!! data is stringified JSON
	//Lets configure and request
		request({
			url: url, 
			method: 'POST',
			form: data,
			timeout: 20000
		}, function(error, response, body){
			if(error) {
				var errorResult = new ScanResult();
				errorResult.ErrorMessage = error.message; 
				errorResult.ErrorClass = CONNECTION_ERROR;
				self.ShowResult(data, errorResult);
			} else {
				self.ShowResult(data, JSON.parse(body));
			}
		});
	};
	self.CardScanned = function(scanDetails){			
		//scanDetails.Call.DateSubmitted = new Date();
		console.log('Card Scanned',scanDetails);
		self.dopost(tillServerUrl, scanDetails);
	};
	self.ShowResult = function(requestDetails, scanResult){
		console.log('ScanResult: ' + JSON.stringify(scanResult));
		//requestDetails = JSON.parse(requestDetails.Call);
		var requestBody = JSON.parse(requestDetails.Call);
		console.log('Request Details: ' + requestDetails);
		//scanResult = JSON.parse(scanResult);
		if (scanResult.ErrorClass == CONNECTION_ERROR) {
			//if (requestBody.MemberName != cachedCallName) {
			//	if (cachedCallName) {
			//		offlineCache.push(requestDetails);
			//	}
				socket.emit('displayMessage', scanResult);
			//}						
		} else {
				socket.emit('displayMessage', scanResult);
				if (scanResult.Success) {
					fireIO.fire();
				}
			//if (requestBody.MemberName != cachedCallName) {				
			//} else {
			//	offlineCache.splice(offlineCache.indexOf(requestDetails));				
			//}						
		}
	};
}
console.log('Running...');

var cardReader = new CardReader();
var fireIO = new FireGPIO();

// offline caching....
//if (cachedCallName) {
//	var offlineCache = [];
//	var j = schedule.scheduleJob('* * * * *', function(){
//  		console.log('Cache bitches: ' + offlineCache.length);
//		for (var i = 0; i < offlineCache.length; i++) {
//			var data = offlineCache[i];
//			console.log("Cached Call: " + data.Call.MemberName);			
//			data.Call.MemberName = cachedCallName;	
//			debugger;
//			cardReader.CardScanned(data);
//		}		  
//	});
//}

socket.on('cardScanned', function(cardId){
	console.log("cardScanned: " + cardId);
	var methodInvocation = new MethodInvocation();
	methodInvocation.ParameterValues=[tillId,cardId];
	//must send in this format
	var data={ 'Call': JSON.stringify(methodInvocation)};
	cardReader.CardScanned(data);
});

