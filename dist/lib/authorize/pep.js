"use strict";
var action_1 = require('../models/action');
var pdp_1 = require('./pdp');
function defaultPermissionRequest(req) {
    var action;
    switch (req.method.toLowerCase()) {
        case 'get':
            action = action_1.Action.Read;
            break;
        case 'put':
            action = action_1.Action.Update;
            break;
        case 'post':
            action = action_1.Action.Create;
            break;
        case 'delete':
            action = action_1.Action.Delete;
            break;
        default:
            action = action_1.Action.None;
            break;
    }
    return { subject: req['user'], action: action, resource: req.params };
}
function initPEP(policyStore) {
    var pdp = pdp_1.initPDP(policyStore);
    return {
        getPolicyEnforcer: function (policySetName, generatePermissionRequest) {
            var policyResolver = pdp.getPolicyResolver(policySetName);
            if (generatePermissionRequest) {
                return function (req, res, next) {
                    var permissionRequest = generatePermissionRequest(req);
                    return policyResolver(permissionRequest) ? next() : res.status(403).json({ success: false, message: 'Access denied' });
                };
            }
            else {
                return function (req, res, next) {
                    var permissionRequest = req['req'] || defaultPermissionRequest(req);
                    return policyResolver(permissionRequest) ? next() : res.status(403).json({ success: false, message: 'Access denied' });
                };
            }
        }
    };
}
exports.initPEP = initPEP;
//# sourceMappingURL=pep.js.map