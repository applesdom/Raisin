var express = require('express');
var app = express();
var path = require('path');
var expressWs = require('express-ws')(app);

//Static resources
app.use(express.static(path.join(__dirname, '/public')));

//GET method route
app.get('/', function(req, res) {
	res.redirect('/paint');
});
app.get('/paint', function(req, res) {
	res.sendFile(path.join(__dirname, '/public/paint/paint.html'));
});
app.get('/countdown', function(req, res) {
	res.sendFile(path.join(__dirname, '/public/countdown/countdown.html'));
});

//Launch server
var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log('Server listening on port ' + port);
});

//Launch websocket server
var paintServer = require('./paint-server.js')(app);