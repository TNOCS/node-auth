"use strict";
var lokijs = require('lokijs');
var action_1 = require('../models/action');
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
function updateUsedKeys(usedKeys, rule) {
    var changed = false;
    rule.subject && Object.keys(rule.subject).forEach(function (k) {
        if (usedKeys.subjectKeys.indexOf(k) < 0) {
            usedKeys.subjectKeys.push(k);
            changed = true;
        }
    });
    if (rule.action) {
        usedKeys.action |= rule.action;
        changed = true;
    }
    rule.resource && Object.keys(rule.resource).forEach(function (k) {
        if (usedKeys.resourceKeys.indexOf(k) < 0) {
            usedKeys.resourceKeys.push(k);
            changed = true;
        }
    });
    return changed;
}
function createSummary(db) {
    var summary = db.addCollection('summaries');
    var psCollection = db.getCollection('policy-sets').find();
    psCollection.forEach(function (ps) {
        ps.policies.forEach(function (p) {
            var rules = db.getCollection(p.name).find();
            var usedKeys = {
                policyName: p.name,
                subjectKeys: [],
                action: action_1.Action.none,
                resourceKeys: []
            };
            rules.forEach(function (r) {
                updateUsedKeys(usedKeys, r);
            });
            summary.insert(usedKeys);
        });
    });
}
function isRuleRelevant(rule, req) {
    if (req.action && rule.action && !(req.action & rule.action)) {
        return false;
    }
    if (rule.subject && req.subject) {
        for (var key in rule.subject) {
            if (!rule.subject.hasOwnProperty(key)) {
                continue;
            }
            if (!req.subject.hasOwnProperty(key) || rule.subject[key] !== req.subject[key]) {
                return false;
            }
        }
    }
    if (rule.resource && req.resource) {
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
function init(name, policySets) {
    if (name === void 0) { name = 'policies'; }
    var db = new lokijs(name);
    if (policySets) {
        loadPolicySets(db, policySets);
        createSummary(db);
    }
    var psCollection = db.getCollection('policy-sets');
    var usedKeyCollection = db.getCollection('summaries');
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
                var usedKeys = usedKeyCollection.findOne({ policyName: policyName });
                var relevantRules = [];
                req.subject && usedKeys.subjectKeys.forEach(function (k) {
                    if (req.subject.hasOwnProperty(k)) {
                        ruleCollection
                            .chain()
                            .where(function (r) { return r.subject[k] === req.subject[k]; })
                            .data()
                            .forEach(function (r) {
                            if (relevantRules.indexOf(r) < 0 && isRuleRelevant(r, req)) {
                                relevantRules.push(r);
                            }
                        });
                    }
                });
                req.resource && usedKeys.resourceKeys.forEach(function (k) {
                    if (req.resource.hasOwnProperty(k)) {
                        ruleCollection
                            .chain()
                            .where(function (r) { return r.resource[k] === req.resource[k]; })
                            .data()
                            .forEach(function (r) {
                            if (relevantRules.indexOf(r) < 0 && isRuleRelevant(r, req)) {
                                relevantRules.push(r);
                            }
                        });
                    }
                });
                return relevantRules;
            };
        },
        getPolicyEditor: function (policyName) {
            var ruleCollection = db.getCollection(policyName);
            return function (change, rule) {
                switch (change) {
                    case 'add':
                        var usedKeys = usedKeyCollection.findOne({ policyName: policyName });
                        if (updateUsedKeys(usedKeys, rule)) {
                            usedKeyCollection.update(usedKeys);
                        }
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
exports.init = init;
//# sourceMappingURL=policy-store.js.map