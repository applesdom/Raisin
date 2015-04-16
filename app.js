
var express = require('express');
var app = express();

var http = require('http');

app.set('views', __dirname + '/');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

//app.use(express.static(path.join(__dirname, 'public')));

// GET method route
app.get('/', function (req, res) {
  res.render('index.html');
});

var port = process.env.PORT || 3000;

http.createServer(app).listen(port, function(){
	console.log('Server listening on port ' + port);
});
