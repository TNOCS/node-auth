"use strict";
var decision_1 = require('../models/decision');
var _policyStore;
function resolvePolicy(policyName, policyCombinator) {
    var resolveRules = _policyStore.getRuleResolver(policyName);
    var isFirst = policyCombinator === 'first';
    return function (req) {
        var rules = resolveRules(req);
        var permit = false;
        rules.some(function (r) {
            permit = r.decision === decision_1.Decision.Permit;
            return isFirst ? permit : !permit;
        });
        return permit;
    };
}
function initPDP(policyStore) {
    _policyStore = policyStore;
    return {
        getPolicyResolver: function (policySetName) {
            var policyResolvers = [];
            var policySet = policyStore.getPolicySet(policySetName);
            var policySetCombinator = policySet.combinator;
            policySet.policies.forEach(function (p) {
                policyResolvers.push(resolvePolicy(p.name, p.combinator));
            });
            var isFirst = policySetCombinator === 'first';
            return function (req) {
                var permit;
                policyResolvers.some(function (policyResolver) {
                    permit = policyResolver(req);
                    return isFirst ? permit : !permit;
                });
                return permit;
            };
        }
    };
}
exports.initPDP = initPDP;
//# sourceMappingURL=pdp.js.map