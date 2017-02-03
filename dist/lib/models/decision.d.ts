import { Subject } from './subject';
import { Action } from './action';
import { Resource } from './resource';
export declare enum Decision {
    permit = 0,
    deny = 1,
}
export interface PermissionRequest {
    subject?: Subject;
    action?: Action;
    resource?: Resource;
}
export interface PolicyDecision {
    (req: PermissionRequest): Decision;
}
