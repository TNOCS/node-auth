import * as lokijs from 'lokijs';
import { Rule } from '../models/rule';
import { PermissionRequest } from '../models/decision';
import { PolicySet, Policy, PolicyBase } from '../models/policy';
import { DecisionCombinator } from '../models/decision-combinator';
import { Action } from '../models/action';

/**
 * A summary of the properties used for subject, action and resource,
 * so we can more quickly filter the relevant rules.
 *
 * @type {{
 *       subject: string[];
 *       action: Action;
 *       resource: string[];
 *     }}
 */
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
  /** Return all policy sets */
  getPolicySets(): {
    name: string;
    combinator: DecisionCombinator;
  }[];
  /** Return one policy set by name */
  getPolicySet(name: string): PolicySetCollection;
  /** Return all policy rules */
  getPolicyRules(policyName: string): Rule[];
  /** Return rule resolver for a certain policy. It returns a function that can be used to retreive relevant rules for the current context. */
  getRuleResolver(policyName: string): (permissionRequest: PermissionRequest) => Rule[];
  /** Return a policy editor,which allows you to add, update and delete rules */
  getPolicyEditor(policyName: string): (change: 'add' | 'update' | 'delete', rule: Rule) => Rule;
  /** Save the database */
  save(callback: (err: Error) => void);
}

function sanatize(name: string) {
  return name.replace(/ /g, '_');
}

function createPolicyName(policySetName: string, policyName: string) {
  return sanatize(`${policySetName}___${policyName}`);
}

/**
 * Load a policy into a new collection.
 *
 * @param {Loki} db
 * @param {string} policyFullName
 * @param {Policy} p
 * @returns
 */
function loadPolicy(db: Loki, policyFullName: string, p: Policy) {
  const ruleCollection = db.addCollection<Rule>(policyFullName);
  p.rules.forEach(rule => {
    ruleCollection.insert(rule);
  });
}

/**
 * Load a policy set.
 *
 * @param {Loki} db
 * @param {LokiCollection<PolicySetCollection>} psCol
 * @param {PolicySet} ps
 */
function loadPolicySet(db: Loki, psCollection: LokiCollection<PolicySetCollection>, ps: PolicySet) {
  const policySummaries: PolicyBase[] = [];
  ps.policies.forEach(p => {
    const policyFullName = createPolicyName(ps.name, p.name);
    loadPolicy(db, policyFullName, p);
    policySummaries.push({ name: policyFullName, desc: p.desc, combinator: p.combinator });
  });
  psCollection.insert({ name: ps.name, desc: ps.desc, combinator: ps.combinator, policies: policySummaries });
}

/**
 * Create a collection of policy-sets, psCol.
 * Each policySet contains one or more policies, and a decision combinator:
 * Create a collection for each policy, and add all rules to the policy collection.
 *
 * @param {Loki} db
 * @param {PolicySet[]} policySets
 */
function loadPolicySets(db: Loki, policySets: PolicySet[]) {
  const psCol = db.addCollection<PolicySetCollection>('policy-sets');
  policySets.forEach(ps => {
    loadPolicySet(db, psCol, ps);
  });
}

/**
 * Checks if the rule is relevant with respect to the current request.
 *
 * @param {Rule} rule
 * @param {PermissionRequest} req
 * @returns {boolean}
 */
function isRuleRelevant(rule: Rule, req: PermissionRequest): boolean {
  if (req.action && rule.action && !(req.action & rule.action)) { return false; } // action does not match
  if (rule.subject) {
    if (!req.subject) { return false; }
    for (const key in rule.subject) {
      if (!rule.subject.hasOwnProperty(key)) { continue; }
      if (!req.subject.hasOwnProperty(key) || rule.subject[key] !== req.subject[key]) { return false; }
    }
  }
  if (rule.resource) {
    if (!req.resource) { return false; }
    for (const key in rule.resource) {
      if (!rule.resource.hasOwnProperty(key)) { continue; }
      if (!req.resource.hasOwnProperty(key) || rule.resource[key] !== req.resource[key]) { return false; }
    }
  }
  return true;
}

export function init(name = 'policies', policySets?: PolicySet[]): PolicyStore {
  const db = new lokijs(name);
  if (policySets) {
    loadPolicySets(db, policySets);
  }
  const psCollection = db.getCollection<PolicySetCollection>('policy-sets');
  return {
    getPolicySets() {
      const policySets = psCollection.find();
      return policySets.map(ps => {
        return {
          name: ps.name,
          combinator: ps.combinator
        };
      });
    },
    getPolicySet(name: string) {
      return psCollection.findOne({ name: name });
    },
    getPolicyRules(policyName: string) {
      return db.getCollection<Rule>(policyName).find();
    },
    getRuleResolver(policyName: string) {
      const ruleCollection = db.getCollection<Rule>(policyName);
      return (req: PermissionRequest) => {
        return ruleCollection
          .chain()
          .where(r => isRuleRelevant(r, req))
          .data();
      };
    },
    getPolicyEditor(policyName: string) {
      const ruleCollection = db.getCollection<Rule>(policyName);
      return (change: 'add' | 'update' | 'delete', rule: Rule) => {
        switch (change) {
          case 'add':
            return ruleCollection.insert(rule);
          case 'update':
            return ruleCollection.update(rule);
          case 'delete':
            return ruleCollection.remove(rule);
          default:
            throw new Error('Unknown change.');
        }
      };
    },
    save(done) {
      db.save(done);
    }
  };
}
