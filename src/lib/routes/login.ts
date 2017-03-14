import * as jwt from 'jsonwebtoken';
import { Request, Response } from 'express-serve-static-core';
import { User, IUser, IUserModel } from '../models/user';
import { CRUD } from '../models/crud';
import { INodeAuthOptions } from '../models/options';
import { getToken } from './user';

// export type CRUD = 'create' | 'update' | 'delete';
export type UserChangedEvent = (user: IUser, req: Request, change: CRUD) => IUser | void;

let expiresIn: string;
let secretKey: string;

/**
 * Initialize the user route, e.g. by setting up the onUserChanged event handler.
 *
 * @export
 * @param {INodeAuthOptions} options
 */
export function init(options: INodeAuthOptions) {
  secretKey = options.secretKey;
  expiresIn = options.expiresIn ? options.expiresIn : '1d';
}

export function login(req: Request, res: Response) {
  const email = req['body'].email;
  const pwd = req['body'].password;

  const token = getToken(req);
  if (token) {
    return renewToken(req, res, token);
  }
  if (!email || !pwd) {
    return res.status(HTTPStatusCodes.UNPROCESSABLE_ENTITY).json({ success: false, message: 'Authentication failed. Body should contain an email and password property.' });
  }
  // find the user
  User.findOne({ email: email.toLowerCase() }, (err: Error, user: IUserModel) => {
    if (err || !user) {
      res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, message: 'Authentication failed.' }); // User not found
    } else if (user) {
      // console.log(JSON.stringify(user, null, 2));
      // check if password matches
      user.comparePassword(pwd, (err, isMatch) => {
        if (isMatch && !err) {
          const json = <IUser>user.toJSON();
          delete json.password;
          // if user is found and password is right create a token
          const token = jwt.sign(json, secretKey, {
            expiresIn: expiresIn
          });
          // return the information including token as JSON
          res.json({ success: true, token: token, user: json });
        } else {
          res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, msg: 'Authentication failed.' }); // Wrong password
        }
      });
    }
  });
};

/**
 * Renews an existing token if it is still valid.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {string} token
 */
function renewToken(req: Request, res: Response, token: string) {
  // renew token?
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, msg: 'Authentication failed.' }); // Wrong token
    } else {
      const jwtDecoded = jwt.decode(token);
      // find the user
      User.findOne({ email: jwtDecoded.email.toLowerCase() }, (err: Error, user: IUserModel) => {
        if (err || !user) {
          res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, message: 'Authentication failed.' }); // User not found
        } else if (user) {
          const json = <IUser>user.toJSON();
          delete json.password;
          // if user is found and password is right create a token
          const token = jwt.sign(json, secretKey, {
            expiresIn: expiresIn
          });
          // return the information including token as JSON
          res.json({ success: true, token: token, user: json });
        } else {
          res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, msg: 'Authentication failed.' }); // Wrong password
        }
      });
    }
  });
};




