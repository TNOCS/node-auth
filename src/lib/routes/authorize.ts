import { UNAUTHORIZED, FORBIDDEN } from 'http-status-codes';
import { Request, Response } from 'express';
import { Subject } from '../models/subject';
import { IPolicyStore } from '../authorize/policy-store';
import { PolicyDecisionPoint, initPDP } from '../authorize/pdp';
import { INodeAuthOptions } from '../models/options';
import { IPrivilegeRequest } from '../models/rule';
import { CRUD } from '../models/crud';
import { Action } from '../models/action';
import { ResponseMessage } from '../models/response-message';

export let policyStore: IPolicyStore;
let pdp: PolicyDecisionPoint;

function checkPermission(subject: Subject, newPrivilege: IPrivilegeRequest, callback: (message: ResponseMessage) => void) {
  const pr = pdp.getPolicyResolver(newPrivilege.policySet);
  if (!pr) { callback({ success: false, message: 'Insufficient rights' }); }
  const permit = pr({ subject: subject, action: Action.Manage, resource: newPrivilege.resource });
  callback(permit ? { success: true } : { success: false, message: 'Insufficient rights' });
}

function getPolicyEditor(newPrivilege: IPrivilegeRequest) {
  const policy = newPrivilege.policy || -1;
  if (typeof policy === 'number') {
    const policySet = policyStore.getPolicySet(newPrivilege.policySet);
    if (policy >= policySet.policies.length) { return null; }
    // When the requested policy is -1, use the last one.
    const policyName = policySet.policies[policy < 0 ? policySet.policies.length - 1 : policy].name;
    return policyStore.getPolicyEditor(policyName);
  } else {
    return policyStore.getPolicyEditor(policy);
  }
}

function createPrivilege(newPrivilege: IPrivilegeRequest) {
  const policyEditor = getPolicyEditor(newPrivilege);
  if (!policyEditor) { return null; }
  return policyEditor('add', newPrivilege);
}

function updatePrivilege(newPrivilege: IPrivilegeRequest) {
  const policyEditor = getPolicyEditor(newPrivilege);
  if (!policyEditor) { return null; }
  return policyEditor('update', newPrivilege);
}

function deletePrivilege(newPrivilege: IPrivilegeRequest) {
  const policyEditor = getPolicyEditor(newPrivilege);
  if (!policyEditor) { return null; }
  return policyEditor('delete', newPrivilege);
}

function getPrivilegeRequest(req: Request, res: Response) {
  const newPrivilege: IPrivilegeRequest = req['body'];
  newPrivilege.policySet = newPrivilege.policySet || policyStore.getDefaultPolicySet().name;
  if (!newPrivilege || !(newPrivilege.subject || newPrivilege.action || newPrivilege.resource)) {
    res.status(FORBIDDEN).json({ success: false, message: 'Unknown body, expected { subject, action, resource } message.' });
    return null;
  }
  return newPrivilege;
}

/**
 * EXPORTED FUNCTIONS
 */

export function init(options: INodeAuthOptions) {
  if (!options.policyStore) { throw new Error('No PolicyStore defined! In case you do not turn of options.authorizations, you need to supply a policy store.'); }
  policyStore = options.policyStore;
  pdp = initPDP(policyStore);
}

export function getPrivileges(req: Request, res: Response) {
  const user: Subject = req['user'];
  if (!user) {
    res.status(FORBIDDEN).json({ success: false, message: 'Service only available for authenticated users.' });
  } else {
    res.json({ success: true, message: policyStore.getPrivileges(user) });
  }
}

function crudPrivileges(change: CRUD, req: Request, res: Response, handler: (pr: IPrivilegeRequest) => (msg: ResponseMessage) => void) {
  const subject: Subject = req['user'];
  if (!subject) { return; }
  const newPrivilege = getPrivilegeRequest(req, res);
  if (!newPrivilege) { return; }
  if (change !== 'create' && !newPrivilege.hasOwnProperty('meta')) {
    res.status(UNAUTHORIZED).json({ success: false, message: 'Metadata is missing, original rule should be returned' });
    return;
  }
  checkPermission(subject, newPrivilege, handler(newPrivilege));
}

export function createPrivileges(req: Request, res: Response) {
  const handler = (newPrivilegeReq: IPrivilegeRequest) => {
    return (msg: ResponseMessage) => {
      if (msg.success) {
        const ruleStatus = createPrivilege(newPrivilegeReq);
        if (ruleStatus) {
          res
            .status(ruleStatus.status) // rule === newPrivilegeReq ? NOT_MODIFIED :
            .json({ success: true, message: ruleStatus.rule });
        } else {
          res.status(UNAUTHORIZED).json(msg);
        }
      } else {
        res.status(UNAUTHORIZED).json(msg);
      }
    };
  };
  crudPrivileges('create', req, res, handler);
}

export function updatePrivileges(req: Request, res: Response) {
  const handler = (newPrivilege: IPrivilegeRequest) => {
    return (msg: ResponseMessage) => {
      if (msg.success) {
        const ruleStatus = updatePrivilege(newPrivilege);
        if (ruleStatus) {
          res.json({ success: true, message: ruleStatus.rule });
        } else {
          res.status(UNAUTHORIZED).json(msg);
        }
      } else {
        res.status(UNAUTHORIZED).json(msg);
      }
    };
  };
  crudPrivileges('update', req, res, handler);
}

export function deletePrivileges(req: Request, res: Response) {
  const handler = (newPrivilege: IPrivilegeRequest) => {
    return (msg: ResponseMessage) => {
      if (msg.success) {
        const ruleStatus = deletePrivilege(newPrivilege);
        if (ruleStatus) {
          res.status(ruleStatus.status).end();
        } else {
          res.status(UNAUTHORIZED).json(msg);
        }
      } else {
        res.status(UNAUTHORIZED).json(msg);
      }
    };
  };
  crudPrivileges('delete', req, res, handler);
}
