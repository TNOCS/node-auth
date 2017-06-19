import { IBaseRule } from './rule';

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

export interface IPermissionRequest extends IBaseRule {}

// export interface PolicyDecision {
//   (req: PermissionRequest): Decision;
//   // get the rights of a subject
//   // get the rules associated with a resource.
// }
