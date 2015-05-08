var port = 1337;
var express = require('./config/express');
var app = express();
var bodyParser = require('body-parser');

var Player = require("./app/models/player");

var mongoose   = require('mongoose');
mongoose.connect('mongodb://localhost:27017/golf'); // connect to our database

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(port);
module.exports = app;
console.log('Server running at http://localhost:' + port);