var fireIO = require('./FireGPIO.js');
var comms = require('./ServerComms.js');
//var serverPoster = require('./mock_ServerPoster.js');
var serverPoster = require('./ServerPoster.js');
var schedule = require('node-schedule');
var path = require('path');
var fs = require('fs');
var Datastore = require('nedb');

/////Config Settings
var tillServerUrl = 'http://192.168.0.17:8088/';
var guiServerUrl = 'http://localhost:3000';
var callName = 'CardScanned';
var cachedCallName = 'CardScannedDelayed';
var serviceType = 'MealController';
var tillId = '5f652104-485b-4f98-a712-370d7f579e68';    //'565924f5-bef0-4fdb-923d-ba480b2b5716'; //'5f652104-485b-4f98-a712-370d7f579e68'; ///'e1213a3e-1599-43ae-b71b-5c95bae16548';
var postTimeout = 3000;
var offlineMessage = "Access Granted (offline)";
var successMessage = "Access Granted";
//write the files to a location and watch for scans
var scanWriteLocation = "/home/barrys/temp";
//////End Config Settings

var overrideSettings = __dirname + '/../../cardReaderOverride.js';
if (fs.existsSync(overrideSettings)) {
	var overrides = require('../../cardReaderOverride.js').overrides;
	console.log(overrides);
	if (overrides) {
		if ("tillServerUrl" in overrides ) { tillServerUrl = overrides["tillServerUrl"]};
		if ("tillId" in overrides) { tillId = overrides["tillId"]};
		if ("offlineMessage" in overrides ) { offlineMessage = overrides["offlineMessage"]};
		if ("successMessage" in overrides ) { successMessage = overrides["successMessage"]};		
		if ("scanWriteLocation" in overrides ) { scanWriteLocation = overrides["scanWriteLocation"]};		
	}
}

console.log(tillServerUrl);
console.log(tillId);

var offlineCache = [];

console.log(fireIO);
console.log(serverPoster);

//offline cache
var	db_cache = new Datastore({filename: __dirname + '/db/trans'});
db_cache.loadDatabase(function(err) {
	console.log("Error opening database:" + err);
});

//client websocket
var socket = require('socket.io-client')(guiServerUrl);
socket.on('connect', function(){
	console.log("connected!!!!");
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

serverPoster.timeout = postTimeout;
//the card reader class
function CardReader(serverPoster){
	var self = this;
	self.serverPoster = serverPoster;
//	self.doPost = function(url, data, callback) {
//		//NB!! data is stringified JSON
//		serverPoster.doLivePost(url, data, callback);  //, callback(null, data));			
//	};
	self.CardScanned = function(scanDetails) {			
		//scanDetails.Call.DateSubmitted = new Date();
		console.log('Card Scanned',scanDetails);
		//self.doPost(tillServerUrl, scanDetails, self.ShowResult);
		self.serverPoster.doPost(tillServerUrl, scanDetails, self.ShowResult);  			
	};	
	self.ShowResult = function(scanDetails, scanResult) {
		console.log('ScanResult: ' + JSON.stringify(scanResult));
		console.log('Request Details: ' + JSON.stringify(scanDetails));
		if (scanResult.ErrorClass == comms.CONNECTION_ERROR) {
			socket.emit('displayMessage', scanResult);
			if (cachedCallName) {
				offlineCache.push(scanDetails);
				fireIO.fire();
			}
		} else {
			
			socket.emit('displayMessage', scanResult);
			if (scanResult.Success) {
			}
				fireIO.fire();
		}
	};
//	self.doCachedPost = function(url, data, callback) {
//		serverPoster.doCachedPost(url, data, callback);
//	}
	self.CardResubmitted = function(scanDetails) {
		console.log('Card Resubmitted',scanDetails);
		//self.doPost(tillServerUrl, scanDetails, self.UpdateCache);		
		self.serverPoster.doPost(tillServerUrl, scanDetails, self.UpdateCache);  			
	};
	self.UpdateCache = function(scanDetails, scanResult) {
		if (scanResult.ErrorClass != comms.CONNECTION_ERROR) {
			socket.emit('displayMessage', scanResult);
			offlineCache.splice(offlineCache.indexOf(scanDetails));
		}		
	};
}

console.log('Running...');

var cardReader = new CardReader(serverPoster);
console.log(cardReader);

// offline caching....
if (cachedCallName) {
	var j = schedule.scheduleJob('* * * * *', function(){
  		console.log('Cache bitches: ' + offlineCache.length);
		for (var i = 0; i < offlineCache.length; i++) {
			setTimeout ( function() {
				var data = offlineCache[i];
				var methodInvocation = JSON.parse(data.Call);
				methodInvocation.MemberName = cachedCallName;
				var now = +new Date();
				var timeStamp = methodInvocation.TimeStamp;
				var diffMins = Math.round((now - timeStamp)/60000); // minutes	
				// console.log(diffMins);
				if (methodInvocation.ParameterValues.length > 2) {
					methodInvocation.ParameterValues[2] = diffMins;	
				} else {
					methodInvocation.ParameterValues.push(diffMins);					
				}
				data = { 'Call': JSON.stringify(methodInvocation)};
				cardReader.CardResubmitted(data);
			}, 1000);
		}		  
	});
}

var watch = require('node-watch')
if (scanWriteLocation) {
	watch(scanWriteLocation, function(filename) {
		var scannedString = path.basename(filename);
		if (fs.existsSync(filename)) {
			setTimeout(function() {
				fs.unlink(filename);
			}, 200);
			console.log('read from file: ' + scannedString);
			socket.emit('cardScanned', scannedString);
		}
	});
};


socket.on('cardScanned', function(cardId){
	console.log("cardScanned: " + cardId);
	var methodInvocation = new comms.MethodInvocation(callName, serviceType);
	methodInvocation.ParameterValues=[tillId,cardId];
	//must send in this format
	var data={ 'Call': JSON.stringify(methodInvocation)};
	cardReader.CardScanned(data);
});






