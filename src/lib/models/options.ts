import { SendMailOptions, SentMessageInfo, Transport } from 'nodemailer';
import { Request } from 'express';
import { IUser } from './user';
import { CRUD } from './crud';
// import { PolicyStore } from '../authorize/policy-store';
import { IPolicyStore } from '../authorize/policy-store';

export interface INodeAuthOptions {
  /** The secret for encrypting and decrypting the JWT */
  secretKey: string;
  /**
   * Lifetime of the token expressed in a string as a timespan, default 1 day ('1d'),
   * e.g. '60', '1d', '24h', '2 days'. See https://github.com/zeit/ms.
   */
  expiresIn?: string;
  /**
   * By default, all users that are not authenticated (they have no valid token) will be blocked and an UNAUTHORIZED error is returned.
   * However, sometimes you may wish to let them through anyways, and verify them in your own code. In that case, set this property to false,
   * which will clear any user preoperty of the request object.
   * NOTE: Even when set to false, all api/* (except api/login and api/signup) routes will be blocked from unauthenticated access.
   *
   * @type {boolean}
   * @memberOf INodeAuthOptions (default true)
   */
  blockUnauthenticatedUser?: boolean;
  /** The API route, default /api. */
  api?: string;
  /** The login route, default /api/login. If false, don't create it. */
  login?: string | boolean;
  /** The signup route, default /api/signup. If false, don't create it. */
  signup?: string | boolean;
  /** The profile route, default /api/profile. If false, don't create it. */
  profile?: string | boolean;
  /** The authorization route, default /api/authorizations. If false, don't create it. */
  authorizations?: string | boolean;
  /** Required only if you would like to use /api/authorizations */
  policyStore?: IPolicyStore;
  /** List of all users (only accessible to admins), default /api/users. If false, don't create it. */
  users?: string;
  /**
   * Callback function, is called when the user is changed (before we save the user).
   * If you return an IUser object, the properties verified, admin and data can be overwritten.
   */
  onUserChanged?: (user: IUser, req: Request, change: CRUD) => IUser | void;
  /** If supplied, verify the account's email */
  verify?: {
    /** Verification route */
    route?: string | boolean;
    /** Base URL for verification emails, e.g. www.mydomain.com/api/activate */
    baseUrl: string;
    /** Nodemailer transport for sending emails. Please use ${URL} as a placeholder for the verification URL. */
    mailService: Transport;
    /**
      verifyMailOptions: {
            from: 'Do Not Reply <user@gmail.com>',
            subject: 'Confirm your account',
            html: '<p>Please verify your account by clicking <a href="${URL}">this link</a>. If you are unable to do so, copy and ' +
              'paste the following link into your browser:</p><p>${URL}</p>',
            text: 'Please verify your account by clicking the following link, or by copying and pasting it into your browser: ${URL}'
          },
     */
    verifyMailOptions: SendMailOptions;
    /**
      confirmMailOptions: {
        from: 'Do Not Reply <user@gmail.com>',
        subject: 'Successfully verified!',
        html: '<p>Your account has been successfully verified.</p>',
        text: 'Your account has been successfully verified.'
      },
     */
    confirmMailOptions: SendMailOptions;
    verificationMessageSendCallback?: (err: Error, info: SentMessageInfo) => void;
    confirmationMessageSendCallback?: (err: Error, info: SentMessageInfo) => void;
  };
}
