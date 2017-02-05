import { Subject } from './subject';
import { Action } from './action';
import { Resource } from './resource';

export enum Decision {
  /**
   * The decision is denied
   */
  Deny,
  /**
   * The decision is permitted
   */
  Permit,
  /**
   * The decision is partially permitted, e.g. when a user requests too many privileges.
   */
  PartialPermit
}

export interface PermissionRequest {
  subject?: Subject;
  action?: Action;
  resource?: Resource;
}

// export interface PolicyDecision {
//   (req: PermissionRequest): Decision;
//   // get the rights of a subject
//   // get the rules associated with a resource.
// }
