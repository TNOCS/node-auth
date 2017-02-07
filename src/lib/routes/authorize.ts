import { Request, Response } from 'express';
import { Subject } from '../models/subject';
import { PolicyStore } from '../authorize/policy-store';
import { PolicyDecisionPoint, initPDP } from '../authorize/pdp';
import { INodeAuthOptions } from '../models/options';
import { PrivilegeRequest } from '../models/rule';
import { Action } from '../models/action';
import { ResponseMessage } from '../models/response-message';

let policyStore: PolicyStore;
let pdp: PolicyDecisionPoint;

function checkPermission(subject: Subject, newPrivilege: PrivilegeRequest, callback: (message: ResponseMessage) => void) {
  const pr = pdp.getPolicyResolver(newPrivilege.policySet);
  if (!pr) { callback({ success: false, message: 'Insufficient rights' }); }
  const permit = pr({ subject: subject, action: Action.Manage, resource: newPrivilege.resource });
  callback(permit ? { success: true } : { success: false, message: 'Insufficient rights' });
}

function getPolicyEditor(newPrivilege: PrivilegeRequest) {
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

function createPrivilege(newPrivilege: PrivilegeRequest) {
  const policyEditor = getPolicyEditor(newPrivilege);
  if (!policyEditor) { return false; }
  return policyEditor('add', newPrivilege) ? true : false;
}

/**
 * EXPORTED FUNCTIONS
 */

export function init(options: INodeAuthOptions) {
  if (!options.policyStore) { throw new Error('No PolicyStore defined! In case you do not turn of options.authorizations, you need to supply a policy store.'); }
  policyStore = options.policyStore;
  pdp = initPDP(options.policyStore);
}

export function getPrivileges(req: Request, res: Response) {
  const user: Subject = req['user'];

  if (!user) {
    res.status(HTTPStatusCodes.FORBIDDEN).json({ success: false, message: 'Service only available for authenticated users.' });
  } else {
    res.json({ success: true, message: policyStore.getPrivileges(user) });
  }
}

export function createPrivileges(req: Request, res: Response) {
  const subject: Subject = req['user'];
  const newPrivilege: PrivilegeRequest = req['body'];
  if (!subject) {
    res.status(HTTPStatusCodes.FORBIDDEN).json({ success: false, message: 'Service only available for authenticated users.' });
  } else if (!newPrivilege || !newPrivilege.policySet || !(newPrivilege.subject || newPrivilege.action || newPrivilege.resource)) {
    res.status(HTTPStatusCodes.FORBIDDEN).json({ success: false, message: 'Unknown body, expected { subject, action, resource } message.' });
  } else {
    checkPermission(subject, newPrivilege, (msg) => {
      if (msg.success && createPrivilege(newPrivilege)) {
        res.json(msg);
      } else {
        res.status(HTTPStatusCodes.UNAUTHORIZED).json(msg);
      }
    });
  }
}

