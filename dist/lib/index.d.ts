import { Application, Request, Response, NextFunction } from "express";
import { INodeAuthOptions } from "./models/options";
export declare function nodeAuth(app: Application, options: INodeAuthOptions): (req: Request, res: Response, next: NextFunction) => void;
