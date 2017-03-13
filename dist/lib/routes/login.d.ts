/// <reference types="express" />
import { Request, Response } from 'express';
import { IUser } from '../models/user';
import { CRUD } from '../models/crud';
import { INodeAuthOptions } from '../models/options';
export declare type UserChangedEvent = (user: IUser, req: Request, change: CRUD) => IUser | void;
export declare function init(options: INodeAuthOptions): void;
export declare function login(req: Request, res: Response): void;
