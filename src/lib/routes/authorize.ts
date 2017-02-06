import { Request, Response } from 'express';
import { IUser } from '../models/user';
// import { PolicyStore } from '../authorize/policy-store';
import { INodeAuthOptions } from '../models/options';
// import { PolicyStore } from '../authorize/pep';

// let _policyStore: PolicyStore;


export function init(options: INodeAuthOptions) {
  // _policyStore = policyStore;
}

export function authorize(req: Request, res: Response) {
  const user: IUser = req['user'];

  if (!user) {
    res.status(HTTPStatusCodes.FORBIDDEN).json({ success: false, message: 'Service only available for authenticated users.' });
  } else {
    res.json({ success: true });
  }
}
