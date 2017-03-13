/// <reference types="express" />
import * as express from 'express';
import { INodeAuthOptions } from './models/options';
import { PolicyEnforcementPoint } from '../lib/authorize/pep';
export interface NodeAuth {
    (req: express.Request, res: express.Response, next: express.NextFunction): void;
    pep?: PolicyEnforcementPoint;
}
export declare function nodeAuth(app: express.Application, options: INodeAuthOptions): NodeAuth;
