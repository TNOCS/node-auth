"use strict";
var decision_1 = require('../models/decision');
function PolicyDecisionPoint(policySets) {
    return function (permissionRequest) {
        return decision_1.Decision.permit;
    };
}
exports.PolicyDecisionPoint = PolicyDecisionPoint;
//# sourceMappingURL=pdp.js.map