"use strict";
var decision_1 = require('../models/decision');
function resolvePolicy(policyStore, policyName, policyCombinator) {
    var resolveRules = policyStore.getRuleResolver(policyName);
    if (!resolveRules) {
        return null;
    }
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
    return {
        getPolicyResolver: function (policySetName) {
            var policyResolvers = [];
            var policySet = policyStore.getPolicySet(policySetName);
            if (!policySet) {
                return null;
            }
            var policySetCombinator = policySet.combinator;
            policySet.policies.forEach(function (p) {
                var rp = resolvePolicy(policyStore, p.name, p.combinator);
                if (rp) {
                    policyResolvers.push(rp);
                }
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