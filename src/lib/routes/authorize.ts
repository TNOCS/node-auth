import { Request, Response } from 'express';
import { Subject } from '../models/subject';
import { PolicyStore } from '../authorize/policy-store';
import { INodeAuthOptions } from '../models/options';

let _policyStore: PolicyStore;

export function init(options: INodeAuthOptions) {
  if (!options.policyStore) { throw new Error('No PolicyStore defined! In case you do not turn of options.authorizations, you need to supply a policy store.'); }
  _policyStore = options.policyStore;
  // _policyStore.getPrivileges()
}

export function authorize(req: Request, res: Response) {
  const user: Subject = req['user'];

  if (!user) {
    res.status(HTTPStatusCodes.FORBIDDEN).json({ success: false, message: 'Service only available for authenticated users.' });
  } else {
    res.json({ success: true, message: _policyStore.getPrivileges(user) });
  }
}
