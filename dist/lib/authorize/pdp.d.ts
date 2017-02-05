import { PolicyStore } from '../../lib/authorize/policy-store';
import { PermissionRequest } from '../models/decision';
export interface PolicyDecisionPoint {
    getPolicyResolver(policySetName: string): (req: PermissionRequest) => boolean;
}
export declare function initPDP(policyStore: PolicyStore): PolicyDecisionPoint;
