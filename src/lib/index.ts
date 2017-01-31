// See also https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens
import { Application, Request, Response, NextFunction, Router } from "express";
import * as jwt from "jsonwebtoken";
import * as userRoute from "./routes/user";
import * as loginRoute from "./routes/login";
import * as verifyRoute from "./routes/verify";
import { INodeAuthOptions } from "./models/options";

/**
 * Return a function that authenticates the user, and sets the User details as req['user']: IUser (without pwd).
 *
 * @param {string} secretKey
 * @returns
 */
function authenticateUser(secretKey: string, blockUnauthenticatedUser = true) {
  const authnErrorHandler = blockUnauthenticatedUser
    ? function (req: Request, res: Response, next: NextFunction, msg?: string) {
      // AuthN failed, so return an error.
      res.status(403).json({
        success: false,
        message: msg
      });
    }
    : function (req: Request, res: Response, next: NextFunction, msg?: string) {
      // Do not block, delete the user request object, if any, and continue
      delete req["user"];
      next();
    };

  return (req: Request, res: Response, next: NextFunction) => {
    // check header or url parameters or post parameters for token
    const token = userRoute.getToken(req);
    if (!token) {
      authnErrorHandler(req, res, next, "No token provided");
    } else {
      // decode token: verifies secret and checks exp
      jwt.verify(token, secretKey, (err, user) => {
        if (err) {
          authnErrorHandler(req, res, next, "Failed to authenticate token.");
          // res.json({ success: false, message: 'Failed to authenticate token.' });
        } else {
          // console.log(JSON.stringify(user, null, 2));
          // if everything is good, save to request for use in other routes
          req["user"] = user;
          next();
        }
      });
    }
  };
}

/**
 * Small piece of documentation of the API, available at '/api'.
 *
 * @param {Router} apiRoutes
 * @param {INodeAuthOptions} options
 */
function createApiRoute(apiRoutes: Router, options: INodeAuthOptions) {
  let routes = [];

  const apiRoute = (options.api && typeof options.api === "string") ? options.api : "/api";

  const login = getRoute(options.login, "/login");
  if (login) {
    routes.push({ route: `${apiRoute}${login}`, message: "POST: Login route, post email and password, returns JSON web token." });
  }

  const signupRoute = getRoute(options.signup, "/signup");
  if (signupRoute) {
    routes.push({ route: `${apiRoute}${signupRoute}`, message: "POST: Signup route, post email and password, and optionally, first and name." });
  }

  const verificationRoute = getRoute(options.verify && options.verify.route, "/activate");
  if (verificationRoute) {
    routes.push({ route: `${apiRoute}${verificationRoute}?email=[EMAIL]`, message: "GET: Activation route to resend your activation email." });
    routes.push({ route: `${apiRoute}${verificationRoute}/[ID]?t=[TOKEN]`, message: "GET: Activation route to activate your account" });
  }

  const profileRoute = getRoute(options.profile, "/profile");
  if (profileRoute) {
    routes.push({ route: `${apiRoute}${profileRoute}`, message: "GET: Returns your profile." });
    routes.push({ route: `${apiRoute}${profileRoute}`, message: "PUT: Updates your profile, you can send first, name, email, and password." });
    routes.push({ route: `${apiRoute}${profileRoute}`, message: "DELETE: Deletes your profile." });
  }
  apiRoutes.get("/", (req: Request, res: Response) => {
    res.json(routes);
  });
}

function getRoute(route: string | boolean, defaultRoute: string) {
  if (typeof route === "string") {
    return route;
  } else {
    return (typeof route === "undefined" || !route) ? defaultRoute : undefined;
  }
}

function createRoutes(secretKey: string, options: INodeAuthOptions) {
  const apiRoutes = Router();
  loginRoute.init(options);
  userRoute.init(options);
  verifyRoute.init(options);

  createApiRoute(apiRoutes, options);

  const login = getRoute(options.login, "/login");
  if (login) {
    apiRoutes.route(login)
      .post(loginRoute.login);
  }

  const signupRoute = getRoute(options.signup, "/signup");
  if (signupRoute) {
    apiRoutes.route(signupRoute)
      .post(userRoute.signupUser);
  }

  const verificationRoute = getRoute(options.verify && options.verify.route, "/activate");
  if (verificationRoute) {
    apiRoutes.route(`${verificationRoute}`)
      .get(verifyRoute.resendEmail);

    apiRoutes.route(`${verificationRoute}/:id`)
      .get(verifyRoute.verifyEmail);
  }

  // From hence on forward, requires authentication

  apiRoutes.use(authenticateUser(secretKey, true)); // Always block non-authenticated users for all API calls

  const profileRoute = getRoute(options.profile, "/profile");
  if (profileRoute) {
    apiRoutes.route(profileRoute)
      .get(userRoute.getProfile)
      .put(userRoute.updateProfile)
      .delete(userRoute.deleteProfile);
  }

  const usersRoute = getRoute(options.users, "/users");
  if (usersRoute) {
    apiRoutes.route(usersRoute)
      .get(userRoute.listUsers)
      .post(userRoute.createUser);

    apiRoutes.route(`${usersRoute}/:id`)
      .get(userRoute.getUser)
      .delete(userRoute.deleteUser)
      .put(userRoute.updateUser);
  }

  return apiRoutes;
}

/**
 * Main function is returned to the express app.
 * It sets up the API routes:
 * - Public routes to login and get an overview of the API
 * - All routes created after calling it are being authenticated
 *
 * @export
 * @param {Application} app
 * @param {INodeAuthOptions} options
 * @returns
 */
export function nodeAuth(app: Application, options: INodeAuthOptions): (req: Request, res: Response, next: NextFunction) => void {
  const secretKey = options.secretKey;
  if (secretKey === null) { throw new Error("secretKey must be set"); }

  const apiRoute = (options.api && typeof options.api === "string") ? options.api : "/api";

  // apply the routes to our application with the prefix /api
  app.use(apiRoute, createRoutes(secretKey, options));

  return authenticateUser(secretKey, options.blockUnauthenticatedUser);
}
