"use strict";
var express_1 = require("express");
var jwt = require("jsonwebtoken");
var userRoute = require("./routes/user");
var loginRoute = require("./routes/login");
var verifyRoute = require("./routes/verify");
function nodeAuth(app, options) {
    var secretKey = options.secretKey;
    if (secretKey === null) {
        throw new Error("secretKey must be set");
    }
    var apiRoute = (options.api && typeof options.api === "string") ? options.api : "/api";
    app.use(apiRoute, createRoutes(secretKey, options));
    return authenticateUser(secretKey, options.blockUnauthenticatedUser);
}
exports.nodeAuth = nodeAuth;
function authenticateUser(secretKey, blockUnauthenticatedUser) {
    if (blockUnauthenticatedUser === void 0) { blockUnauthenticatedUser = true; }
    var authnErrorHandler = blockUnauthenticatedUser
        ? function (req, res, next, msg) {
            res.status(403).json({
                success: false,
                message: msg
            });
        }
        : function (req, res, next, msg) {
            delete req["user"];
            next();
        };
    return function (req, res, next) {
        var token = userRoute.getToken(req);
        if (!token) {
            authnErrorHandler(req, res, next, "No token provided");
        }
        else {
            jwt.verify(token, secretKey, function (err, user) {
                if (err) {
                    authnErrorHandler(req, res, next, "Failed to authenticate token.");
                }
                else {
                    req["user"] = user;
                    next();
                }
            });
        }
    };
}
function createRoutes(secretKey, options) {
    var apiRoutes = express_1.Router();
    loginRoute.init(options);
    userRoute.init(options);
    verifyRoute.init(options);
    createApiRoute(apiRoutes, options);
    var hasLoginRoute = (options.login && typeof options.login === "boolean") ? options.login : true;
    if (hasLoginRoute) {
        var login = (options.login && typeof options.login === "string") ? options.login : "/login";
        apiRoutes.route(login)
            .post(loginRoute.login);
    }
    var hasSignupRoute = (options.signup && typeof options.signup === "boolean") ? options.signup : true;
    if (hasSignupRoute) {
        var signupRoute = (options.signup && typeof options.signup === "string") ? options.signup : "/signup";
        apiRoutes.route(signupRoute)
            .post(userRoute.signupUser);
    }
    var hasVerificationRoute = (options.verify && options.verify.route && typeof options.verify.route === "boolean") ? options.verify : true;
    if (hasVerificationRoute) {
        var verificationRoute = (options.verify && options.verify.route && typeof options.verify.route === "string") ? options.verify.route : "/activate";
        apiRoutes.route("" + verificationRoute)
            .get(verifyRoute.resendEmail);
        apiRoutes.route(verificationRoute + "/:id")
            .get(verifyRoute.verifyEmail);
    }
    apiRoutes.use(authenticateUser(secretKey, true));
    var hasProfileRoute = (options.profile && typeof options.profile === "boolean") ? options.profile : true;
    if (hasProfileRoute) {
        var profileRoute = (options.profile && typeof options.profile === "string") ? options.profile : "/profile";
        apiRoutes.route(profileRoute)
            .get(userRoute.getProfile)
            .put(userRoute.updateProfile)
            .delete(userRoute.deleteProfile);
    }
    var hasUsersRoute = (options.users && typeof options.users === "boolean") ? options.users : true;
    if (hasUsersRoute) {
        var usersRoute = (options.users && typeof options.users === "string") ? options.users : "/users";
        apiRoutes.route(usersRoute)
            .get(userRoute.listUsers)
            .post(userRoute.createUser);
        apiRoutes.route(usersRoute + "/:id")
            .get(userRoute.getUser)
            .delete(userRoute.deleteUser)
            .put(userRoute.updateUser);
    }
    return apiRoutes;
}
function createApiRoute(apiRoutes, options) {
    var routes = [];
    var apiRoute = (options.api && typeof options.api === "string") ? options.api : "/api";
    var hasLoginRoute = (options.login && typeof options.login === "boolean") ? options.login : true;
    if (hasLoginRoute) {
        var loginRoute_1 = hasLoginRoute && (options.login && typeof options.login === "string") ? options.login : "/login";
        routes.push({ route: "" + apiRoute + loginRoute_1, message: "POST: Login route, post email and password, returns JSON web token." });
    }
    var hasSignupRoute = (options.signup && typeof options.signup === "boolean") ? options.signup : true;
    if (hasSignupRoute) {
        var signupRoute = hasSignupRoute && (options.signup && typeof options.signup === "string") ? options.signup : "/signup";
        routes.push({ route: "" + apiRoute + signupRoute, message: "POST: Signup route, post email and password, and optionally, first and name." });
    }
    var hasVerificationRoute = (options.verify && options.verify.route && typeof options.verify.route === "boolean") ? options.verify : true;
    if (hasVerificationRoute) {
        var verificationRoute = (options.verify && options.verify.route && typeof options.verify.route === "string") ? options.verify.route : "/activate";
        routes.push({ route: "" + apiRoute + verificationRoute + "?email=[EMAIL]", message: "GET: Activation route to resend your activation email." });
        routes.push({ route: "" + apiRoute + verificationRoute + "/[ID]?t=[TOKEN]", message: "GET: Activation route to activate your account" });
    }
    var hasProfileRoute = (options.profile && typeof options.profile === "boolean") ? options.profile : true;
    if (hasProfileRoute) {
        var profileRoute = hasProfileRoute && (options.profile && typeof options.profile === "string") ? options.profile : "/profile";
        routes.push({ route: "" + apiRoute + profileRoute, message: "GET: Returns your profile." });
        routes.push({ route: "" + apiRoute + profileRoute, message: "PUT: Updates your profile, you can send first, name, email, and password." });
        routes.push({ route: "" + apiRoute + profileRoute, message: "DELETE: Deletes your profile." });
    }
    apiRoutes.get("/", function (req, res) {
        res.json(routes);
    });
}
//# sourceMappingURL=index.js.map