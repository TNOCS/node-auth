"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var index_1 = require('./index');
var config = require('config');
var app = express();
var port = process.env.PORT || config.port || 3210;
mongoose.connect(config.database);
app.set('jwtAuthSecret', config.secret);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/json' }));
if (config.util.getEnv('NODE_ENV') !== 'test') {
    app.use(morgan('dev'));
}
app.get('/', function (req, res) {
    res.send('Hello! The API is at http://localhost:' + port + '/api');
});
app.use(index_1.nodeAuth(app, {
    secretKey: config.secret,
    onUserChanged: function (user, req, change) {
    }
}));
app.listen(port);
console.log('Magic happens at http://localhost:' + port);
module.exports = app;
//# sourceMappingURL=server.js.map