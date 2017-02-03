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
    rule.subject && Object.keys(rule.subject).forEach(function (k) {
        if (usedKeys.subjectKeys.indexOf(k) < 0) {
            usedKeys.subjectKeys.push(k);
        }
    });
    if (rule.action) {
        usedKeys.action |= rule.action;
    }
    rule.resource && Object.keys(rule.resource).forEach(function (k) {
        if (usedKeys.resourceKeys.indexOf(k) < 0) {
            usedKeys.resourceKeys.push(k);
        }
    });
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
        getRelevantPolicyRules: function (policyName, req) {
            var ruleCollection = db.getCollection(policyName);
            var usedKeys = usedKeyCollection.findOne({ policyName: policyName });
            var relevantRules = [];
            req.subject && usedKeys.subjectKeys.forEach(function (k) {
                if (req.subject.hasOwnProperty(k)) {
                    ruleCollection
                        .chain()
                        .where(function (r) { return r.subject[k] === req.subject[k]; })
                        .data()
                        .forEach(function (r) { relevantRules.push(r); });
                }
            });
            req.resource && usedKeys.resourceKeys.forEach(function (k) {
                if (req.resource.hasOwnProperty(k)) {
                    ruleCollection
                        .chain()
                        .where(function (r) { return r.resource[k] === req.resource[k]; })
                        .data()
                        .forEach(function (r) { relevantRules.push(r); });
                }
            });
            return relevantRules;
        },
        addPolicyRule: function (policyName, rule) {
            var ruleCollection = db.getCollection(policyName);
            var usedKeys = usedKeyCollection.findOne({ policyName: policyName });
            updateUsedKeys(usedKeys, rule);
            usedKeyCollection.update(usedKeys);
            ruleCollection.insert(rule);
        },
        save: function (done) {
            db.save(done);
        }
    };
}
exports.init = init;
//# sourceMappingURL=policy-store.js.map