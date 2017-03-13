"use strict";
var user_1 = require("../models/user");
var error = console.error;
var onUserChanged;
var signupAllowed = false;
function init(options) {
    onUserChanged = options.onUserChanged;
    if (!options.hasOwnProperty('signup') || options.signup) {
        signupAllowed = true;
    }
}
exports.init = init;
function listUsers(req, res) {
    var user = req['user'];
    if (!user.admin) {
        res.status(401).json({ success: false, message: 'You are not authorised to request all users. Grow up and become an admin first!' });
        return;
    }
    user_1.User.find({}, function (err, users) {
        if (err) {
            res.status(401).json({ success: false, message: 'Error retreiving users.' });
            return;
        }
        var filteredUsers = users.map(function (u) {
            var user = u.toJSON();
            delete user.password;
            return user;
        });
        res.json(filteredUsers);
    });
}
exports.listUsers = listUsers;
function getUser(req, res) {
    var id = req.params['id'];
    var user = req['user'];
    if (!user.admin && user._id.toString() !== id) {
        res.status(401).json({ success: false, message: 'You are not authorised to request this user.' });
        return;
    }
    user_1.User.findById(id, function (err, user) {
        if (err) {
            res.status(500).json({ success: false, message: 'Error retreiving user.' });
            return;
        }
        delete user.password;
        res.json({ user: user });
    });
}
exports.getUser = getUser;
function getToken(req) {
    return req['body']['token'] || req['query']['token'] || req.headers['x-access-token'] || req.headers['authorization'];
}
exports.getToken = getToken;
function saveUser(user, req, res) {
    user.save(function (err) {
        if (err) {
            error(err);
            return res.status(422).json({ success: false, message: 'User could not be created.' });
        }
        var json = user.toJSON();
        delete json.password;
        return res.status(201).json({ user: json });
    });
}
function createNewUser(req, res) {
    var name = req['body'].name;
    var email = req['body'].email;
    var password = req['body'].password;
    var admin = req['body'].admin;
    if (!name || !email || !password || !user_1.validateEmailAddress(email)) {
        res.status(412).json({ success: false, message: 'Signup with name, email and password!' });
        return;
    }
    var user = new user_1.User({
        name: name,
        email: email.toLowerCase(),
        password: password,
        verified: false,
        admin: req['user'] && req['user'].admin ? admin : false,
        data: {}
    });
    if (onUserChanged) {
        var changedUser = onUserChanged(user, req, 'create');
        if (changedUser) {
            if (changedUser.verified) {
                user.verified = changedUser.verified;
            }
            if (changedUser.admin) {
                user.admin = changedUser.admin;
            }
            if (changedUser.data) {
                user.data = changedUser.data;
            }
        }
    }
    saveUser(user, req, res);
}
function signupUser(req, res) {
    var token = getToken(req);
    if (token) {
        res.status(400).json({ success: false, message: 'You are already signed in. Please logout first.' });
        return;
    }
    createNewUser(req, res);
}
exports.signupUser = signupUser;
function createUser(req, res) {
    var adminUser = req['user'];
    if (!adminUser || !adminUser.admin) {
        res.status(405).json({ success: false, message: 'Regular users cannot create new user. Ask an administrator.' });
        return;
    }
    createNewUser(req, res);
}
exports.createUser = createUser;
function updateUser(req, res) {
    var updatedUser = req['body'];
    var id = req.params['id'];
    var user = req['user'];
    if (!id) {
        res.status(412).json({ success: false, message: 'Specify the user\'s ID' });
        return;
    }
    if (!user.admin && user._id.toString() !== id) {
        res.status(401).json({ success: false, message: 'Request denied' });
        return;
    }
    if (!user.admin) {
        delete updatedUser.admin;
    }
    if (onUserChanged) {
        onUserChanged(updatedUser, req, 'update');
    }
    user_1.User.findByIdAndUpdate(id, updatedUser, { new: true }, function (err, finalUser) {
        if (err) {
            res.status(500).json({ success: false, message: 'Internal server error. Please try again later.' });
            return;
        }
        var u = finalUser.toJSON();
        delete u.password;
        res.json({ user: u });
    });
}
exports.updateUser = updateUser;
function deleteUser(req, res) {
    var id = req.params['id'];
    var user = req['user'];
    if (!id) {
        res.status(412).json({ success: false, message: 'Specify the user\'s ID' });
        return;
    }
    if (!user.admin && user._id.toString() !== id) {
        res.status(401).json({ success: false, message: 'Request denied' });
        return;
    }
    if (onUserChanged) {
        onUserChanged(user, req, 'delete');
    }
    user_1.User.findByIdAndRemove(id, function (err) {
        if (err) {
            res.status(500).json({ success: false, message: 'Internal server error. Please try again later.' });
            return;
        }
        res.status(204).end();
    });
}
exports.deleteUser = deleteUser;
function setUserIdAsParameter(req) {
    var user = req['user'];
    if (!req.params) {
        req.params = {};
    }
    req.params['id'] = user._id.toString();
}
function getProfile(req, res) {
    setUserIdAsParameter(req);
    getUser(req, res);
}
exports.getProfile = getProfile;
function updateProfile(req, res) {
    setUserIdAsParameter(req);
    updateUser(req, res);
}
exports.updateProfile = updateProfile;
function deleteProfile(req, res) {
    setUserIdAsParameter(req);
    deleteUser(req, res);
}
exports.deleteProfile = deleteProfile;
//# sourceMappingURL=user.js.map