// import { AuthRequest } from "../models/auth-request";
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
  /**
   * When we want to create a new rule, we need to specify in which policy set we want to create it
   *
   * @type {string}
   * @memberOf Privilege
   */
  policySet: string;
  /**
   * Optionally, you can also specify to which policy it must be added.
   * By default, this will be the last policy, so you can separate the primary (e.g. role based) policies from the more dynamic one.
   *
   * @type {string | number}
   * @memberOf PrivilegeRequest
   */
  policy?: string | number;
}
