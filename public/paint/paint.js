//Classes
function Point(x, y) {
	this.x = x;
	this.y = y;
}

function Camera(x, y, zoom) {
	this.x = x;
	this.y = y;
	this.zoom = zoom;
}

function Cursor(x, y, tool) {
	this.x = x;
	this.y = y;
	this.tool = tool;
}

function PaintCanvas() {
	this.tileMap = new Map();
	this.imageMap = new Map();
	
	this.colorArray = ["#ffffff", "#a0a0a0", "#606060", "#000000",
					"#ff0000", "#800000", "#ff8000", "#fff010",
					"#00ff00", "#008000", "#00ffff", "#0000ff",
					"#ff00ff", "#8000ff", "#ffc080", "#ff80ff"];
	
	this.setPixel = function(x, y, value) {
		let key = Math.floor(x / 16) + " " + Math.floor(y / 16);
		if(!this.tileMap.has(key)) {
			this.tileMap.set(key, new Array(256).fill(0));
			
			let canvas = document.createElement('canvas');
			canvas.width = 16;
			canvas.height = 16;
			let g2 = canvas.getContext("2d");
			g2.imageSmoothingEnabled = false;
			g2.fillStyle = "#ffffff";
			g2.fillRect(0, 0, 16, 16);
			this.imageMap.set(key, canvas);
		}
		
		x %= 16;
		y %= 16;
		if(x < 0) {x += 16;}
		if(y < 0) {y += 16;}
		
		this.tileMap.get(key)[x + 16*y] = value;
		
		let canvas = this.imageMap.get(key);
		let g2 = canvas.getContext("2d");
		g2.fillStyle = this.colorArray[value];
		g2.fillRect(x, y, 1, 1);
		
		if(value === 0) {
			let tileData = this.tileMap.get(key);
			for(let i = 0; i < 256; i ++) {
				if(tileData[i] != 0) {
					return;
				}
			}
			this.tileMap.delete(key);
			this.imageMap.delete(key);
		}
	}
	
	this.setTile = function(x, y, data) {
		let key = x + " " + y;
		if(data === "0") {
			this.tileMap.delete(key);
			this.imageMap.delete(key);
		}
		
		let tileData = [];
		let canvas = document.createElement('canvas');
		canvas.width = 16;
		canvas.height = 16;
		let g2 = canvas.getContext("2d");
		g2.imageSmoothingEnabled = false;
		for(let i = 0; i < 256; i ++) {
			tileData[i] = parseInt(data.charAt(i), 16);
			
			g2.fillStyle = this.colorArray[parseInt(data.charAt(i), 16)]
			g2.fillRect(i%16, Math.floor(i/16), 1, 1);
		}
		this.tileMap.set(key, tileData);
		this.imageMap.set(key, canvas);
	}
	
	this.render = function() {
		g.save();
		g.scale(camera.zoom, camera.zoom);
		g.translate(-camera.x, -camera.y);
		g.imageSmoothingEnabled = false;
		for(let x = Math.floor(camera.x / 16); x < (camera.x + (canvas.width/camera.zoom))/16; x ++) {
			for(let y = Math.floor(camera.y / 16); y < (camera.y + (canvas.height/camera.zoom))/16; y ++) {
				let key = x + " " + y;
				if(this.imageMap.has(key)) {
					let canvas = this.imageMap.get(key);
					g.drawImage(canvas, x*16, y*16);
				}
				
				/*if(this.tileMap.has(key)) {
					let tileData = this.tileMap.get(key);
					for(let i = 0; i < 256; i ++) {
						g.fillStyle = this.colorArray[tileData[i]];
						g.fillRect(x*16 + i%16, y*16 + Math.floor(i/16), 1 + 1/camera.zoom, 1 + 1/camera.zoom);
					}
				}*/
			}
		}
		g.restore();
	}
}

//Canvas
var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var g = canvas.getContext("2d");
var cursorList = [];
var camera = new Camera(-(canvas.width/2)/10, -(canvas.height/2)/10, 10);
var pCanvas = new PaintCanvas();

//Mouse input
var mousePos = null;
var mouseDown = false;

