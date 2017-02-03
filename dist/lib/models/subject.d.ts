/// <reference types="chai" />
export interface Subject {
    _id?: string;
    email?: string;
    name?: string;
    admin?: boolean;
    verified?: boolean;
    subscribed?: boolean;
    createdAt?: Date;
    role?: string;
    data?: Object;
}
