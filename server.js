var port = 1337;
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.use(express.static('public'));
app.use(express.static('bower_components'));

require('./app/routes/index.server.routes.js')(app);

var Player = require("./app/models/player");

var mongoose   = require('mongoose');
mongoose.connect('mongodb://localhost:27017/golf'); // connect to our database



app.listen(port);
module.exports = app;
console.log('Server running at http://localhost:' + port);