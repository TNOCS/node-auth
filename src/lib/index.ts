// See also https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens
import { Application, Request, Response, NextFunction, Router } from 'express';
import * as jwt from 'jsonwebtoken';
import * as userRoute from './routes/user';
import * as loginRoute from './routes/login';
import * as verifyRoute from './routes/verify';
import { INodeAuthOptions } from './models/options';

// DONE Add API to delete users as admin
// DONE Add API to create/signup users as admin (e.g. when users cannot create themselves)
// DONE Add API hook (callback) when a user is deleted
// DONE Add API hook (callback) when a user changes his email
// DONE Add API hook (callback) when a user changes his profile: the response may contain user specific data that needs to be set too before saving.
// TODO Add API hook (callback) when a user needs to confirm his email before he is given access

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
  if (secretKey === null) throw new Error('secretKey must be set');

  const apiRoute = (options.api && typeof options.api === 'string') ? options.api : '/api';

  // apply the routes to our application with the prefix /api
  app.use(apiRoute, createRoutes(secretKey, options));

  return authenticateUser(secretKey, options.blockUnauthenticatedUser);
}

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
      delete req['user'];
      next();
    };

  return (req: Request, res: Response, next: NextFunction) => {
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

function createRoutes(secretKey: string, options: INodeAuthOptions) {
  const apiRoutes = Router();
  loginRoute.init(options);
  userRoute.init(options);
  verifyRoute.init(options);

  createApiRoute(apiRoutes, options);

  const hasLoginRoute = (options.login && typeof options.login === 'boolean') ? options.login : true;
  if (hasLoginRoute) {
    // route to authenticate a user (e.g. POST http://localhost:3210/api/login)
    const login = (options.login && typeof options.login === 'string') ? options.login : '/login';
    // const expiresIn = options.expiresIn ? options.expiresIn : '1d';
    // createLoginRoute(secretKey, apiRoutes, loginRoute, expiresIn);
    apiRoutes.route(login)
      .post(loginRoute.login);
  }

  const hasSignupRoute = (options.signup && typeof options.signup === 'boolean') ? options.signup : true;
  if (hasSignupRoute) {
    // route to create a user (e.g. POST http://localhost:3210/api/signup)
    const signupRoute = (options.signup && typeof options.signup === 'string') ? options.signup : '/signup';
    apiRoutes.route(signupRoute)
      .post(userRoute.signupUser);
  }

  const hasVerificationRoute = (options.verify && options.verify.route && typeof options.verify.route === 'boolean') ? options.verify : true;
  if (hasVerificationRoute) {
    const verificationRoute = (options.verify && options.verify.route && typeof options.verify.route === 'string') ? options.verify.route : '/activate';

    apiRoutes.route(`${verificationRoute}`)
      .get(verifyRoute.resendEmail);

    apiRoutes.route(`${verificationRoute}/:id`)
      .get(verifyRoute.verifyEmail);
  }

  // From hence on forward, requires authentication

  apiRoutes.use(authenticateUser(secretKey, true)); // Always block non-authenticated users for all API calls

  const hasProfileRoute = (options.profile && typeof options.profile === 'boolean') ? options.profile : true;
  if (hasProfileRoute) {
    // route to read/update a user (e.g. POST http://localhost:3210/api/profile)
    const profileRoute = (options.profile && typeof options.profile === 'string') ? options.profile : '/profile';
    apiRoutes.route(profileRoute)
      .get(userRoute.getProfile)
      .put(userRoute.updateProfile)
      .delete(userRoute.deleteProfile)
  }

  const hasUsersRoute = (options.users && typeof options.users === 'boolean') ? options.users : true;
  if (hasUsersRoute) {
    // route to create a user (e.g. POST http://localhost:3210/api/users)
    const usersRoute = (options.users && typeof options.users === 'string') ? options.users : '/users';
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
 * Small piece of documentation of the API, available at '/api'.
 *
 * @param {Router} apiRoutes
 * @param {INodeAuthOptions} options
 */
function createApiRoute(apiRoutes: Router, options: INodeAuthOptions) {
  let routes = [];
  const apiRoute = (options.api && typeof options.api === 'string') ? options.api : '/api';
  const hasLoginRoute = (options.login && typeof options.login === 'boolean') ? options.login : true;
  if (hasLoginRoute) {
    const loginRoute = hasLoginRoute && (options.login && typeof options.login === 'string') ? options.login : '/login';
    routes.push({ route: `${apiRoute}${loginRoute}`, message: 'POST: Login route, post email and password, returns JSON web token.' });
  }
  const hasSignupRoute = (options.signup && typeof options.signup === 'boolean') ? options.signup : true;
  if (hasSignupRoute) {
    const signupRoute = hasSignupRoute && (options.signup && typeof options.signup === 'string') ? options.signup : '/signup';
    routes.push({ route: `${apiRoute}${signupRoute}`, message: 'POST: Signup route, post email and password, and optionally, first and name.' });
  }
  const hasVerificationRoute = (options.verify && options.verify.route && typeof options.verify.route === 'boolean') ? options.verify : true;
  if (hasVerificationRoute) {
    const verificationRoute = (options.verify && options.verify.route && typeof options.verify.route === 'string') ? options.verify.route : '/activate';
    routes.push({ route: `${apiRoute}${verificationRoute}?email=[EMAIL]`, message: 'GET: Activation route to resend your activation email.' });
    routes.push({ route: `${apiRoute}${verificationRoute}/[ID]?t=[TOKEN]`, message: 'GET: Activation route to activate your account' });
  }
  const hasProfileRoute = (options.profile && typeof options.profile === 'boolean') ? options.profile : true;
  if (hasProfileRoute) {
    const profileRoute = hasProfileRoute && (options.profile && typeof options.profile === 'string') ? options.profile : '/profile';
    routes.push({ route: `${apiRoute}${profileRoute}`, message: 'GET: Returns your profile.' });
    routes.push({ route: `${apiRoute}${profileRoute}`, message: 'PUT: Updates your profile, you can send first, name, email, and password.' });
    routes.push({ route: `${apiRoute}${profileRoute}`, message: 'DELETE: Deletes your profile.' });
  }
  apiRoutes.get('/', (req: Request, res: Response) => {
    res.json(routes);
  });
}
