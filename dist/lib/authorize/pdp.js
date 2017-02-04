"use strict";
var decision_1 = require('../models/decision');
var _policyStore;
function isPermitted(rule, req) {
    return true;
}
function resolvePolicy(policyName, policyCombinator) {
    var ruleResolver = _policyStore.getRuleResolver(policyName);
    var isFirst = policyCombinator === 'first';
    return function (req) {
        var rules = ruleResolver(req);
        var permit;
        rules.some(function (r) {
            permit = isPermitted(r, req);
            return isFirst ? permit : !permit;
        });
        return permit;
    };
}
exports.resolvePolicy = resolvePolicy;
function PolicyDecisionPoint(policyStore) {
    _policyStore = policyStore;
    return {
        getPolicyResolver: function (policySetName) {
            var ruleResolvers = [];
            var policySet = policyStore.getPolicySet(policySetName);
            var policySetCombinator = policySet.combinator;
            policySet.policies.forEach(function (p) {
                var ruleResolver = _policyStore.getRuleResolver(p.name);
                ruleResolvers.push({ ruleResolver: ruleResolver, combinator: p.combinator });
            });
            switch (policySetCombinator) {
                case 'first':
                    return function (req) {
                        return decision_1.Decision.Permit;
                    };
                case 'all':
                    return function (req) {
                        return decision_1.Decision.Permit;
                    };
            }
        }
    };
}
exports.PolicyDecisionPoint = PolicyDecisionPoint;
//# sourceMappingURL=pdp.js.map