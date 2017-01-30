"use strict";
var bcrypt = require("bcrypt");
var user_1 = require("../models/user");
var error = console.error;
var urlRegex = /\$\{URL\}/g;
var verificationURL;
var mailService;
var verifyMailOptions;
var confirmMailOptions;
var verificationMessageSendCallback;
var confirmationMessageSendCallback;
function init(options) {
    if (!options.verify)
        return;
    verificationURL = options.verify.baseUrl;
    mailService = options.verify.mailService;
    verifyMailOptions = options.verify.verifyMailOptions;
    confirmMailOptions = options.verify.confirmMailOptions;
    verificationMessageSendCallback = options.verify.verificationMessageSendCallback;
    confirmationMessageSendCallback = options.verify.confirmationMessageSendCallback;
}
exports.init = init;
function verifyEmail(req, res) {
    var id = req.params['id'];
    var token = req.query['t'];
    if (!id || !token) {
        res.status(400).json({ success: false, message: 'Please create a valid request!' });
        return;
    }
    user_1.User.findById(id, function (err, user) {
        if (err || !user) {
            res.status(400).json({ success: false, message: 'Please create a valid request!' });
            return;
        }
        bcrypt.compare(user.email, token)
            .then(function (ok) {
            if (!ok) {
                res.status(400).json({ success: false, message: 'Please create a valid request!' });
                return;
            }
            user.verified = true;
            user.update(user, function (err, result) {
                if (err) {
                    error(err);
                    res.status(500).json({ success: false, message: 'Something did not work as expected. Please come back later and try again.' });
                    return;
                }
                res.status(200).json({ success: true, message: 'Your email was verified successfully. Thank you!' });
                sendConfirmationEmail(user);
            });
        })
            .catch(function (err) {
            res.status(400).json({ success: false, message: 'Please create a valid request!' });
        });
    });
}
exports.verifyEmail = verifyEmail;
function resendEmail(req, res) {
    var email = req.query['email'];
    if (!email) {
        res.status(400).json({ success: false, message: 'Please send your email to activate your account.' });
        return;
    }
    user_1.User.findOne({ email: email.toLowerCase() }, function (err, user) {
        if (err || !user) {
            res.status(400).json({ success: false, message: 'Please signup first.' });
            return;
        }
        if (user.verified) {
            res.status(400).json({ success: false, message: 'User is already verified.' });
            return;
        }
        sendVerificationMessage(user);
        res.status(200).json({ success: true, message: 'Verification email sent.' });
    });
}
exports.resendEmail = resendEmail;
function sendConfirmationEmail(user) {
    if (!confirmMailOptions)
        return;
    var mailOptions = JSON.parse(JSON.stringify(confirmMailOptions));
    mailOptions.to = user.email;
    mailService && mailService.send(mailOptions, confirmationMessageSendCallback);
}
function sendVerificationMessage(user) {
    if (!verifyMailOptions)
        return;
    bcrypt.hash(user.email, 10, function (err, hash) {
        if (err) {
            error(err);
            return;
        }
        var URL = verificationURL + "/" + user._id.toString() + "?t=" + hash;
        var mailOptions = JSON.parse(JSON.stringify(verifyMailOptions));
        mailOptions.to = user.email;
        mailOptions.html = mailOptions.html.replace(urlRegex, URL);
        mailOptions.text = mailOptions.text.replace(urlRegex, URL);
        mailService && mailService.send(mailOptions, verificationMessageSendCallback);
    });
}
exports.sendVerificationMessage = sendVerificationMessage;
//# sourceMappingURL=verify.js.map