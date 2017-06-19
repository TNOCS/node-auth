import { NOT_MODIFIED, CREATED, OK, NO_CONTENT } from 'http-status-codes';
import * as lokijs from 'lokijs';
import { IRule } from '../models/rule';
import { Subject } from '../models/subject';
import { IPermissionRequest } from '../models/decision';
import { IPolicySet, IPolicy, IPolicyBase } from '../models/policy';
import { DecisionCombinator } from '../models/decision-combinator';
import { Action } from '../models/action';
import { Decision } from '../models/decision';

export interface IPolicySetCollection extends IPolicyBase {
  policies: IPolicyBase[];
}

export interface IPolicySetDescription {
  name: string;
  isDefault: boolean;
  combinator: DecisionCombinator;
}

export interface IPolicyStore {
  name: string;
  /** Return all policy sets */
  getPolicySets(): IPolicySetDescription[];
  getDefaultPolicySet(): IPolicySetDescription;
  /** Return one policy set by name */
  getPolicySet(name: string): IPolicySetCollection;
  /** Return all policy rules */
  getPolicyRules(policyName: string, policySetName?: string): IRule[];
  /** Returns a function that can be used to retreive relevant rules for the current context. */
  getRuleResolver(policyName: string, policySetName?: string): (permissionRequest: IPermissionRequest) => IRule[];
  /** Returns a function that can be used to retreive a subject's privileges with respect to a certain context. Request action is ignored. */
  getPrivilegesResolver(policyName: string, policySetName?: string): (permissionRequest: IPermissionRequest) => Action;
  /** Get an authenticated user's privileges */
  getPrivileges(subject: Subject): IRule[];
  /** Return a policy editor,which allows you to add, update and delete rules */
  getPolicyEditor(policyName: string, policySetName?: string): (change: 'add' | 'update' | 'delete', rule: IRule) => { rule: IRule, status: number };
  /** Save the database */
  save(callback: (err: Error) => void);
}

const sanatize = (name: string) => {
  return name.replace(/ /g, '_');
};

const createPolicyName = (policySetName: string, policyName: string) => {
  return policySetName ? sanatize(`${policySetName}___${policyName}`) : policyName;
};

/**
 * Load a policy into a new collection.
 *
 * @param {Loki} db
 * @param {string} policyFullName
 * @param {IPolicy} p
 * @returns
 */
const loadPolicy = (db: Loki, policyFullName: string, p: IPolicy) => {
  const ruleCollection = db.addCollection<IRule>(policyFullName);
  p.rules.forEach(rule => {
    ruleCollection.insert(rule);
  });
};

/**
 * Load a policy set.
 *
 * @param {Loki} db
 * @param {LokiCollection<IPolicySetCollection>} psCol
 * @param {IPolicySet} ps
 */
const loadPolicySet = (db: Loki, psCollection: LokiCollection<IPolicySetCollection>, ps: IPolicySet) => {
  const policySummaries: IPolicyBase[] = [];
  ps.policies.forEach(p => {
    const policyFullName = createPolicyName(ps.name, p.name);
    loadPolicy(db, policyFullName, p);
    policySummaries.push({ name: policyFullName, desc: p.desc, combinator: p.combinator, isDefault: p.isDefault });
  });
  psCollection.insert({ name: ps.name, desc: ps.desc, isDefault: ps.isDefault, combinator: ps.combinator, policies: policySummaries });
};

/**
 * Create a collection of policy-sets, psCol.
 * Each policySet contains one or more policies, and a decision combinator:
 * Create a collection for each policy, and add all rules to the policy collection.
 *
 * @param {Loki} db
 * @param {IPolicySet[]} policySets
 */
const loadPolicySets = (db: Loki, policySets: IPolicySet[]) => {
  const psCol = db.addCollection<IPolicySetCollection>('policy-sets');
  policySets.forEach(ps => {
    loadPolicySet(db, psCol, ps);
  });
};

/**
 * Match two arrays: each value in required should be present in the actual array.
 *
 * @param {(string[] | number[])} required
 * @param {(string[] | number[])} actual
 * @return {boolean}
 */
const matchArrays = (required: any[], actual: any[]) => {
  let isMatch = false;
  required.some(r => {
    isMatch = actual.indexOf(r) >= 0;
    return !isMatch;
  });
  return isMatch;
};

/**
 * Match properties, i.e. check for a strict equivalence of strings and numbers, or arrays of strings and numbers.
 *
 * @param {(string | number | string[] | number[])} ruleProp
 * @param {(string | number | string[] | number[])} reqProp
 * @returns
 */
const matchProperties = (ruleProp: boolean | string | number | string[] | number[], reqProp: boolean | string | number | string[] | number[]) => {
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
};

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
 * @param {IRule} rule
 * @param {IPermissionRequest} req
 * @param {boolean} checkAction [true] also check the action. When false, ignore the value of the action.
 * @returns {boolean}
 */
