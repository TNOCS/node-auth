import { FORBIDDEN } from 'http-status-codes';
import { Request, Response, NextFunction } from 'express';
import { PolicyStore } from '../authorize/policy-store';
import { Action } from '../models/action';
import { BaseRule } from '../models/rule';
import { PermissionRequest } from '../models/decision';
import { initPDP } from './pdp';

export interface PolicyEnforcementPoint {
  getPolicyEnforcer(policySetName: string, extraRequestAttributes?: BaseRule, generatePermissionRequest?: (req: Request) => PermissionRequest): (req: Request, res: Response, next: NextFunction) => void;
}

function addExtraAttributesToRequest(extraAttributes: BaseRule, req: PermissionRequest) {
  if (!extraAttributes) { return; }
  const subject = extraAttributes.subject;
  if (subject) {
    if (!req.subject) { req.subject = {}; }
    for (let key in subject) {
      if (!subject.hasOwnProperty(key)) { continue; }
      req.subject[key] = subject[key];
    }
  }
  const resource = extraAttributes.resource;
  if (resource) {
    if (!req.resource) { req.resource = {}; }
    for (let key in resource) {
      if (!resource.hasOwnProperty(key)) { continue; }
      req.resource[key] = resource[key];
    }
  }
  const action = extraAttributes.action;
  if (action) {
    req.action |= action;
  }
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
  }
  return <PermissionRequest> { subject: req['user'], action: action, resource: req.params };
}

export function initPEP(policyStore: PolicyStore): PolicyEnforcementPoint {
  const pdp = initPDP(policyStore);
  return {
    getPolicyEnforcer(policySetName: string, extraRequestAttributes?: BaseRule, generatePermissionRequest?: (req: Request) => PermissionRequest) {
      const policyResolver = pdp.getPolicyResolver(policySetName);
      if (policyResolver === null) { throw new Error(`Policy ${policySetName} does not exist.`); }
      if (generatePermissionRequest) {
        return (req, res, next) => {
          const permissionRequest = generatePermissionRequest(req);
          return policyResolver(permissionRequest) ? next() : res.status(FORBIDDEN).json({ success: false, message: 'Access denied' });
        };
      } else {
        return (req, res, next) => {
          const permissionRequest = req['req'] || defaultPermissionRequest(req);
          addExtraAttributesToRequest(extraRequestAttributes, permissionRequest);
          return policyResolver(permissionRequest) ? next() : res.status(FORBIDDEN).json({ success: false, message: 'Access denied' });
        };
      }
    }
  };
}
