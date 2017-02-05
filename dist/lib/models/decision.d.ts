import { Subject } from './subject';
import { Action } from './action';
import { Resource } from './resource';
export declare enum Decision {
    Deny = 0,
    Permit = 1,
    PartialPermit = 2,
}
export interface PermissionRequest {
    subject?: Subject;
    action?: Action;
    resource?: Resource;
}
