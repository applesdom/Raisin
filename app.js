var express = require('express');
var app = express();
var path = require('path');
var expressWs = require('express-ws')(app);

//Static resources
app.use(express.static(path.join(__dirname, '/public')));

// GET method route
app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname + '/public/paint.html'));
});


var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log('Server listening on port ' + port);
});

//BEGIN CLUSTERFUCK
//Classes
function Point(x, y) {
	this.x = x;
	this.y = y;
}

function Cursor(pos, tool) {
	this.pos = pos;
	this.tool = tool;
}

//Tilemap
var tileMap = new Map();

function setPixel(point, value) {
	let key = Math.floor(point.x / 16) + " " + Math.floor(point.y / 16);
	if(!tileMap.has(key)) {
		let tileData = [];
		for(let i = 0; i < 256; i ++) {
			tileData[i] = 0;
		}
		tileMap.set(key, tileData);
	}
	
	tileMap.get(key)[(point.x - Math.floor(point.x / 16)*16) + 16*(point.y - Math.floor(point.y / 16)*16)] = value;
	
	if(value === 0) {
		let tileData = tileMap.get(key);
		for(let i = 0; i < 256; i ++) {
			if(tileData[i] != 0) {
				return;
			}
		}
		tileMap.delete(key);
	}
}

function getPixel(point) {
	let key = Math.floor(point.x / 16) + " " + Math.floor(point.y / 16);
	if(!tileMap.has(key)) {
		return 0;
	} else {
		return tileMap.get(key)[(point.x - Math.floor(point.x / 16)*16) + 16*(point.y - Math.floor(point.y / 16)*16)];
	}	
}

function getTile(tilePoint) {
	let key = tilePoint.x + " " + tilePoint.y;
	if(tileMap.has(key)) {
		let tileData = tileMap.get(key);
		let ret = "";
		for(let i = 0; i < 256; i ++) {
			ret += tileData[i].toString(16);
		}
		return ret;
	} else {
		return "0";
	}
}

//Clientmap
var clientMap = new Map();

//WebSocket route
app.ws('/', function(ws, req) {
	console.log("New connection from " + ws._socket.remoteAddress);
	clientMap.set(ws, null);
	
	ws.on('message', function(msg) {
		let split = msg.split(" ");
		
		if(split[0] === "c") {
			if(split[1] === "null") {
				clientMap.set(ws, null);
			} else {
				clientMap.set(ws, new Cursor(new Point(parseFloat(split[1]), parseFloat(split[2])), parseInt(split[3])));
			}
		} else if(split[0] === "p") {
			setPixel(new Point(parseInt(split[1]), parseInt(split[2])), parseInt(split[3]));
			outSet.add(parseInt(split[1]) + " " + parseInt(split[2]));
		} else if(split[0] === "t") {
			let tilePoint = new Point(parseInt(split[1]), parseInt(split[2]));
			let tileData = getTile(tilePoint);
			if(tileData !== "0") {
				ws.send("t " + tilePoint.x + " " + tilePoint.y + " " + getTile(tilePoint));
			}
		}
		//console.log(msg);
	});
		
	ws.on('close', function(msg) {
		console.log("Client from " + ws._socket.remoteAddress + " disconnected");
		clientMap.delete(ws);
	});
});

var outSet = new Set();

function broadcast() {
	for(let ws of clientMap.keys()) {
		if(ws.readyState !== 1) {
			continue;
		}
		
		let out = "c";
		for(let ws2 of clientMap.keys()) {
			if(ws !== ws2) {
				let cursor = clientMap.get(ws2);
				if(cursor !== null) {
					out += " " + cursor.pos.x + " " + cursor.pos.y + " " + cursor.tool;
				}
			}
		}
		ws.send(out);
		
		for(let key of outSet) {
			let split = key.split(" ");
			let point = new Point(parseInt(split[0]), parseInt(split[1]));
			ws.send("p " + key + " " + getPixel(point));
		}
	}

	outSet = new Set();
}
setInterval(broadcast, 20);