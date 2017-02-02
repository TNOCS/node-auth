import { Request, Response } from "express";
import { IUser } from "../models/user";
import { INodeAuthOptions } from "../models/options";
export declare function init(options: INodeAuthOptions): void;
export declare function verifyEmail(req: Request, res: Response): void;
export declare function sendVerificationMessage(user: IUser): void;
export declare function resendEmail(req: Request, res: Response): void;
