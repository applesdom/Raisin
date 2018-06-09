var express = require('express');
var app = express();
var path = require('path');
var expressWs = require('express-ws')(app);

//Static resources
app.use(express.static(path.join(__dirname, '/public')));

// GET method route
app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname + '/index.html'));
});

function Client(ws, x, y) {
	this.ws = ws;
	this.x = x;
	this.y = y;
}

var clientList = [];

function sendToAll() {
	for(let client of clientList) {
		let sendString = "";
		for(let client2 of clientList) {
			if(client !== client2) {
				sendString += client2.x + " " + client2.y + " ";
			}
		}
		sendString += client.x + " " + client.y;
		client.ws.send(sendString);
	}
}

//WebSocket route
app.ws('/', function(ws, req) {
	//console.log("New connection from " + ws._socket.remoteAddress);
	
	var client = new Client(ws, 0, 0);
	while(true) {
		if(clientList.length < 2048) {
			let dis = 512*Math.pow(Math.random() - 0.5, 5) + 16;
			//let dis = 128*Math.pow(Math.random() - 0.5, 3) + 16;
			let dir = Math.random()*2*Math.PI;
			client.x = Math.floor(Math.cos(dir)*dis + 32);
			client.y = Math.floor(Math.sin(dir)*dis + 32);
		} else {
			client.x = Math.floor(Math.random()*64);
			client.y = Math.floor(Math.random()*64);
		}
		
		var duplicate = false;
		for(let client2 of clientList) {
			if(client2.x === client.x && client2.y === client.y) {
				duplicate = true;
				break;
			}
		}
		if(!duplicate) {
			break;
		}
	}
	clientList.push(client);
	
	ws.on('close', function(msg) {
		//console.log("Client from " + ws._socket.remoteAddress + " disconnected");
		clientList.splice(clientList.indexOf(client), 1);
		
		sendToAll();
	});
	
	sendToAll();
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log('Server listening on port ' + port);
});