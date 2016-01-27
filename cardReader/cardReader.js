var http=require('http');
var request = require('request');

/////Config Settings
var tillServerUrl = 'http://devserver2012.scantracksa.com:8088/';
var guiServerUrl = 'http://localhost:3000';
var callName = 'CardScanned';
var cachedCallName = 'CardScannedDelayed';
var serviceType = 'MealController';
var tillId='e1213a3e-1599-43ae-b71b-5c95bae16548';
//////End Config Settings


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
	self.MemberName =callName;
	self.ServiceType=serviceType;
	self.ParameterValues =[];
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
				errorResult.ErrorClass = 'Connection Issue';
				self.ShowResult(errorResult);
			} else {
				self.ShowResult(JSON.parse(body));
			}
		});
	};
	self.CardScanned = function(scanDetails){			
		console.log('Card Scanned',scanDetails);
		self.dopost(tillServerUrl,scanDetails);
	};
	self.ShowResult = function(scanResult){
		console.log('ScanResult: ' + JSON.stringify(scanResult));
		socket.emit('displayMessage', scanResult);
	};
}
console.log('Running...');

var cardReader = new CardReader();

socket.on('cardScanned', function(cardId){
	console.log("cardScanned: " + cardId);
	var methodInvocation = new MethodInvocation();
	methodInvocation.ParameterValues=[tillId,cardId];
	var data={Call:JSON.stringify(methodInvocation)};
	cardReader.CardScanned(data);
});

