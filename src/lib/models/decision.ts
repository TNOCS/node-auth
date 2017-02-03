import { Subject } from './subject';
import { Action } from './action';
import { Resource } from './resource';

export enum Decision {
  permit,
  deny
}

export interface PermissionRequest {
  subject?: Subject;
  action?: Action;
  resource?: Resource;
}

export interface PolicyDecision {
  (req: PermissionRequest): Decision;
  // get the rights of a subject
  // get the rules associated with a resource.
}
