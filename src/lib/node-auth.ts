import { UNAUTHORIZED } from 'http-status-codes';
import { Request, Response, NextFunction} from 'express';
// See also https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens
// import { Application, Response, NextFunction, Router, Request } from 'express';
import * as express from 'express';
// import { Request as _Request } from '~express/lib/request';
// import { Response as _Response } from '~express/lib/response';
// import { NextFunction as _NextFunction } from '~express/lib/router/index';
import * as jwt from 'jsonwebtoken';
import * as userRoute from './routes/user';
import * as loginRoute from './routes/login';
import * as verifyRoute from './routes/verify';
import * as authzRoute from './routes/authorize';
import { INodeAuthOptions } from './models/options';
// import { PolicySet } from './models/policy';
// import { initPolicyStore } from '../lib/authorize/policy-store';
import { initPEP, PolicyEnforcementPoint } from '../lib/authorize/pep';
// import { PolicyStore } from '../lib/authorize/policy-store';

/**
 * Return a function that authenticates the user, and sets the User details as req['user']: IUser (without pwd).
 *
 * @param {string} secretKey
 * @returns
 */
function authenticateUser(secretKey: string, blockUnauthenticatedUser = true) {
  const authnErrorHandler = blockUnauthenticatedUser
    ? (req: express.Request, res: express.Response, next: express.NextFunction, msg?: string) => {
      // AuthN failed, so return an error.
      res.status(UNAUTHORIZED).json({
        success: false,
        message: msg
      });
    }
    : (req: express.Request, res: express.Response, next: express.NextFunction, msg?: string) => {
      // Do not block, delete the user request object, if any, and continue
      delete req['user'];
      next();
    };

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // check header or url parameters or post parameters for token
    const token = userRoute.getToken(req);
    if (!token) {
      authnErrorHandler(req, res, next, 'No token provided');
    } else {
      // decode token: verifies secret and checks exp
      jwt.verify(token, secretKey, (err, user) => {
        if (err) {
          authnErrorHandler(req, res, next, 'Failed to authenticate token.');
          // res.json({ success: false, message: 'Failed to authenticate token.' });
        } else {
          // console.log(JSON.stringify(user, null, 2));
          // if everything is good, save to request for use in other routes
          req['user'] = user;
          next();
        }
      });
    }
  };
}

function getRoute(route: string | boolean, defaultRoute: string) {
  if (typeof route === 'string') {
    return route;
  } else {
    return (route == null || route) ? defaultRoute : null;
  }
}

/**
 * Small piece of documentation of the API, available at '/api'.
 *
 * @param {Router} apiRoutes
 * @param {INodeAuthOptions} options
 */
function createApiRoute(apiRoutes: express.Router, options: INodeAuthOptions) {
  let routes = [];

  const apiRoute = (options.api && typeof options.api === 'string') ? options.api : '/api';

  const login = getRoute(options.login, '/login');
  if (login) {
    routes.push({ route: `${apiRoute}${login}`, message: 'POST: Login route, post email and password, returns JSON web token.' });
  }

  const signupRoute = getRoute(options.signup, '/signup');
  if (signupRoute) {
    routes.push({ route: `${apiRoute}${signupRoute}`, message: 'POST: Signup route, post email and password, and optionally, first and name.' });
  }

  const verificationRoute = getRoute(options.verify && options.verify.route, '/activate');
  if (verificationRoute) {
    routes.push({ route: `${apiRoute}${verificationRoute}?email=[EMAIL]`, message: 'GET: Activation route to resend your activation email.' });
    routes.push({ route: `${apiRoute}${verificationRoute}/[ID]?t=[TOKEN]`, message: 'GET: Activation route to activate your account' });
  }

  const profileRoute = getRoute(options.profile, '/profile');
  if (profileRoute) {
    routes.push({ route: `${apiRoute}${profileRoute}`, message: 'GET: Returns your profile.' });
    routes.push({ route: `${apiRoute}${profileRoute}`, message: 'PUT: Updates your profile, you can send first, name, email, and password.' });
    routes.push({ route: `${apiRoute}${profileRoute}`, message: 'DELETE: Deletes your profile.' });
  }

  const authorizationRoute = getRoute(options.authorizations, '/authorizations');
  if (authorizationRoute) {
    routes.push({ route: `${apiRoute}${authorizationRoute}`, message: 'GET: Authorization route to get a user\'s privileges.' });
  }

  apiRoutes.get('/', (req: express.Request, res: express.Response) => {
    res.json(routes);
  });
}

