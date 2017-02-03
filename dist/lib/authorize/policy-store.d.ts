import { Subject } from '../models/subject';
import { Rule } from '../models/rule';
import { PolicySet, PolicyBase } from '../models/policy';
import { DecisionCombinator } from '../models/decision-combinator';
import { Action } from '../models/action';
import { Resource } from '../models/resource';
export interface UsedKeys {
    policyName: string;
    subjectKeys: string[];
    action: Action;
    resourceKeys: string[];
}
export interface PolicySetCollection extends PolicyBase {
    policies: PolicyBase[];
}
export interface PolicyStore {
    getPolicySets(): {
        name: string;
        combinator: DecisionCombinator;
    }[];
    getPolicySet(name: string): PolicySetCollection;
    getPolicyRules(policyName: string): Rule[];
    getRelevantPolicyRules(policy: string, query: {
        subject?: Subject;
        action?: Action;
        resource?: Resource;
    }): Rule[];
    addPolicyRule(policyName: string, rule: Rule): any;
    save(callback: (err: Error) => void): any;
}
export declare function init(name?: string, policySets?: PolicySet[]): PolicyStore;
