import { Request, Response } from 'express';
import { INodeAuthOptions } from '../models/options';
export declare function init(options: INodeAuthOptions): void;
export declare function getPrivileges(req: Request, res: Response): void;
export declare function createPrivileges(req: Request, res: Response): void;