const isRuleRelevant = (rule: IRule, req: IPermissionRequest, checkAction = true): boolean => {
  if (rule.action && checkAction) {
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
};


/**
 * Checks if the rule is relevant for a certain subject.
 *
 * @param {IRule} rule
 * @param {IPermissionRequest} req
 * @returns {boolean}
 */
const isSubjectRelevantForRule = (rule: IRule, req: IPermissionRequest): boolean => {
  if (!rule.subject || !req.subject) { return false; }
  for (const key in rule.subject) {
    if (!matchProperties(rule.subject[key], req.subject[key])) { return false; };
  }
  return true;
};

const createPolicyStore = (db: Loki) => {
  const psCollection = db.getCollection<IPolicySetCollection>('policy-sets');

  /**
   * Returns all policy sets.
   *
   * @returns
   */
  const getPolicySets = () => {
    const policySets = psCollection.find();
    return policySets.map(ps => {
      return <IPolicySetDescription>{
        name: ps.name,
        isDefault: ps.isDefault,
        combinator: ps.combinator
      };
    });
  };

  /**
   * Get the default policy set, so users of the API do not need to specify it explicitly.
   * Returns the first policy set where isDefault = true, or otherwise the first policy set.
   *
   * @returns
   */
  const getDefaultPolicySet = () => {
    const ps = getPolicySets();
    const filtered = ps.filter(p => p.isDefault);
    return filtered.length > 0 ? filtered[0] : ps[0];
  };

  const getPolicySet = (name: string) => {
    return psCollection.findOne({ name: name });
  };

  const getPolicyRules = (policyName: string, policySetName?: string) => {
    return db.getCollection<IRule>(createPolicyName(policySetName, policyName)).find();
  };

  const getRuleResolver = (policyName: string, policySetName?: string) => {
    const ruleCollection = db.getCollection<IRule>(createPolicyName(policySetName, policyName));
    if (!ruleCollection) { return null; }
    return (req: IPermissionRequest) => {
      return ruleCollection
        .chain()
        .where(r => isRuleRelevant(r, req))
        .data();
    };
  };

  const getPrivilegesResolver = (policySetName: string) => {
    const policySet = psCollection.findOne({ name: policySetName });
    return (req: IPermissionRequest) => {
      let privileges: Action = Action.None;
      policySet.policies.some(p => {
        const ruleCollection = db.getCollection<IRule>(p.name);
        // privileges
        privileges = <Action>ruleCollection
          .chain()
          .where(r => isRuleRelevant(r, { subject: req.subject, resource: req.resource, action: r.action })) // NOTE: We reset the req.action to the rule's action so we don't filter them out.
          .data()
          .reduce((old, cur) => { return old | cur.action; }, privileges);
        return (privileges & Action.All) === Action.All;
      });
      return privileges;
    };
  };

  const getPrivileges = (subject: Subject): IRule[] => {
    const rules: IRule[] = [];
    psCollection.find().forEach(ps => {
      ps.policies.forEach(p => {
        const ruleCollection = db.getCollection<IRule>(p.name);
        ruleCollection
          .chain()
          .where(r => isSubjectRelevantForRule(r, { subject: subject }))
          .data()
          .forEach(r => rules.push(r));
      });
    });
    return rules;
  };

  const getPolicyEditor = (policyName: string, policySetName: string) => {
    const name = createPolicyName(policySetName, policyName);
    const ruleCollection = db.getCollection<IRule>(name);
    const getRules = (req: IPermissionRequest) => {
      return ruleCollection
        .chain()
        .where(r => isRuleRelevant(r, req, false)) // NOTE: We reset the req.action to the rule's action so we don't filter them out.
        .data();
    };
    if (ruleCollection === null) { throw new Error(`Cannot get rules for policy ${policyName}!`); }
    return (change: 'add' | 'update' | 'delete', rule: IRule) => {
      switch (change) {
        case 'add':
          // TODO Check rules: how to update existing rules when adding new ones.
          const rules = getRules(rule);
          if (rules.length > 0) {
            // Relevant rules (with the same subject/resource) are found
            if (rules.reduce((p, r) => { return p || ((r.action & rule.action) === rule.action); }, false)) {
              // The newly requested action is already contained in the existing rules.
              if (rule.decision === Decision.Permit) {
                // Do not modify anything.
                return { rule: null, status: NOT_MODIFIED };
              } else {
                rules[0].action = rules[0].action ^ rule.action;
                return { rule: ruleCollection.update(rules[0]), status: CREATED };
              }
            } else {
              // The newly requested action is not covered yet. Update the rule with the new action.
              rules[0].action = rules[0].action | rule.action;
              return { rule: ruleCollection.update(rules[0]), status: CREATED };
            }
          }
          return { rule: ruleCollection.insert(rule), status: CREATED };
        case 'update':
          return { rule: ruleCollection.update(rule), status: OK };
        case 'delete':
          return { rule: ruleCollection.remove(rule), status: NO_CONTENT };
        default:
          throw new Error('Unknown change.');
      }
    };
  };

  const save = (done) => {
    db.save(done);
  };

  return {
    name: db.filename,
    getDefaultPolicySet,
    getPolicySets,
    getPolicySet,
    getPolicyRules,
    getRuleResolver,
    getPrivilegesResolver,
    getPrivileges,
    getPolicyEditor,
    save
  };
};

/**
 * PolicyStore factory: creates a new PolicyStore, either from file, or, if the
 * file doesn't exist, from the supplied policy sets.
 *
 * @export
 * @param {string} [name='policies.json']
 * @param {((dataOrErr: any | Error) => void)} callback
 * @param {IPolicySet[]} [policySets]
 * @returns {PolicyStore}
 */
export const PolicyStoreFactory = (name = 'policies.json', callback: (err: Error, policyStore: IPolicyStore) => void, policySets?: IPolicySet[]) => {
  const db = new lokijs(name, <LokiConfigureOptions>{
    autoload: policySets ? false : true,
    autosave: true,
    env: 'NODEJS',
    autosaveInterval: 10000,
    persistenceMethod: 'fs',
    verbose: true,
    autoloadCallback: (dataOrErr) => {
      if (dataOrErr instanceof Error) {
        callback(dataOrErr, null);
      } else {
        callback(null, createPolicyStore(db));
      }
    }
  });
  if (policySets) {
    loadPolicySets(db, policySets);
    callback(null, createPolicyStore(db));
  };
};
