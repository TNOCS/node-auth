/// <reference types="express" />
import { Request, Response } from 'express';
import { IUser } from '../models/user';
import { CRUD } from '../models/crud';
import { INodeAuthOptions } from '../models/options';
export declare type UserChangedEvent = (user: IUser, req: Request, change: CRUD) => IUser | void;
export declare function init(options: INodeAuthOptions): void;
export declare function listUsers(req: Request, res: Response): void;
export declare function getUser(req: Request, res: Response): void;
export declare function getToken(req: Request): any;
export declare function signupUser(req: Request, res: Response): void;
export declare function createUser(req: Request, res: Response): void;
export declare function updateUser(req: Request, res: Response): void;
export declare function deleteUser(req: Request, res: Response): void;
export declare function getProfile(req: Request, res: Response): void;
export declare function updateProfile(req: Request, res: Response): void;
export declare function deleteProfile(req: Request, res: Response): void;
