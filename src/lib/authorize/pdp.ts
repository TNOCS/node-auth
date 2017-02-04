// import { PolicySet } from '../models/policy';
import { Decision } from '../models/decision';
import { Rule } from '../models/rule';
import { DecisionCombinator } from '../models/decision-combinator';
import { PolicyStore } from '../../lib/authorize/policy-store';
// import { Subject } from '../models/subject';
// import { Action } from '../models/action';
// import { Resource } from '../models/resource';
import { PermissionRequest } from '../models/decision';

let _policyStore: PolicyStore;

function isPermitted(rule: Rule, req: PermissionRequest) {
  return true;
}

/**
 * Obtain all relevant rules and evaluate them based on the policy combinator.
 *
 * @export
 * @param {string} policyName
 * @param {DecisionCombinator} policyCombinator
 * @returns
 */
export function resolvePolicy(policyName: string, policyCombinator: DecisionCombinator) {
  const ruleResolver = _policyStore.getRuleResolver(policyName);
  const isFirst = policyCombinator === 'first';
  return (req: PermissionRequest) => {
    const rules = ruleResolver(req);
    let permit: boolean;
    rules.some(r => {
      permit = isPermitted(r, req);
      return isFirst ? permit : !permit;
    });
    return permit;
  };
}


export function PolicyDecisionPoint(policyStore: PolicyStore) {
  _policyStore = policyStore;
  return {
    /** A policy resolver helps you resolve permission requests. */
    getPolicyResolver(policySetName: string) {
      const ruleResolvers: { ruleResolver: (req: PermissionRequest) => Rule[], combinator: DecisionCombinator }[] = [];
      const policySet = policyStore.getPolicySet(policySetName);
      const policySetCombinator = policySet.combinator;
      policySet.policies.forEach(p => {
        const ruleResolver = _policyStore.getRuleResolver(p.name);
        ruleResolvers.push({ ruleResolver: ruleResolver, combinator: p.combinator });
      });

      switch (policySetCombinator) {
        case 'first':
          return (req: PermissionRequest) => {

            return Decision.Permit;
          };
        case 'all':
          return (req: PermissionRequest) => {
            return Decision.Permit;
          };
      }
    }
  }
}