"use strict";
var mongoose = require("mongoose");
var bcrypt = require("bcrypt");
var bluebird = require("bluebird");
mongoose.Promise = bluebird;
var Schema = mongoose.Schema;
;
var emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
function validateEmailAddress(email) {
    return emailRegex.test(email);
}
exports.validateEmailAddress = validateEmailAddress;
var UserSchema = new Schema({
    email: {
        type: String,
        unique: true,
        required: true,
        dropDups: true,
        validate: {
            validator: function (email, cb) {
                if (!validateEmailAddress(email)) {
                    cb(false);
                }
                exports.User.find({ email: email }, function (err, docs) {
                    cb(docs.length === 0);
                });
            },
            message: "User already exists!"
        }
    },
    password: String,
    first: String,
    name: String,
    admin: {
        type: Boolean,
        default: false
    },
    verified: {
        type: Boolean,
        default: false
    },
    subscribed: {
        type: Boolean,
        default: false
    },
    expires: {
        type: Date,
        default: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    data: Object
}, {
    versionKey: false
});
UserSchema.pre("save", function (next) {
    var now = new Date();
    var user = this;
    if (!user.createdAt) {
        user.createdAt = now;
    }
    if (user.password && this.isModified("password") || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                next();
            });
        });
    }
    else {
        return next();
    }
});
UserSchema.methods.comparePassword = function (pwd, cb) {
    bcrypt.compare(pwd, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};
exports.User = mongoose.model("User", UserSchema);
//# sourceMappingURL=user.js.map