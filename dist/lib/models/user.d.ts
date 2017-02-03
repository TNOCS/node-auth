/// <reference types="chai" />
import * as mongoose from 'mongoose';
export interface IUser {
    _id: mongoose.Types.ObjectId;
    email?: string;
    password?: string;
    first?: string;
    name?: string;
    admin?: boolean;
    verified?: boolean;
    subscribed?: boolean;
    expires?: Date;
    createdAt?: Date;
    role?: string;
    data?: Object;
}
export interface IUserModel extends IUser, mongoose.Document {
    comparePassword: (pwd: string, callback: (err: Error, isMatch: boolean) => void) => void;
}
export declare function validateEmailAddress(email: string): boolean;
export declare const User: mongoose.Model<IUserModel>;
