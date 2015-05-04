
var express = require('express');
var app = express();

var http = require('http');
var path = require('path');

app.set('views', __dirname + '/');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(express.static(path.join(__dirname, 'public')));

// GET method route
app.get('/', function (req, res) {
  res.render('index.html');
});

app.get('/test', function (req, res) {
  res.render('test.html');
});

app.get('/dots', function (req, res) {
  res.render('dots.html');
});

app.get('/calc', function (req, res) {
  res.render('calc.html');
});

app.get('/missile', function (req, res) {
  res.render('missile.html');
});

app.get('/gravity', function (req, res) {
  res.render('gravity.html');
});

var port = process.env.PORT || 3000;

http.createServer(app).listen(port, function(){
	console.log('Server listening on port ' + port);
});