canvas.onmousedown = function(e) {
	if(tool === 16) {
		canvas.style.cursor = "url(res/hand_closed.png), auto";
	} else {
		onPaint(new Point(Math.floor(camera.x + e.x/camera.zoom),
				Math.floor(camera.y + e.y/camera.zoom)));
	}
	
	mouseDown = true;
};

canvas.onmouseup = function(e) {
	if(tool === 16) {
		canvas.style.cursor = "url(res/hand.png), auto";
	}
	
	mouseDown = false;
};

canvas.onmousemove = function(e) {
	if(tool === 16 && mouseDown) {
		camera.x += (mousePos.x - e.x) / camera.zoom;
		camera.y += (mousePos.y - e.y) / camera.zoom;
	} else if(mouseDown) {
		let lastPoint = new Point(Math.floor(camera.x + mousePos.x/camera.zoom),
				Math.floor(camera.y + mousePos.y/camera.zoom));
		let curPoint = new Point(Math.floor(camera.x + e.x/camera.zoom),
				Math.floor(camera.y + e.y/camera.zoom));
		if(lastPoint.x !== curPoint.x || lastPoint.y !== curPoint.y) {
			onPaint(curPoint);
			
			let midPoint = new Point(Math.floor(camera.x + ((mousePos.x + e.x)/2)/camera.zoom),
				Math.floor(camera.y + ((mousePos.y + e.y)/2)/camera.zoom));
				
			if(midPoint.x !== curPoint.x || midPoint.y !== curPoint.y) {
				onPaint(midPoint);
			}
		}
		
		/*while(lastPoint.x !== curPoint.x || lastPoint.y !== curPoint.y) {
			let dx = curPoint.x - lastPoint.x;
			let dy = curPoint.y - lastPoint.y;
			if(Math.abs(dx) >= Math.abs(dy)) {
				lastPoint.x += Math.sign(dx);
			} else {
				lastPoint.y += Math.sign(dy);
			}
			onPaint(lastPoint);
		}*/
	}
};

canvas.onwheel = function(e) {
	let zoom = Math.pow(1.001, -e.deltaY);
	if(camera.zoom <= 1 && zoom < 1) {
		return;
	} else {
		camera.zoom *= zoom;
		if(camera.zoom < 2) {
			zoom = 2 / (camera.zoom / zoom);
			camera.zoom = 2;
		}
		camera.x += (zoom - 1) * e.x / camera.zoom;
		camera.y += (zoom - 1) * e.y / camera.zoom;
	}
};

document.onresize = function(e) {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
};
document.onresize();

document.onmousemove = function(e) {
	mousePos = new Point(e.x, e.y);
}

document.onmouseleave = function(e) {
	mousePos = null;
	mouseDown = false;
}

function onPaint(point) {
	pCanvas.setPixel(point.x, point.y, tool);
	if(webSocket.readyState === 1) {
		webSocket.send("p " + point.x + " " + point.y + " " + tool);
	}
}

//Toolbar
var tool = 4;
var gridEnabled = false;

let noConnectionImage = document.getElementById("no_connection");
let panButton = document.getElementById("pan_button");
let gridButton = document.getElementById("grid_button");
let colorButtonArray = [];

panButton.onclick = function() {
	deselectAllButtons();
	panButton.style.borderStyle = "inset";
	tool = 16;
	canvas.style.cursor = "url(res/hand.png), auto";
};

gridButton.onclick = function() {
	if(gridEnabled) {
		gridButton.style.borderStyle = "outset";
		gridEnabled = false;
	} else {
		gridButton.style.borderStyle = "inset";
		gridEnabled = true;
	}
};

for(let i = 0; i < 16; i ++) {
	colorButtonArray[i] = document.getElementById("color_button_" + i);
	colorButtonArray[i].onclick = function() {
		deselectAllButtons();
		colorButtonArray[i].style.borderStyle = "inset";
		tool = i;
		canvas.style.cursor = "url(res/brush_" + i + ".png), auto";
	};
}
colorButtonArray[4].style.borderStyle = "inset";

