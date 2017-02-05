"use strict";
(function (Decision) {
    Decision[Decision["Deny"] = 0] = "Deny";
    Decision[Decision["Permit"] = 1] = "Permit";
    Decision[Decision["PartialPermit"] = 2] = "PartialPermit";
})(exports.Decision || (exports.Decision = {}));
var Decision = exports.Decision;
//# sourceMappingURL=decision.js.map