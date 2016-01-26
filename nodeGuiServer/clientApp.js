
//var io = require('socket.io-client'),
//socket = io.connect('localhost', {
//    port: 3000
//});

var socket = require('socket.io-client')('http://localhost:3000');

socket.on('connect', function () { console.log("socket connected"); });

console.log('emitting!')
socket.emit('chat message', 'whazzzup bitches!!!!!' );
console.log('emitted!')


