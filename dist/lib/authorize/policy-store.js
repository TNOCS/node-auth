"use strict";
var lokijs = require("lokijs");
var action_1 = require("../models/action");
function sanatize(name) {
    return name.replace(/ /g, '_');
}
function createPolicyName(policySetName, policyName) {
    return sanatize(policySetName + "___" + policyName);
}
function loadPolicy(db, policyFullName, p) {
    var ruleCollection = db.addCollection(policyFullName);
    p.rules.forEach(function (rule) {
        ruleCollection.insert(rule);
    });
}
function loadPolicySet(db, psCollection, ps) {
    var policySummaries = [];
    ps.policies.forEach(function (p) {
        var policyFullName = createPolicyName(ps.name, p.name);
        loadPolicy(db, policyFullName, p);
        policySummaries.push({ name: policyFullName, desc: p.desc, combinator: p.combinator });
    });
    psCollection.insert({ name: ps.name, desc: ps.desc, combinator: ps.combinator, policies: policySummaries });
}
function loadPolicySets(db, policySets) {
    var psCol = db.addCollection('policy-sets');
    policySets.forEach(function (ps) {
        loadPolicySet(db, psCol, ps);
    });
}
function matchArrays(required, actual) {
    var isMatch = false;
    required.some(function (r) {
        isMatch = actual.indexOf(r) >= 0;
        return !isMatch;
    });
    return isMatch;
}
function matchProperties(ruleProp, reqProp) {
    if (ruleProp instanceof Array) {
        if (reqProp instanceof Array) {
            if (reqProp.length > 1) {
                return false;
            }
            else {
                return matchArrays(ruleProp, reqProp);
            }
        }
        else {
            return matchArrays(ruleProp, [reqProp]);
        }
    }
    else {
        if (reqProp instanceof Array) {
            if (reqProp.length > 1) {
                return false;
            }
            else {
                return ruleProp === reqProp[0];
            }
        }
        else {
            return ruleProp === reqProp;
        }
    }
}
function isRuleRelevant(rule, req) {
    if (rule.action) {
        if (!req.action || !((req.action & rule.action) === req.action)) {
            return false;
        }
    }
    if (rule.subject) {
        if (!req.subject) {
            return false;
        }
        for (var key in rule.subject) {
            if (!matchProperties(rule.subject[key], req.subject[key])) {
                return false;
            }
            ;
        }
    }
    if (rule.resource) {
        if (!req.resource) {
            return false;
        }
        for (var key in rule.resource) {
            if (!matchProperties(rule.resource[key], req.resource[key])) {
                return false;
            }
            ;
        }
    }
    return true;
}
function isSubjectRelevantForRule(rule, req) {
    if (!rule.subject || !req.subject) {
        return false;
    }
    for (var key in rule.subject) {
        if (!matchProperties(rule.subject[key], req.subject[key])) {
            return false;
        }
        ;
    }
    return true;
}
function initPolicyStore(name, policySets) {
    if (name === void 0) { name = 'policies'; }
    var db = new lokijs(name);
    if (policySets) {
        loadPolicySets(db, policySets);
    }
    var psCollection = db.getCollection('policy-sets');
    return {
        name: name,
        getPolicySets: function () {
            var policySets = psCollection.find();
            return policySets.map(function (ps) {
                return {
                    name: ps.name,
                    combinator: ps.combinator
                };
            });
        },
        getPolicySet: function (name) {
            return psCollection.findOne({ name: name });
        },
        getPolicyRules: function (policyName) {
            return db.getCollection(policyName).find();
        },
        getRuleResolver: function (policyName) {
            var ruleCollection = db.getCollection(policyName);
            if (!ruleCollection) {
                return null;
            }
            return function (req) {
                return ruleCollection
                    .chain()
                    .where(function (r) { return isRuleRelevant(r, req); })
                    .data();
            };
        },
        getPrivilegesResolver: function (policySetName) {
            var policySet = psCollection.findOne({ name: policySetName });
            return function (req) {
                var privileges = action_1.Action.None;
                policySet.policies.some(function (p) {
                    var ruleCollection = db.getCollection(p.name);
                    privileges = ruleCollection
                        .chain()
                        .where(function (r) { return isRuleRelevant(r, { subject: req.subject, resource: req.resource, action: r.action }); })
                        .data()
                        .reduce(function (old, cur) { return old | cur.action; }, privileges);
                    return (privileges & action_1.Action.All) === action_1.Action.All;
                });
                return privileges;
            };
        },
        getPrivileges: function (subject) {
            var rules = [];
            psCollection.find().forEach(function (ps) {
                ps.policies.forEach(function (p) {
                    var ruleCollection = db.getCollection(p.name);
                    ruleCollection
                        .chain()
                        .where(function (r) { return isSubjectRelevantForRule(r, { subject: subject }); })
                        .data()
                        .forEach(function (r) { return rules.push(r); });
                });
            });
            return rules;
        },
        getPolicyEditor: function (policyName) {
            var ruleCollection = db.getCollection(policyName);
            return function (change, rule) {
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
        save: function (done) {
            db.save(done);
        }
    };
}
exports.initPolicyStore = initPolicyStore;
//# sourceMappingURL=policy-store.js.map