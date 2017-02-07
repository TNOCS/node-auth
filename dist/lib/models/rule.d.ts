import { Resource } from './resource';
import { Subject } from './subject';
import { Action } from './action';
import { Decision } from './decision';
export interface BaseRule {
    description?: string;
    subject?: Subject;
    action?: Action;
    resource?: Resource;
}
export interface Rule extends BaseRule {
    decision: Decision;
}
export interface PrivilegeRequest extends Rule {
    policySet: string;
    policy?: string | number;
}
