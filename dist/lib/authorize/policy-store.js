"use strict";
var lokijs = require('lokijs');
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
function isRuleRelevant(rule, req) {
    if (rule.action) {
        if (!req.action || !(req.action & rule.action)) {
            return false;
        }
    }
    if (rule.subject) {
        if (!req.subject) {
            return false;
        }
        for (var key in rule.subject) {
            if (!rule.subject.hasOwnProperty(key)) {
                continue;
            }
            if (!req.subject.hasOwnProperty(key) || rule.subject[key] !== req.subject[key]) {
                return false;
            }
        }
    }
    if (rule.resource) {
        if (!req.resource) {
            return false;
        }
        for (var key in rule.resource) {
            if (!rule.resource.hasOwnProperty(key)) {
                continue;
            }
            if (!req.resource.hasOwnProperty(key) || rule.resource[key] !== req.resource[key]) {
                return false;
            }
        }
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
            return function (req) {
                return ruleCollection
                    .chain()
                    .where(function (r) { return isRuleRelevant(r, req); })
                    .data();
            };
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