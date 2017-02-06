import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { User, IUser } from '../models/user';
import { INodeAuthOptions } from '../models/options';

const error = console.error;
const urlRegex = /\$\{URL\}/g; // regex to replace ${URL} in templates

let verificationURL: string;
let mailService: nodemailer.Transport;
let verifyMailOptions: nodemailer.SendMailOptions;
let confirmMailOptions: nodemailer.SendMailOptions;
let verificationMessageSendCallback: (err: Error, info: nodemailer.SentMessageInfo) => void;
let confirmationMessageSendCallback: (err: Error, info: nodemailer.SentMessageInfo) => void;

/**
 * Initialize the user route, e.g. by setting up the onUserChanged event handler.
 *
 * @export
 * @param {INodeAuthOptions} options
 */
export function init(options: INodeAuthOptions) {
  if (!options.verify) { return; }
  verificationURL = options.verify.baseUrl;
  mailService = options.verify.mailService;
  verifyMailOptions = options.verify.verifyMailOptions;
  confirmMailOptions = options.verify.confirmMailOptions;
  verificationMessageSendCallback = options.verify.verificationMessageSendCallback;
  confirmationMessageSendCallback = options.verify.confirmationMessageSendCallback;
}

function sendConfirmationEmail(user: IUser) {
  if (!confirmMailOptions) { return; }
  const mailOptions = JSON.parse(JSON.stringify(confirmMailOptions)); // clone
  mailOptions.to = user.email;
  mailService && mailService.send(mailOptions, confirmationMessageSendCallback);
}

/**
 * Verify the user's email address, e.g. /api/users/:id?t=jwt
 * where jwt is a token
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 */
export function verifyEmail(req: Request, res: Response) {
  const id = req.params['id'];
  const token = req.query['t'];
  if (!id || !token) {
    res.status(HTTPStatusCodes.BAD_REQUEST).json({ success: false, message: 'Please create a valid request!' });
    return;
  }
  User.findById(id, (err, user) => {
    if (err || !user) {
      res.status(HTTPStatusCodes.BAD_REQUEST).json({ success: false, message: 'Please create a valid request!' });
      return;
    }
    bcrypt.compare(user.email, token)
      .then(ok => {
        if (!ok) {
          res.status(HTTPStatusCodes.BAD_REQUEST).json({ success: false, message: 'Please create a valid request!' });
          return;
        }
        user.update({ verified: true }, (err, result) => {
          if (err) {
            error(err);
            res.status(HTTPStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Something did not work as expected. Please come back later and try again.' });
            return;
          }
          res.status(HTTPStatusCodes.OK).json({ success: true, message: 'Your email was verified successfully. Thank you!' });
          sendConfirmationEmail(user);
        });
      })
      .catch(err => {
        // error(err);
        res.status(HTTPStatusCodes.BAD_REQUEST).json({ success: false, message: 'Please create a valid request!' });
      });
  });
}

/**
 * Send a verification message by encrypting the email and adding it as token.
 *
 * @export
 * @param {IUser} user
 * @param {(err: Error, info: nodemailer.SentMessageInfo) => void} [callback]
 */
export function sendVerificationMessage(user: IUser) {
  if (!verifyMailOptions) { return; }
  bcrypt.hash(user.email, 10, (err, hash) => {
    if (err) {
      error(err);
      return;
    }
    // inject newly-created URL into the email's body and FIRE
    const URL = `${verificationURL}/${user._id.toString()}?t=${hash}`; // e.g. /api/activate/1234?t=5678
    const mailOptions = JSON.parse(JSON.stringify(verifyMailOptions)); // clone

    mailOptions.to = user.email;
    if (mailOptions.html) { mailOptions.html = mailOptions.html.replace(urlRegex, URL); }
    if (mailOptions.text) { mailOptions.text = mailOptions.text.replace(urlRegex, URL); }

    mailService && mailService.send(mailOptions, verificationMessageSendCallback);
  });
}

/**
 * Resend verification email.
 * GET /api/activate?email=[EMAIL]
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 * @returns
 */
export function resendEmail(req: Request, res: Response) {
  const email = req.query['email'];
  if (!email) {
    res.status(HTTPStatusCodes.BAD_REQUEST).json({ success: false, message: 'Please send your email to activate your account.' });
    return;
  }
  User.findOne( { email: email.toLowerCase()}, (err, user) => {
    if (err || !user) {
      res.status(HTTPStatusCodes.BAD_REQUEST).json({ success: false, message: 'Please signup first.' });
      return;
    }
    if (user.verified) {
      res.status(HTTPStatusCodes.BAD_REQUEST).json({ success: false, message: 'User is already verified.' });
      return;
    }
    sendVerificationMessage(user);
    res.status(HTTPStatusCodes.OK).json({ success: true, message: 'Verification email sent.' });
  });
}

