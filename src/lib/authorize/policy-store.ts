import * as lokijs from 'lokijs';
import { Subject } from '../models/subject';
import { Rule } from '../models/rule';
import { PermissionRequest } from '../models/decision';
import { PolicySet, Policy, PolicyBase } from '../models/policy';
import { DecisionCombinator } from '../models/decision-combinator';
import { Action } from '../models/action';
import { Resource } from '../models/resource';

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
  /** Return all policy rules relevant for the current query */
  getRelevantPolicyRules(policy: string, query: { subject?: Subject, action?: Action, resource?: Resource }): Rule[];
  /** Add a new rule to a policy */
  addPolicyRule(policyName: string, rule: Rule);
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
 * Get all the unique keys that are used to specify the rules.
 *
 * @param {PolicySetSummary} policySummary
 * @param {Rule} rule
 */
function updateUsedKeys(usedKeys: UsedKeys, rule: Rule) {
  rule.subject && Object.keys(rule.subject).forEach(k => {
    if (usedKeys.subjectKeys.indexOf(k) < 0) { usedKeys.subjectKeys.push(k); }
  });
  if (rule.action) { usedKeys.action |= rule.action; }
  rule.resource && Object.keys(rule.resource).forEach(k => {
    if (usedKeys.resourceKeys.indexOf(k) < 0) { usedKeys.resourceKeys.push(k); }
  });
}

/**
 * Create a summary for each policy of all the used subject and resource keys.
 *
 * @param {Loki} db
 */
function createSummary(db: Loki) {
  const summary = db.addCollection<UsedKeys>('summaries');
  const psCollection = db.getCollection<PolicySetCollection>('policy-sets').find();
  psCollection.forEach(ps => {
    ps.policies.forEach(p => {
      const rules = db.getCollection<Rule>(p.name).find();
      const usedKeys = <UsedKeys>{
        policyName: p.name,
        subjectKeys: [],
        action: Action.none,
        resourceKeys: []
      };
      rules.forEach(r => {
        updateUsedKeys(usedKeys, r);
      });
      summary.insert(usedKeys);
    });
  });
}

export function init(name = 'policies', policySets?: PolicySet[]): PolicyStore {
  const db = new lokijs(name);
  if (policySets) {
    loadPolicySets(db, policySets);
    createSummary(db);
  }
  const psCollection = db.getCollection<PolicySetCollection>('policy-sets');
  const usedKeyCollection = db.getCollection<UsedKeys>('summaries');
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
    getRelevantPolicyRules(policyName: string, req: PermissionRequest) {
      const ruleCollection = db.getCollection<Rule>(policyName);
      const usedKeys = usedKeyCollection.findOne({ policyName: policyName });
      const relevantRules: Rule[] = [];
      req.subject && usedKeys.subjectKeys.forEach(k => {
        if (req.subject.hasOwnProperty(k)) {
          ruleCollection
            .chain()
            .where(r => { return r.subject[k] === req.subject[k]; })
            .data()
            .forEach(r => { relevantRules.push(r); });
        }
      });
      req.resource && usedKeys.resourceKeys.forEach(k => {
        if (req.resource.hasOwnProperty(k)) {
          ruleCollection
            .chain()
            .where(r => { return r.resource[k] === req.resource[k]; })
            .data()
            .forEach(r => { relevantRules.push(r); });
        }
      });
      return relevantRules;
    },
    addPolicyRule(policyName: string, rule: Rule) {
      const ruleCollection = db.getCollection<Rule>(policyName);
      const usedKeys = usedKeyCollection.findOne({ policyName: policyName });
      updateUsedKeys(usedKeys, rule);
      usedKeyCollection.update(usedKeys);
      ruleCollection.insert(rule);
    },
    save(done) {
      db.save(done);
    }
  };
}