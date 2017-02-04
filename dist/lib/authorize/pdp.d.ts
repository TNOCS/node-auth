import { Decision } from '../models/decision';
import { DecisionCombinator } from '../models/decision-combinator';
import { PolicyStore } from '../../lib/authorize/policy-store';
import { PermissionRequest } from '../models/decision';
export declare function resolvePolicy(policyName: string, policyCombinator: DecisionCombinator): (req: PermissionRequest) => boolean;
export declare function PolicyDecisionPoint(policyStore: PolicyStore): {
    getPolicyResolver(policySetName: string): (req: PermissionRequest) => Decision;
};
