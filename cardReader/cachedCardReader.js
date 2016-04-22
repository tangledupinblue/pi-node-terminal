var fireIO = require('./FireGPIO.js');
var comms = require('./ServerComms.js');
//var serverPoster = require('./mock_ServerPoster.js');
var serverPoster = require('./ServerPoster.js');
var schedule = require('node-schedule');
var path = require('path');
var fs = require('fs');
var Datastore = require('nedb');

/////Config Settings
var tillServerUrl = 'http://192.168.0.6:8088/';
var guiServerUrl = 'http://localhost:3000';
var callName = 'CardScanned';
var cachedCallName = 'CardScannedDelayed';
var serviceType = 'MealController';
var tillId = '5f652104-485b-4f98-a712-370d7f579e68';    //'565924f5-bef0-4fdb-923d-ba480b2b5716'; //'5f652104-485b-4f98-a712-370d7f579e68'; ///'e1213a3e-1599-43ae-b71b-5c95bae16548';
var postTimeout = 3000;
var offlineMessage = "Access Granted (offline)";
var successMessage = "Access Granted";
//write the files to a location and watch for scans
var scanWriteLocation = "/home/barrys/temp/scans";
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

console.log("Url: " + tillServerUrl);
console.log("Till ID: " + tillId);
console.log("Reading From: " + scanWriteLocation);

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
			scanResult.DisplayMessage = offlineMessage;
			socket.emit('displayMessage', scanResult);
			if (cachedCallName) {
				offlineCache.push(scanDetails);
				db_cache.insert(scanDetails);
				fireIO.fire();
			}
		} else {			
			if (scanResult.Success) {
				scanResult.DisplayMessage = successMessage;
				fireIO.fire();
			} else {
				scanResult.DisplayMessage = scanResult.ErrorMessage;	
			}
			socket.emit('displayMessage', scanResult);
		}
	};
	self.CardResubmitted = function(scanDetails) {
		console.log('Card Resubmitted',scanDetails);
		//self.doPost(tillServerUrl, scanDetails, self.UpdateCache);		
		self.serverPoster.doPost(tillServerUrl, scanDetails, self.UpdateCache);  			
	};
	self.UpdateCache = function(scanDetails, scanResult) {
		console.log("Cached Response from Server: ", scanResult);
		if (scanResult.ErrorClass != comms.CONNECTION_ERROR) {
			scanResult.DisplayMessage = "Processing: " + scanResult.Message + scanResult.ErrorMessage;
			socket.emit('displayMessage', scanResult);
			offlineCache.splice(offlineCache.indexOf(scanDetails));
			console.log("Removed from Cache: ", scanDetails); 
			db_cache.remove({ _id: scanDetails._id }, function(err, numRemoved) {
			});
		}		
	};
}

console.log('Running...');

var cardReader = new CardReader(serverPoster);
console.log(cardReader);

// offline caching....
if (cachedCallName) {
	var j = schedule.scheduleJob('* * * * *', function(){
		function sendMessage(next) {
			var methodInvocation = JSON.parse(next.Call);
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
			var scanDetails = { 'Call': JSON.stringify(methodInvocation)};
			scanDetails._id = next._id;
			cardReader.CardResubmitted(scanDetails);
		};

		db_cache.find({}, function(err, docs) {
  			//offlineCache = docs;
			console.log('Cache Size: ' + docs.length);
			//fucking complicated, but need to do it recursively like this
			//so that the set timouts actually mean something; otherwise
			//it will loop and all the set timeout call backs will fire at the same time
			var i = 0;			
			function count(i) { 
				if (i < docs.length) {			
					var next = docs[i];
					setTimeout(function () {
						console.log("Sending Cache - " + i);	
						sendMessage(next);				
						i++;
						count(i);
					}, 500);
				}
			};			
			count(i);					
		});
//		}		  
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






