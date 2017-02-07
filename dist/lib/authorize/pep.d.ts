import { Request, Response, NextFunction } from 'express';
import { PolicyStore } from '../authorize/policy-store';
import { BaseRule } from '../models/rule';
import { PermissionRequest } from '../models/decision';
export interface PolicyEnforcementPoint {
    getPolicyEnforcer(policySetName: string, extraRequestAttributes?: BaseRule, generatePermissionRequest?: (req: Request) => PermissionRequest): (req: Request, res: Response, next: NextFunction) => void;
}
export declare function initPEP(policyStore: PolicyStore): PolicyEnforcementPoint;
