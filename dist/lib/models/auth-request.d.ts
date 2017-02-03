import { Request } from 'express';
import { IUser } from './user';
import { Resource } from './resource';
export interface AuthRequest extends Request {
    user?: IUser;
    resource?: Resource;
}
