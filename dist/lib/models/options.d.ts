import { Request } from 'express';
import { IUser } from './user';
import { CRUD } from './crud';
export interface INodeAuthOptions {
    secretKey: string;
    expiresIn?: string;
    blockUnauthenticatedUser?: boolean;
    api?: string;
    login?: string | boolean;
    signup?: string | boolean;
    profile?: string | boolean;
    authorizations?: string | boolean;
    users?: string;
    onUserChanged?: (user: IUser, req: Request, change: CRUD) => IUser | void;
    verify?: {
        route?: string | boolean;
        baseUrl: string;
        mailService: nodemailer.Transport;
        verifyMailOptions: nodemailer.SendMailOptions;
        confirmMailOptions: nodemailer.SendMailOptions;
        verificationMessageSendCallback?: (err: Error, info: nodemailer.SentMessageInfo) => void;
        confirmationMessageSendCallback?: (err: Error, info: nodemailer.SentMessageInfo) => void;
    };
}
