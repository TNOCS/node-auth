import { Resource } from "../models/resource";
import { IUser } from "../models/user";
import { Action } from "../models/action";
export interface Rule {
    subject?: IUser;
    action?: Action;
    resource?: Resource;
}
