var http=require('http');

/////Config Settings
var guiServerUrl = 'http://localhost:3000';
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
//socket.on('event', function(data){});
socket.connect();

function ScanResult(){
	var self=this;
	self.Success=false;
	self.Message='';
	self.ErrorMessage='';
	self.ErrorClass='';
}

console.log('Mock Running...');

var counter = 0;

socket.on('cardScanned', function(cardId){
	console.log("cardScanned " + counter + ": " + cardId);
	var sr = new ScanResult();
	switch (counter % 3) {
		case 0:
			sr.Success = true;
			break;
		case 1:
			sr.ErrorMessage = 'Network Issue';
			sr.ErrorClass = 'Connection Issue';
			break;
		case 2:
			sr.ErrorMessage = 'Computer Says No';
			sr.ErrorClass = 'Mocca Rule';
			break;
	}
	socket.emit('displayMessage', sr);
	counter++;
});





