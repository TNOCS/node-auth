"use strict";
var user_1 = require('../models/user');
var jwt = require('jsonwebtoken');
var expiresIn;
var secretKey;
function init(options) {
    secretKey = options.secretKey;
    expiresIn = options.expiresIn ? options.expiresIn : '1d';
}
exports.init = init;
function login(req, res) {
    var email = req['body'].email;
    var pwd = req['body'].password;
    if (!email || !pwd) {
        res.status(422).json({ success: false, message: 'Authentication failed. Body should contain a name and password property.' });
    }
    else {
        user_1.User.findOne({ email: email.toLowerCase() }, function (err, user) {
            if (err || !user) {
                res.status(401).json({ success: false, message: 'Authentication failed.' });
            }
            else if (user) {
                user.comparePassword(pwd, function (err, isMatch) {
                    if (isMatch && !err) {
                        var json = user.toJSON();
                        delete json.password;
                        var token = jwt.sign(json, secretKey, {
                            expiresIn: expiresIn
                        });
                        res.json({ success: true, token: token, user: json });
                    }
                    else {
                        res.status(401).json({ success: false, msg: 'Authentication failed.' });
                    }
                });
            }
        });
    }
}
exports.login = login;
//# sourceMappingURL=login.js.map