"use strict";
var express_1 = require("express");
var jwt = require("jsonwebtoken");
var userRoute = require("./routes/user");
var loginRoute = require("./routes/login");
var verifyRoute = require("./routes/verify");
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
function getRoute(route, defaultRoute) {
    if (typeof route === "string") {
        return route;
    }
    else {
        return (route == null || !route) ? defaultRoute : null;
    }
}
function createApiRoute(apiRoutes, options) {
    var routes = [];
    var apiRoute = (options.api && typeof options.api === "string") ? options.api : "/api";
    var login = getRoute(options.login, "/login");
    if (login) {
        routes.push({ route: "" + apiRoute + login, message: "POST: Login route, post email and password, returns JSON web token." });
    }
    var signupRoute = getRoute(options.signup, "/signup");
    if (signupRoute) {
        routes.push({ route: "" + apiRoute + signupRoute, message: "POST: Signup route, post email and password, and optionally, first and name." });
    }
    var verificationRoute = getRoute(options.verify && options.verify.route, "/activate");
    if (verificationRoute) {
        routes.push({ route: "" + apiRoute + verificationRoute + "?email=[EMAIL]", message: "GET: Activation route to resend your activation email." });
        routes.push({ route: "" + apiRoute + verificationRoute + "/[ID]?t=[TOKEN]", message: "GET: Activation route to activate your account" });
    }
    var profileRoute = getRoute(options.profile, "/profile");
    if (profileRoute) {
        routes.push({ route: "" + apiRoute + profileRoute, message: "GET: Returns your profile." });
        routes.push({ route: "" + apiRoute + profileRoute, message: "PUT: Updates your profile, you can send first, name, email, and password." });
        routes.push({ route: "" + apiRoute + profileRoute, message: "DELETE: Deletes your profile." });
    }
    apiRoutes.get("/", function (req, res) {
        res.json(routes);
    });
}
function createRoutes(secretKey, options) {
    var apiRoutes = express_1.Router();
    loginRoute.init(options);
    userRoute.init(options);
    verifyRoute.init(options);
    createApiRoute(apiRoutes, options);
    var login = getRoute(options.login, "/login");
    if (login) {
        apiRoutes.route(login)
            .post(loginRoute.login);
    }
    var signupRoute = getRoute(options.signup, "/signup");
    if (signupRoute) {
        apiRoutes.route(signupRoute)
            .post(userRoute.signupUser);
    }
    var verificationRoute = getRoute(options.verify && options.verify.route, "/activate");
    if (verificationRoute) {
        apiRoutes.route("" + verificationRoute)
            .get(verifyRoute.resendEmail);
        apiRoutes.route(verificationRoute + "/:id")
            .get(verifyRoute.verifyEmail);
    }
    apiRoutes.use(authenticateUser(secretKey, true));
    var profileRoute = getRoute(options.profile, "/profile");
    if (profileRoute) {
        apiRoutes.route(profileRoute)
            .get(userRoute.getProfile)
            .put(userRoute.updateProfile)
            .delete(userRoute.deleteProfile);
    }
    var usersRoute = getRoute(options.users, "/users");
    if (usersRoute) {
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
function nodeAuth(app, options) {
    var secretKey = options.secretKey;
    if (secretKey === null) {
        throw new Error("secretKey must be set");
    }
    var apiRoute = getRoute(options.api, "/api");
    app.use(apiRoute, createRoutes(secretKey, options));
    return authenticateUser(secretKey, options.blockUnauthenticatedUser);
}
exports.nodeAuth = nodeAuth;
//# sourceMappingURL=index.js.map