function createRoutes(secretKey: string, options: INodeAuthOptions) {
  const apiRoutes = express.Router();
  loginRoute.init(options);
  userRoute.init(options);
  verifyRoute.init(options);
  authzRoute.init(options);

  createApiRoute(apiRoutes, options);

  const login = getRoute(options.login, '/login');
  if (login) {
    apiRoutes.route(login)
      .post(loginRoute.login);
  }

  const signupRoute = getRoute(options.signup, '/signup');
  if (signupRoute) {
    apiRoutes.route(signupRoute)
      .post(userRoute.signupUser);
  }

  const verificationRoute = getRoute(options.verify && options.verify.route, '/activate');
  if (verificationRoute) {
    apiRoutes.route(`${verificationRoute}`)
      .get(verifyRoute.resendEmail);

    apiRoutes.route(`${verificationRoute}/:id`)
      .get(verifyRoute.verifyEmail);
  }

  // From hence on forward, requires authentication

  apiRoutes.use(authenticateUser(secretKey, true)); // Always block non-authenticated users for all API calls

  const profileRoute = getRoute(options.profile, '/profile');
  if (profileRoute) {
    apiRoutes.route(profileRoute)
      .get(userRoute.getProfile)
      .put(userRoute.updateProfile)
      .delete(userRoute.deleteProfile);
  }

  const authorizationRoute = getRoute(options.authorizations, '/authorizations');
  if (authorizationRoute) {
    const cleanupJSON = (req: Request, res: Response, next: NextFunction) => {
        // In case the body is not properly send as JSON, correct some issues.
        if (req.body.hasOwnProperty('action') && typeof req.body['action'] === 'string') { req.body['action'] = +req.body['action']; }
        if (req.body.hasOwnProperty('decision') && typeof req.body['decision'] === 'string') { req.body['decision'] = +req.body['decision']; }
        next();
    };
    apiRoutes.route(authorizationRoute)
      .all(cleanupJSON)
      .get(authzRoute.getSubjectPrivileges)
      .put(authzRoute.updatePrivileges)
      .delete(authzRoute.deletePrivileges)
      .post(authzRoute.createPrivileges);

    const resource2JSON = (req: Request, res: Response, next: NextFunction) => {
        req.body = { resource: req.query };
        next();
    };
    apiRoutes.route(`${authorizationRoute}/resources`)
      .get(resource2JSON)
      .get(authzRoute.getResourcePrivileges);
  }

  const usersRoute = getRoute(options.users, '/users');
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
 * External interface
 *
 * See also: http://stackoverflow.com/questions/12766528/build-a-function-object-with-properties-in-typescript
 */
export interface NodeAuth {
  (req: express.Request, res: express.Response, next: express.NextFunction): void;
  pep?: PolicyEnforcementPoint;
}
/**
 * Main function is returned to the express app.
 * It sets up the API routes:
 * - Public routes to login and get an overview of the API
 * - All routes created after calling it are being authenticated, i.e. the request will contain a user object.
 *
 * @export
 * @param {Application} app
 * @param {INodeAuthOptions} options
 * @returns
 */
export function nodeAuth(app: express.Application, options: INodeAuthOptions) {
  const secretKey = options.secretKey || app.get('secretKey');
  if (secretKey === null) { throw new Error('secretKey must be set'); }

  const apiRoute = getRoute(options.api, '/api');

  // apply the routes to our application with the prefix /api
  app.use(apiRoute, createRoutes(secretKey, options));
  const auth = <NodeAuth> authenticateUser(secretKey, options.blockUnauthenticatedUser);
  if (options.policyStore) {
    auth.pep = initPEP(authzRoute.policyStore);
  }
  return auth;
}
