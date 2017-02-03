import { Request } from "express";
import { IUser } from "../models/user";
import { Resource } from "../models/resource";
export interface AuthRequest extends Request {
    user?: IUser;
    resource?: Resource;
}
