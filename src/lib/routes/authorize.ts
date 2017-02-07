import { Request, Response } from 'express';
import { Subject } from '../models/subject';
import { PolicyStore } from '../authorize/policy-store';
import { PolicyDecisionPoint, initPDP } from '../authorize/pdp';
import { INodeAuthOptions } from '../models/options';
import { PrivilegeRequest } from '../models/rule';
import { CRUD } from '../models/crud';
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
  if (!policyEditor) { return null; }
  return policyEditor('add', newPrivilege);
}

function updatePrivilege(newPrivilege: PrivilegeRequest) {
  const policyEditor = getPolicyEditor(newPrivilege);
  if (!policyEditor) { return null; }
  return policyEditor('update', newPrivilege);
}

function deletePrivilege(newPrivilege: PrivilegeRequest) {
  const policyEditor = getPolicyEditor(newPrivilege);
  if (!policyEditor) { return null; }
  return policyEditor('delete', newPrivilege);
}

function getSubject(req: Request, res: Response) {
  const subject: Subject = req['user'];
  if (!subject) {
    res.status(HTTPStatusCodes.FORBIDDEN).json({ success: false, message: 'Service only available for authenticated users.' });
    return null;
  }
  return subject;
}

function getPrivilegeRequest(req: Request, res: Response) {
  const newPrivilege: PrivilegeRequest = req['body'];
  if (!newPrivilege || !newPrivilege.policySet || !(newPrivilege.subject || newPrivilege.action || newPrivilege.resource)) {
    res.status(HTTPStatusCodes.FORBIDDEN).json({ success: false, message: 'Unknown body, expected { subject, action, resource } message.' });
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

function crudPrivileges(change: CRUD, req: Request, res: Response, handler: (pr: PrivilegeRequest) => (msg: ResponseMessage) => void) {
  const subject = getSubject(req, res);
  if (!subject) { return; }
  const newPrivilege = getPrivilegeRequest(req, res);
  if (!newPrivilege) { return; }
  if (change !== 'create' && !newPrivilege.hasOwnProperty('meta')) {
    res.status(HTTPStatusCodes.UNAUTHORIZED).json({ success: false, message: 'Metadata is missing, original rule should be returned' });
    return;
  }
  checkPermission(subject, newPrivilege, handler(newPrivilege));
}

export function createPrivileges(req: Request, res: Response) {
  const handler = (newPrivilege: PrivilegeRequest) => {
    return (msg: ResponseMessage) => {
      if (msg.success) {
        const rule = createPrivilege(newPrivilege);
        if (rule) {
          res.status(HTTPStatusCodes.CREATED).json({ success: true, message: rule });
        } else {
          res.status(HTTPStatusCodes.UNAUTHORIZED).json(msg);
        }
      } else {
        res.status(HTTPStatusCodes.UNAUTHORIZED).json(msg);
      }
    };
  };
  crudPrivileges('create', req, res, handler);
}

export function updatePrivileges(req: Request, res: Response) {
  const handler = (newPrivilege: PrivilegeRequest) => {
    return (msg: ResponseMessage) => {
      if (msg.success) {
        const rule = updatePrivilege(newPrivilege);
        if (rule) {
          res.json({ success: true, message: rule });
        } else {
          res.status(HTTPStatusCodes.UNAUTHORIZED).json(msg);
        }
      } else {
        res.status(HTTPStatusCodes.UNAUTHORIZED).json(msg);
      }
    };
  };
  crudPrivileges('update', req, res, handler);
}

export function deletePrivileges(req: Request, res: Response) {
  const handler = (newPrivilege: PrivilegeRequest) => {
    return (msg: ResponseMessage) => {
      if (msg.success) {
        const rule = deletePrivilege(newPrivilege);
        if (!rule) {
          res.status(HTTPStatusCodes.NO_CONTENT).end();
        } else {
          res.status(HTTPStatusCodes.UNAUTHORIZED).json(msg);
        }
      } else {
        res.status(HTTPStatusCodes.UNAUTHORIZED).json(msg);
      }
    };
  };
  crudPrivileges('delete', req, res, handler);
}
