import { Rule } from '../models/rule';
import { Subject } from '../models/subject';
import { PermissionRequest } from '../models/decision';
import { PolicySet, PolicyBase } from '../models/policy';
import { DecisionCombinator } from '../models/decision-combinator';
import { Action } from '../models/action';
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
    getRuleResolver(policyName: string): (permissionRequest: PermissionRequest) => Rule[];
    getPrivilegesResolver(policyName: string): (permissionRequest: PermissionRequest) => Action;
    getPrivileges(subject: Subject): Rule[];
    getPolicyEditor(policyName: string): (change: 'add' | 'update' | 'delete', rule: Rule) => Rule;
    save(callback: (err: Error) => void): any;
}
export declare function initPolicyStore(name?: string, policySets?: PolicySet[]): PolicyStore;
