var clock = document.getElementById("clock");
var canvas = document.getElementById("canvas");
var g = canvas.getContext("2d");

var duration = 10000000000;

function updateClock() {
	let time = duration - (new Date().getTime() % duration);
	
	let days = Math.floor(time/(24*60*60*1000));
	let hours = Math.floor(time/(60*60*1000)) % 24;
	let minutes = Math.floor(time/(60*1000)) % 60;
	let seconds = Math.floor(time/1000) % 60;
	let millis = time % 1000;
	
    clock.innerHTML = (days + ":" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2)).replace("44", "<font color=\"red\">44</font>") + "." + pad(millis, 3);
}

function pad(number, length) {
    var my_string = '' + number;
    while (my_string.length < length) {
        my_string = '0' + my_string;
    }
    return my_string;
}

function Dot(x, y, highlight) {
	this.x = x;
	this.y = y;
	this.highlight = highlight;
}

var dotList = [];

function updateDots() {
	g.fillStyle = "#000000";
	g.fillRect(0, 0, canvas.width, canvas.height);
	
	for(let dot of dotList) {
		if(dot.highlight) {
			g.fillStyle = "#404040";
			g.strokeStyle = "#404040";
		} else {
			g.fillStyle = "#202020";
			g.strokeStyle = "#202020";
		}
		
		g.beginPath();
		g.arc((dot.x*16)+6, (dot.y*16)+6, 6, 0, 2*Math.PI);
		g.fill();
		g.stroke();
	}
}

var webSocket = new WebSocket("ws://raisinraisin.herokuapp.com");
webSocket.onmessage = function (event) {
	console.log(event.data);
	let newDotList = [];
	let split = event.data.split(" ");
	for(let i = 0; i < split.length - 2; i += 2) {
		newDotList.push(new Dot(Number.parseFloat(split[i]), Number.parseFloat(split[i+1]), false));
	}
	newDotList.push(new Dot(Number.parseFloat(split[split.length - 2]), Number.parseFloat(split[split.length - 1]), true));
	dotList = newDotList;
	updateDots();
}

setInterval(updateClock, 41);