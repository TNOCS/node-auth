import { Decision } from '../models/decision';
import { DecisionCombinator } from '../models/decision-combinator';
import { PolicyStore } from '../../lib/authorize/policy-store';
import { PermissionRequest } from '../models/decision';

export interface PolicyDecisionPoint {
  getPolicyResolver(policySetName: string): (req: PermissionRequest) => boolean;
}

/**
 * Obtain all relevant rules and evaluate them based on the policy combinator.
 *
 * @export
 * @param {string} policyName
 * @param {DecisionCombinator} policyCombinator
 * @returns
 */
function resolvePolicy(policyStore: PolicyStore, policyName: string, policyCombinator: DecisionCombinator) {
  const resolveRules = policyStore.getRuleResolver(policyName);
  if (!resolveRules) { return null; }
  const isFirst = policyCombinator === 'first';
  return (req: PermissionRequest) => {
    const rules = resolveRules(req);
    let permit = false;
    rules.some(r => {
      permit = r.decision === Decision.Permit;
      return isFirst ? permit : !permit;
    });
    return permit;
  };
}

/**
 * The policy decision point allows you to retrieve a policy resolver,
 * i.e. you can use the returned function to resolve the permissions for
 * a request that is protected by a particular policy set.
 *
 * @export
 * @param {PolicyStore} policyStore
 * @returns
 */
export function initPDP(policyStore: PolicyStore): PolicyDecisionPoint {
  return {
    /** A policy resolver helps you resolve permission requests. */
    getPolicyResolver(policySetName: string) {
      const policyResolvers: Array<(req: PermissionRequest) => boolean> = [];
      const policySet = policyStore.getPolicySet(policySetName);
      if (!policySet) { return null; }
      const policySetCombinator = policySet.combinator;
      policySet.policies.forEach(p => {
        const rp = resolvePolicy(policyStore, p.name, p.combinator);
        if (rp) { policyResolvers.push(rp); }
      });
      const isFirst = policySetCombinator === 'first';
      return (req: PermissionRequest) => {
        let permit: boolean;
        policyResolvers.some(policyResolver => {
          permit = policyResolver(req);
          return isFirst ? permit : !permit;
        });
        return permit;
      };
    }
  };
}