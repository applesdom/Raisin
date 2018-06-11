//Classes
function Cursor(x, y, tool) {
	this.x = x;
	this.y = y;
	this.tool = tool;
}

function PaintCanvas() {
	this.tileMap = new Map();
	
	this.setPixel = function(x, y, value) {
		let key = Math.floor(x / 16) + " " + Math.floor(y / 16);
		if(!this.tileMap.has(key)) {
			this.tileMap.set(key, new Array(256).fill(0));
		}
		
		x %= 16;
		y %= 16;
		if(x < 0) {x += 16;}
		if(y < 0) {y += 16;}
		
		this.tileMap.get(key)[x + 16*y] = value;
		
		if(value === 0) {
			let tileData = this.tileMap.get(key);
			for(let i = 0; i < 256; i ++) {
				if(tileData[i] != 0) {
					return;
				}
			}
			this.tileMap.delete(key);
		}
	}
	
	this.getPixel = function(x, y) {
		let key = Math.floor(x / 16) + " " + Math.floor(y / 16);
		if(!this.tileMap.has(key)) {
			return 0;
		} else {
			x %= 16;
			y %= 16;
			if(x < 0) {x += 16;}
			if(y < 0) {y += 16;}
		
			return this.tileMap.get(key)[x + 16*y];
		}	
	}

	this.getTile = function(tx, ty) {
		let key = tx + " " + ty;
		if(this.tileMap.has(key)) {
			let tileData = this.tileMap.get(key);
			let ret = "";
			for(let i = 0; i < 256; i ++) {
				ret += tileData[i].toString(16);
			}
			return ret;
		} else {
			return "0";
		}
	}
}

//Clients
var pCanvas = new PaintCanvas();
var clientMap = new Map();

//New connection
function newConnection(ws, req) {
	console.log("New connection from " + ws._socket.remoteAddress);
	clientMap.set(ws, null);
	
	ws.on('message', function(msg) {
		let split = msg.split(" ");
		
		if(split[0] === "c") {
			if(split[1] === "null") {
				clientMap.set(ws, null);
			} else {
				let x = parseFloat(split[1], 10);
				let y = parseFloat(split[2], 10);
				let tool = parseFloat(split[3], 10);
				if(!isNaN(x) && !isNaN(y) && !isNaN(tool)) {
					clientMap.set(ws, new Cursor(x, y, tool));
				}
			}
		} else if(split[0] === "p") {
			let x = parseFloat(split[1], 10);
			let y = parseFloat(split[2], 10);
			let value = parseFloat(split[3], 10);
			if(!isNaN(x) && !isNaN(y) && !isNaN(value)) {
				pCanvas.setPixel(x, y, value);
				sendSet.add(split[1] + " " + split[2]);
			}
		} else if(split[0] === "t") {
			let x = parseFloat(split[1], 10);
			let y = parseFloat(split[2], 10);
			if(!isNaN(x) && !isNaN(y)) {
				let tileData = pCanvas.getTile(x, y);
				if(tileData !== "0") {
					ws.send("t " + x + " " + y + " " + tileData);
				}
			}
		}
	});
		
	ws.on('close', function(msg) {
		console.log("Client from " + ws._socket.remoteAddress + " disconnected");
		clientMap.delete(ws);
	});
}

//Broadcast
var sendSet = new Set();
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
					out += " " + cursor.x + " " + cursor.y + " " + cursor.tool;
				}
			}
		}
		ws.send(out);
		
		for(let key of sendSet) {
			let split = key.split(" ");
			ws.send("p " + key + " " + pCanvas.getPixel(parseInt(split[0], 10), parseInt(split[1], 10)));
		}
	}

	sendSet.clear();
}

//Main
var paintServer = function(app) {
	app.ws('/paint', newConnection);
	setInterval(broadcast, 20);
};
module.exports = paintServer;