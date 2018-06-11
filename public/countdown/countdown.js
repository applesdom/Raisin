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

function Dot(x, y) {
	this.x = x;
	this.y = y;
}

var dotList = [];
for(let i = 0; i < 512; i ++) {
	var dot = new Dot(0, 0);
	while(true) {
		console.log("lol");
		if(dotList.length < 2048) {
			let dis = 512*Math.pow(Math.random() - 0.5, 5) + 16;
			//let dis = 128*Math.pow(Math.random() - 0.5, 3) + 16;
			let dir = Math.random()*2*Math.PI;
			dot.x = Math.floor(Math.cos(dir)*dis + 32);
			dot.y = Math.floor(Math.sin(dir)*dis + 32);
		} else {
			dot.x = Math.floor(Math.random()*64);
			dot.y = Math.floor(Math.random()*64);
		}
		
		var duplicate = false;
		for(let dot2 of dotList) {
			if(dot2.x === dot.x && dot2.y === dot.y) {
				duplicate = true;
				break;
			}
		}
		if(!duplicate) {
			break;
		}
	}
	dotList.push(dot);
}
updateDots();

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

setInterval(updateClock, 41);