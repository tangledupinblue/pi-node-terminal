var http=require('http');
var request = require('request');
var schedule = require('node-schedule');
 
 
/////Config Settings
var tillServerUrl = 'http://devserver2012.scantracksa.com:8088/';
var guiServerUrl = 'http://localhost:3000';
var callName = 'CardScanned';
var cachedCallName = 'CardScannedDelayed';
var serviceType = 'MealController';
var tillId='e1213a3e-1599-43ae-b71b-5c95bae16548';
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
	self.DateSubmitted = new Date();
	self.DateReceived = new Date();
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

//the card reader class
function CardReader(){
	var self=this;
	self.dopost = function(url,data) {
	//Lets configure and request
		request({
			url: url, 
			method: 'POST',
			form: data,
			timeout: 5000
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
		console.log('Card Scanned',scanDetails);
		scanDetails.Call.DateSubmitted = new Date();
		self.dopost(tillServerUrl, scanDetails);
	};
	self.ShowResult = function(requestDetails, scanResult){
		console.log('ScanResult: ' + JSON.stringify(scanResult));
		if (scanResult.ErrorClass == CONNECTION_ERROR) {
			if (requestDetails.Call.MemberName != cachedCallName) {
				offlineCache.push(requestDetails);
				socket.emit('displayMessage', scanResult);
			}						
		} else {
			if (requestDetails.Call.MemberName != cachedCallName) {				
				socket.emit('displayMessage', scanResult);
			} else {
				offlineCache.splice(offlineCache.indexOf(requestDetails));				
			}						
		}
	};
}
console.log('Running...');

var cardReader = new CardReader();

// offline caching....
if (cachedCallName) {
	var offlineCache = [];
	var j = schedule.scheduleJob('* * * * *', function(){
  		console.log('Cache bitches: ' + offlineCache.length);
		for (var i = 0; i < offlineCache.length; i++) {
			var data = offlineCache[i];
			console.log("Cached Call: " + data.Call.MemberName);			
			data.Call.MemberName = cachedCallName;	
			debugger;
			cardReader.CardScanned(data);
		}		  
	});
}

socket.on('cardScanned', function(cardId){
	console.log("cardScanned: " + cardId);
	var methodInvocation = new MethodInvocation();
	methodInvocation.ParameterValues=[tillId,cardId];
	var data={ 'Call':methodInvocation};
	cardReader.CardScanned(data);
});

