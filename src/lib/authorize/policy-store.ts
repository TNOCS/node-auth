import * as lokijs from 'lokijs';
import { Rule } from '../models/rule';
import { Subject } from '../models/subject';
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
  name: string;
  /** Return all policy sets */
  getPolicySets(): {
    name: string;
    combinator: DecisionCombinator;
  }[];
  /** Return one policy set by name */
  getPolicySet(name: string): PolicySetCollection;
  /** Return all policy rules */
  getPolicyRules(policyName: string, policySetName?: string): Rule[];
  /** Returns a function that can be used to retreive relevant rules for the current context. */
  getRuleResolver(policyName: string, policySetName?: string): (permissionRequest: PermissionRequest) => Rule[];
  /** Returns a function that can be used to retreive a subject's privileges with respect to a certain context. Request action is ignored. */
  getPrivilegesResolver(policyName: string, policySetName?: string): (permissionRequest: PermissionRequest) => Action;
  /** Get an authenticated user's privileges */
  getPrivileges(subject: Subject): Rule[];
  /** Return a policy editor,which allows you to add, update and delete rules */
  getPolicyEditor(policyName: string, policySetName?: string): (change: 'add' | 'update' | 'delete', rule: Rule) => Rule;
  /** Save the database */
  save(callback: (err: Error) => void);
}

function sanatize(name: string) {
  return name.replace(/ /g, '_');
}

function createPolicyName(policySetName: string, policyName: string) {
  return policySetName ? sanatize(`${policySetName}___${policyName}`) : policyName;
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
 * Match two arrays: each value in required should be present in the actual array.
 *
 * @param {(string[] | number[])} required
 * @param {(string[] | number[])} actual
 * @return {boolean}
 */
function matchArrays(required: any[], actual: any[]) {
  let isMatch = false;
  required.some(r => {
    isMatch = actual.indexOf(r) >= 0;
    return !isMatch;
  });
  return isMatch;
}

/**
 * Match properties, i.e. check for a strict equivalence of strings and numbers, or arrays of strings and numbers.
 *
 * @param {(string | number | string[] | number[])} ruleProp
 * @param {(string | number | string[] | number[])} reqProp
 * @returns
 */
function matchProperties(ruleProp: boolean | string | number | string[] | number[], reqProp: boolean | string | number | string[] | number[]) {
  if (ruleProp instanceof Array) {
    // ruleProp is an array
    if (reqProp instanceof Array) {
      // they are both arrays
      if (reqProp.length > 1) {
        // You ask for more than is possible with this rule
        return false;
      } else {
        return matchArrays(ruleProp, reqProp);
      }
    } else {
      // in case the ruleProp only has one element, there might still be a match. Otherwise, fails.
      return matchArrays(ruleProp, [reqProp]);
    }
  } else {
    // ruleProp is a single value
    if (reqProp instanceof Array) {
      if (reqProp.length > 1) {
        // You ask for more than is possible with this rule
        return false;
      } else {
        // Both are single values
        return ruleProp === reqProp[0];
      }
    } else {
      // reqProp is also a single value
      return ruleProp === reqProp;
    }
  }
}
// if (ruleProp instanceof Array && reqProp instanceof Array) {
//   return matchArrays(ruleProp, reqProp);
// } else {
//   return ruleProp === reqProp;
// }
// }

/**
 * Checks if the rule is relevant with respect to the current request.
 *
 * - When the request asks for more privileges than allowed, return false.
 * - When the request does not contain the required properties, return false.
 * - Otherwise, return true
 *
 * OPEN QUESTIONS
 * - When there are multiple rules that match, each giving the subject different privileges, do we still return the first? E.g. when a subject has multiple roles. Currently, this is the case.
 * - Can we replace the rule in the DB with a function that does the same?
 * @param {Rule} rule
 * @param {PermissionRequest} req
 * @returns {boolean}
 */
function isRuleRelevant(rule: Rule, req: PermissionRequest): boolean {
  if (rule.action) {
    if (!req.action || !((req.action & rule.action) === req.action)) { return false; }
  }
  if (rule.subject) {
    if (!req.subject) { return false; }
    for (const key in rule.subject) {
      if (!matchProperties(rule.subject[key], req.subject[key])) { return false; };
    }
  }
  if (rule.resource) {
    if (!req.resource) { return false; }
    for (const key in rule.resource) {
      if (!matchProperties(rule.resource[key], req.resource[key])) { return false; };
    }
  }
  return true;
}


/**
 * Checks if the rule is relevant for a certain subject.
 *
 * @param {Rule} rule
 * @param {PermissionRequest} req
 * @returns {boolean}
 */
function isSubjectRelevantForRule(rule: Rule, req: PermissionRequest): boolean {
  if (!rule.subject || !req.subject) { return false; }
  for (const key in rule.subject) {
    if (!matchProperties(rule.subject[key], req.subject[key])) { return false; };
  }
  return true;
}

export function initPolicyStore(name = 'policies', policySets?: PolicySet[]): PolicyStore {
  const db = new lokijs(name);
  if (policySets) {
    loadPolicySets(db, policySets);
  }
  const psCollection = db.getCollection<PolicySetCollection>('policy-sets');
  return {
    name: name,
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
    getPolicyRules(policyName: string, policySetName?: string) {
      return db.getCollection<Rule>(createPolicyName(policySetName, policyName)).find();
    },
    getRuleResolver(policyName: string, policySetName?: string) {
      const ruleCollection = db.getCollection<Rule>(createPolicyName(policySetName, policyName));
      if (!ruleCollection) { return null; }
      return (req: PermissionRequest) => {
        return ruleCollection
          .chain()
          .where(r => isRuleRelevant(r, req))
          .data();
      };
    },
    getPrivilegesResolver(policySetName: string) {
      const policySet = psCollection.findOne({ name: policySetName });
      return (req: PermissionRequest) => {
        let privileges: Action = Action.None;
        policySet.policies.some(p => {
          const ruleCollection = db.getCollection<Rule>(p.name);
          privileges = ruleCollection
            .chain()
            .where(r => isRuleRelevant(r, { subject: req.subject, resource: req.resource, action: r.action })) // NOTE: We reset the req.action to the rule's action so we don't filter them out.
            .data()
            .reduce((old, cur) => { return old | cur.action; }, privileges);
          return (privileges & Action.All) === Action.All;
        });
        return privileges;
      };
    },
    getPrivileges(subject: Subject): Rule[] {
      const rules: Rule[] = [];
      psCollection.find().forEach(ps => {
        ps.policies.forEach(p => {
          const ruleCollection = db.getCollection<Rule>(p.name);
          ruleCollection
            .chain()
            .where(r => isSubjectRelevantForRule(r, { subject: subject }))
            .data()
            .forEach(r => rules.push(r));
        });
      });
      return rules;
    },
    getPolicyEditor(policyName: string, policySetName?: string) {
      const ruleCollection = db.getCollection<Rule>(createPolicyName(policySetName, policyName));
      if (ruleCollection === null) { throw new Error(`Cannot get rules for policy ${policyName}!`); }
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
