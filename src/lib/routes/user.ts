// See also https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens
import { Request, Response } from 'express';
import { User, IUser, IUserModel, validateEmailAddress } from '../models/user';
import { CRUD } from '../models/crud';
import { INodeAuthOptions } from '../models/options';

// export type CRUD = 'create' | 'update' | 'delete';
export type UserChangedEvent = (user: IUser, req: Request, change: CRUD) => IUser | void;

// const log = console.log;
const error = console.error;

let onUserChanged: UserChangedEvent;
let signupAllowed = false;

/**
 * Initialize the user route, e.g. by setting up the onUserChanged event handler.
 *
 * @export
 * @param {INodeAuthOptions} options
 */
export function init(options: INodeAuthOptions) {
  onUserChanged = options.onUserChanged;
  if (!options.hasOwnProperty('signup') || options.signup) { signupAllowed = true; }
}

/**
 * List all users
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 * @returns
 */
export function listUsers(req: Request, res: Response) {
  const user: IUser = req['user'];
  if (!user.admin) {
    res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, message: 'You are not authorised to request all users. Grow up and become an admin first!' });
    return;
  }
  User.find({}, (err, users: IUserModel[]) => {
    if (err) {
      res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, message: 'Error retreiving users.' });
      return;
    }
    let filteredUsers = users.map(u => {
      let user = <IUser>u.toJSON();
      delete user.password;
      return user;
    });
    res.json(filteredUsers);
  });
}

/**
 * Get a user
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 * @returns
 */
export function getUser(req: Request, res: Response) {
  const id: string = req.params['id'];
  const user: IUser = req['user'];

  if (!user.admin && user._id.toString() !== id) {
    res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, message: 'You are not authorised to request this user.' });
    return;
  }
  User.findById(id, (err, user: IUser) => {
    if (err) {
      res.status(HTTPStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Error retreiving user.' });
      return;
    }
    delete user.password;
    res.json({ user: user });
  });
}

/**
 * Simple helper function to get the token.
 *
 * @export
 * @param {Request} req
 * @returns
 */
export function getToken(req: Request) {
  return req.headers['authorization'] || req.headers['x-access-token'] || req['query']['token'] || req['body']['token'];
}

/**
 * Save the user
 *
 * @param {IUserModel} user
 * @param {Request} req
 * @param {Response} res
 */
function saveUser(user: IUserModel, req: Request, res: Response) {
  user.save(err => {
    if (err) {
      error(err);
      return res.status(HTTPStatusCodes.UNPROCESSABLE_ENTITY).json({ success: false, message: 'User could not be created.' });
    }
    // log('User saved successfully');
    const json = <IUser> user.toJSON();
    delete json.password;
    return res.status(HTTPStatusCodes.CREATED).json( { user: json });
  });
}

/**
 * Create a new user
 * Internal function, which does not check permissions.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns
 */
function createNewUser(req: Request, res: Response) {
  const name = req['body'].name;
  const email = req['body'].email;
  const password = req['body'].password;
  const admin = req['body'].admin;

  if (!name || !email || !password || !validateEmailAddress(email)) {
    res.status(HTTPStatusCodes.PRECONDITION_FAILED).json({ success: false, message: 'Signup with name, email and password!' });
    return;
  }

  const user = new User({
    name: name,
    email: email.toLowerCase(),
    password: password,
    verified: false,
    admin: req['user'] && req['user'].admin ? admin : false, // If the request is created by an admin, allow him to set the admin property.
    data: {}
  });

  if (onUserChanged) {
    let changedUser = onUserChanged(user, req, 'create');
    if (changedUser) {
      if (changedUser.verified) { user.verified = changedUser.verified; }
      if (changedUser.admin) { user.admin = changedUser.admin; }
      if (changedUser.data) { user.data = changedUser.data; }
    }
  }

  saveUser(user, req, res);
}

/**
 * Signup unauthenticated users.
 * This differs from the createUser function, as it only allows unauthenticated users to signup.
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 */
export function signupUser(req: Request, res: Response) {
  const token = getToken(req);
  if (token) {
    res.status(HTTPStatusCodes.BAD_REQUEST).json({ success: false, message: 'You are already signed in. Please logout first.'});
    return;
  }
  createNewUser(req, res);
}

/**
 * Create a new user: admin users can set the admin property.
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 * @param {UserChangedEvent} onUserChanged
 * @returns
 */
export function createUser(req: Request, res: Response) {
  const adminUser = <IUser> req['user'];
  if (!adminUser || !adminUser.admin) {
    res.status(HTTPStatusCodes.METHOD_NOT_ALLOWED).json( { success: false, message: 'Regular users cannot create new user. Ask an administrator.' });
    return;
  }
  createNewUser(req, res);
}

/**
 * PUT /user/:id to update a user given its id
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 * @param {UserChangedEvent} onUserChanged
 * @returns
 */
export function updateUser(req: Request, res: Response) {
  const updatedUser: IUser = req['body'];
  const id: string = req.params['id'];
  const user: IUser = req['user'];

  if (!id) {
    res.status(HTTPStatusCodes.PRECONDITION_FAILED).json({ success: false, message: 'Specify the user\'s ID' });
    return;
  }

  if (!user.admin && user._id.toString() !== id) {
    res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, message: 'Request denied' });
    return;
  }

  if (!user.admin) {
    delete updatedUser.admin;
  }

  if (onUserChanged) {
    onUserChanged(updatedUser, req, 'update');
  }

  // The { new: true } option means it will return the updated document
  // See http://mongoosejs.com/docs/api.html#model_Model.findByIdAndUpdate
  User.findByIdAndUpdate(id, updatedUser, { new: true }, (err, finalUser) => {
    if (err) {
      res.status(HTTPStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error. Please try again later.' });
      return;
    }
    const u = <IUser>finalUser.toJSON();
    delete u.password;
    res.json({ user: u });
  });
}

/**
 * Delete a user.
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 * @param {UserChangedEvent} onUserChanged
 * @returns
 */
export function deleteUser(req: Request, res: Response) {
  const id: string = req.params['id'];
  const user: IUser = req['user'];

  if (!id) {
    res.status(HTTPStatusCodes.PRECONDITION_FAILED).json({ success: false, message: 'Specify the user\'s ID' });
    return;
  }

  if (!user.admin && user._id.toString() !== id) {
    res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, message: 'Request denied' });
    return;
  }

  if (onUserChanged) {
    onUserChanged(user, req, 'delete');
  }

  User.findByIdAndRemove(id, err => {
    if (err) {
      res.status(HTTPStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Internal server error. Please try again later.' });
      return;
    }
    res.status(HTTPStatusCodes.NO_CONTENT).end();
  });
}

/********************
 * PROFILE FUNCTIONS
 ********************/

function setUserIdAsParameter(req: Request) {
  const user: IUser = req['user'];
  if (!req.params) { req.params = {}; }
  req.params['id'] = user._id.toString();
}

/**
 * Get the user's profile
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 */
export function getProfile(req: Request, res: Response) {
  setUserIdAsParameter(req);
  getUser(req, res);
}

/**
 * Update the user's profile
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 */
export function updateProfile(req: Request, res: Response) {
  setUserIdAsParameter(req);
  updateUser(req, res);
}

/**
 * Delete the user's profile
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 */
export function deleteProfile(req: Request, res: Response) {
  setUserIdAsParameter(req);
  deleteUser(req, res);
}