function deselectAllButtons() {
	panButton.style.borderStyle = "outset";
	for(let i = 0; i < 16; i ++) {
		colorButtonArray[i].style.borderStyle = "outset";
	}
}

//Rendering
function render() {	
	g.fillStyle = "#ffffff";
	g.fillRect(0, 0, canvas.width, canvas.height);
	
	pCanvas.render();
	
	if(gridEnabled) {
		drawGrid();
	}
	
	drawCursors();
}

function drawGrid() {
	g.lineWidth = 3;
	g.strokeStyle = "#202020";
	g.beginPath();
	g.moveTo(-camera.x*camera.zoom, 0);
	g.lineTo(-camera.x*camera.zoom, canvas.height);
	g.stroke();
	
	g.beginPath();
	g.moveTo(0, -camera.y*camera.zoom);
	g.lineTo(canvas.width, -camera.y*camera.zoom);
	g.stroke();
	
	g.lineWidth = 2;
	for(let x = -(camera.x % 16)*camera.zoom; x < canvas.width; x += 16*camera.zoom) {
		g.beginPath();
		g.moveTo(x, 0);
		g.lineTo(x, canvas.height);
		g.stroke();
	}
	
	for(let y = -(camera.y % 16)*camera.zoom; y < canvas.height; y += 16*camera.zoom) {
		g.beginPath();
		g.moveTo(0, y);
		g.lineTo(canvas.width, y);
		g.stroke();
	}
	
	if(camera.zoom > 4) {
		g.lineWidth = 1;
		for(let x = -(camera.x % 1)*camera.zoom; x < canvas.width; x += camera.zoom) {
			g.beginPath();
			g.moveTo(x, 0);
			g.lineTo(x, canvas.height);
			g.stroke();
		}
		
		for(let y = -(camera.y % 1)*camera.zoom; y < canvas.height; y += camera.zoom) {
			g.beginPath();
			g.moveTo(0, y);
			g.lineTo(canvas.width, y);
			g.stroke();
		}
	}
}

function drawCursors() {
	for(let cursor of cursorList) {
		let img = new Image();
		if(cursor.tool === 16) {
			img.src = "res/hand.png"
		} else {
			img.src = "res/brush_" + cursor.tool + ".png";
		}
		g.drawImage(img, Math.floor((cursor.x - camera.x)*camera.zoom),
				Math.floor((cursor.y - camera.y)*camera.zoom));
	}
}

//WebSocket
var webSocket = new WebSocket("ws://raisinraisin.herokuapp.com/paint");
//var webSocket = new WebSocket("ws://localhost:5000/paint");
webSocket.onmessage = function(e) {
	let split = e.data.split(" ");
		
	if(split[0] === "c") {
		cursorList = [];
		for(let i = 1; i < split.length; i += 3) {
			cursorList.push(new Cursor(parseFloat(split[i]), parseFloat(split[i+1]), parseInt(split[i+2])));
		}
	} else if(split[0] === "t") {
		pCanvas.setTile(parseInt(split[1]), parseInt(split[2]), split[3]);
	} else if(split[0] === "p") {
		pCanvas.setPixel(parseInt(split[1]), parseInt(split[2]), parseInt(split[3]));
	}
}

//Main
let sentList = [];
setInterval(function broadcast() {
	if(webSocket.readyState === 1) {
		noConnectionImage.style.display = "none";
		
		if(mousePos === null) {
			webSocket.send("c null");
		} else {
			webSocket.send("c " + (camera.x + mousePos.x/camera.zoom) + " " + (camera.y + mousePos.y/camera.zoom) + " " + tool);
		}

		let count = 0;
		for(let x = Math.floor(camera.x / 16); x < (camera.x + (canvas.width/camera.zoom))/16; x ++) {
			for(let y = Math.floor(camera.y / 16); y < (camera.y + (canvas.height/camera.zoom))/16; y ++) {
				let key = x + " " + y;
				if(sentList.indexOf(key) < 0) {
					webSocket.send("t " + key);
					sentList.push(key);
					
					count ++;
					if(count > 100) {
						break;
					}
				}
			}
		}
	} else {
		noConnectionImage.style.display = "inline";
	}
	
	render();
}, 10);