//Classes
function Point(x, y) {
	this.x = x;
	this.y = y;
}

function Camera() {
	this.pos = new Point(0, 0);
	this.zoom = 10;
}

function Cursor(pos, tool) {
	this.pos = pos;
	this.tool = tool;
}

//Canvas
var canvas, g;
var mousePos = null;
var cursorList = [];
var camera = new Camera();

function initCanvas() {
	canvas = document.getElementById("canvas");
	g = canvas.getContext("2d");
	
	window.onresize = function() {
		render();
	};
	
	let mouseDown = false;
	canvas.onmousedown = function(e) {
		if(tool == 16) {
			canvas.style.cursor = "url(paint/hand_closed.png), auto";
		} else {
			onPaint(new Point(Math.floor(camera.pos.x + e.x/camera.zoom),
					Math.floor(camera.pos.y + e.y/camera.zoom)));
		}
		
		mouseDown = true;
	};
	canvas.onmouseup = function(e) {
		if(tool == 16) {
			canvas.style.cursor = "url(paint/hand.png), auto";
		}
		
		mouseDown = false;
	};
	canvas.onmousemove = function(e) {
		if(tool == 16 && mouseDown) {
			camera.pos.x += (mousePos.x - e.x) / camera.zoom;
			camera.pos.y += (mousePos.y - e.y) / camera.zoom;
			render();
		} else if(mouseDown) {
			let lastPoint = new Point(Math.floor(camera.pos.x + mousePos.x/camera.zoom),
					Math.floor(camera.pos.y + mousePos.y/camera.zoom));
			let curPoint = new Point(Math.floor(camera.pos.x + e.x/camera.zoom),
					Math.floor(camera.pos.y + e.y/camera.zoom));
			if(lastPoint.x !== curPoint.x || lastPoint.y !== curPoint.y) {
				onPaint(curPoint);
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
			if(camera.zoom < 1) {
				zoom = 1 / (camera.zoom / zoom);
				camera.zoom = 1;
			}
			camera.pos.x += (zoom - 1) * e.x / camera.zoom;
			camera.pos.y += (zoom - 1) * e.y / camera.zoom;
			render();
		}
	};
	
	document.onmousemove = function(e) {
		mousePos = new Point(e.x, e.y);
	}
	
	document.onmouseleave = function(e) {
		mousePos = null;
		mouseDown = false;
	}
}

function onPaint(point) {
	setPixel(point, tool);
	render();
	webSocket.send("p " + point.x + " " + point.y + " " + tool);
}

//Toolbar
var tool = 4;
var gridEnabled = false;

function initToolbar() {	
	let panButton = document.getElementById("pan_button");
	panButton.onclick = function() {
		deselectAllButtons();
		panButton.style.borderStyle = "inset";
		tool = 16;
		canvas.style.cursor = "url(paint/hand.png), auto";
	};
	
	let gridButton = document.getElementById("grid_button");
	gridButton.onclick = function() {
		if(gridEnabled) {
			gridButton.style.borderStyle = "outset";
			gridEnabled = false;
		} else {
			gridButton.style.borderStyle = "inset";
			gridEnabled = true;
		}
		render();
	};
	
	let colorButtonArray = [];
	for(let i = 0; i < 16; i ++) {
		colorButtonArray[i] = document.getElementById("color_button_" + i);
		colorButtonArray[i].onclick = function() {
			deselectAllButtons();
			colorButtonArray[i].style.borderStyle = "inset";
			tool = i;
			canvas.style.cursor = "url(paint/brush_" + i + ".png), auto";
		};
	}
	colorButtonArray[4].style.borderStyle = "inset";

	function deselectAllButtons() {
		panButton.style.borderStyle = "outset";
		for(let i = 0; i < 16; i ++) {
			colorButtonArray[i].style.borderStyle = "outset";
		}
	}
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

function setTile(tilePoint, data) {
	let key = tilePoint.x + " " + tilePoint.y;
	if(data === "0") {
		tileMap.delete(key)
	}
	
	let tileData = [];
	for(let i = 0; i < 256; i ++) {
		tileData[i] = parseInt(data.charAt(i), 16);
	}
	tileMap.set(key, tileData);
}

//Rendering
function render() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	g.fillStyle = "#ffffff";
	g.fillRect(0, 0, canvas.width, canvas.height);
	
	drawTiles();
	
	if(gridEnabled) {
		drawGrid();
	}
	
	drawCursors();
}

function drawGrid() {
	g.lineWidth = 3;
	g.strokeStyle = "#202020";
	g.beginPath();
	g.moveTo(-camera.pos.x*camera.zoom, 0);
	g.lineTo(-camera.pos.x*camera.zoom, canvas.height);
	g.stroke();
	
	g.beginPath();
	g.moveTo(0, -camera.pos.y*camera.zoom);
	g.lineTo(canvas.width, -camera.pos.y*camera.zoom);
	g.stroke();
	
	g.lineWidth = 2;
	for(let x = -(camera.pos.x % 16)*camera.zoom; x < canvas.width; x += 16*camera.zoom) {
		g.beginPath();
		g.moveTo(x, 0);
		g.lineTo(x, canvas.height);
		g.stroke();
	}
	
	for(let y = -(camera.pos.y % 16)*camera.zoom; y < canvas.height; y += 16*camera.zoom) {
		g.beginPath();
		g.moveTo(0, y);
		g.lineTo(canvas.width, y);
		g.stroke();
	}
	
	if(camera.zoom > 4) {
		g.lineWidth = 1;
		for(let x = -(camera.pos.x % 1)*camera.zoom; x < canvas.width; x += camera.zoom) {
			g.beginPath();
			g.moveTo(x, 0);
			g.lineTo(x, canvas.height);
			g.stroke();
		}
		
		for(let y = -(camera.pos.y % 1)*camera.zoom; y < canvas.height; y += camera.zoom) {
			g.beginPath();
			g.moveTo(0, y);
			g.lineTo(canvas.width, y);
			g.stroke();
		}
	}
}

function drawTiles() {
	g.save();
	g.scale(camera.zoom, camera.zoom);
	g.translate(-camera.pos.x, -camera.pos.y);
	for(let x = Math.floor(camera.pos.x / 16); x < (camera.pos.x + (canvas.width/camera.zoom))/16; x ++) {
		for(let y = Math.floor(camera.pos.y / 16); y < (camera.pos.y + (canvas.height/camera.zoom))/16; y ++) {
			let key = x + " " + y;
			if(tileMap.has(key)) {
				let tileData = tileMap.get(key);
				for(let i = 0; i < 256; i ++) {
					g.fillStyle = colorArray[tileData[i]];
					g.fillRect(x*16 + i%16, y*16 + Math.floor(i/16), 1 + 1/camera.zoom, 1 + 1/camera.zoom);
				}
			}
		}
	}
	g.restore();
}

const colorArray = ["#ffffff", "#a0a0a0", "#606060", "#000000",
					"#ff0000", "#800000", "#ff8000", "#ffff00",
					"#00ff00", "#008000", "#00ffff", "#0000ff",
					"#ff00ff", "#8000ff", "#ffc080", "#ff80ff"];

function drawCursors() {
	for(let cursor of cursorList) {
		let img = new Image();
		if(cursor.tool === 16) {
			img.src = "paint/hand.png"
		} else {
			img.src = "paint/brush_" + cursor.tool + ".png";
		}
		g.drawImage(img, Math.floor((cursor.pos.x - camera.pos.x)*camera.zoom),
				Math.floor((cursor.pos.y - camera.pos.y)*camera.zoom));
	}
}

//WebSocket
var webSocket = new WebSocket("ws://24.197.223.174:5000");
webSocket.onmessage = function(e) {
	let split = e.data.split(" ");
		
	if(split[0] === "c") {
		cursorList = [];
		for(let i = 1; i < split.length; i += 3) {
			cursorList.push(new Cursor(new Point(parseFloat(split[i]), parseFloat(split[i+1])), parseInt(split[i+2])));
		}
		render();
	} else if(split[0] === "t") {
		setTile(new Point(parseInt(split[1]), parseInt(split[2])), split[3]);
		render();
	}
}

//Main
initCanvas();
initToolbar();
render();

let sentList = [];
setInterval(function broadcast() {
	if(mousePos === null) {
		webSocket.send("c null");
	} else {
		webSocket.send("c " + (camera.pos.x + mousePos.x/camera.zoom) + " " + (camera.pos.y + mousePos.y/camera.zoom) + " " + tool);
	}
	
	let count = 0;
	for(let x = Math.floor(camera.pos.x / 16); x < (camera.pos.x + (canvas.width/camera.zoom))/16; x ++) {
		for(let y = Math.floor(camera.pos.y / 16); y < (camera.pos.y + (canvas.height/camera.zoom))/16; y ++) {
			let key = x + " " + y;
			if(sentList.indexOf(key) < 0) {
				webSocket.send("t " + key);
				sentList.push(key);
			}
			count ++;
			if(count > 100) {
				break;
			}
		}
	}
}, 10);