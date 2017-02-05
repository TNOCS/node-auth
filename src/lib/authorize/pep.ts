import { Request, Response, NextFunction } from 'express';
import { PolicyStore } from '../authorize/policy-store';
import { Action } from '../models/action';
import { PermissionRequest } from '../models/decision';
import { initPDP } from './pdp';

export interface PolicyEnforcementPoint {
  getPolicyEnforcer(policySetName: string, generatePermissionRequest?: (req: Request) => PermissionRequest): (req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Create a default PermissionRequest object, based on:
 * - subject: The request[user]
 * - action: The HTTP method used: GET --> Action.Read, etc.
 * - resource: The request.params object
 *
 * @param {Request} req
 * @returns {PermissionRequest}
 */
function defaultPermissionRequest(req: Request) {
  let action: Action;
  switch (req.method.toLowerCase()) {
    case 'get':
      action = Action.Read;
      break;
    case 'put':
      action = Action.Update;
      break;
    case 'post':
      action = Action.Create;
      break;
    case 'delete':
      action = Action.Delete;
      break;
    default:
      action = Action.None;
      break;
  }
  return <PermissionRequest> { subject: req['user'], action: action, resource: req.params };
}

export function initPEP(policyStore: PolicyStore): PolicyEnforcementPoint {
  const pdp = initPDP(policyStore);
  return {
    getPolicyEnforcer(policySetName: string, generatePermissionRequest?: (req: Request) => PermissionRequest) {
      const policyResolver = pdp.getPolicyResolver(policySetName);
      if (generatePermissionRequest) {
        return (req, res, next) => {
          const permissionRequest = generatePermissionRequest(req);
          return policyResolver(permissionRequest) ? next() : res.status(HTTPStatusCodes.FORBIDDEN).json({ success: false, message: 'Access denied' });
        };
      } else {
        return (req, res, next) => {
          const permissionRequest = req['req'] || defaultPermissionRequest(req);
          return policyResolver(permissionRequest) ? next() : res.status(HTTPStatusCodes.FORBIDDEN).json({ success: false, message: 'Access denied' });
        };
      }
    }
  };
}
