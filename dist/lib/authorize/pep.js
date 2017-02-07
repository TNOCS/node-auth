"use strict";
var action_1 = require('../models/action');
var pdp_1 = require('./pdp');
function addExtraAttributesToRequest(extraAttributes, req) {
    if (!extraAttributes) {
        return;
    }
    var subject = extraAttributes.subject;
    if (subject) {
        if (!req.subject) {
            req.subject = {};
        }
        for (var key in subject) {
            if (!subject.hasOwnProperty(key)) {
                continue;
            }
            req.subject[key] = subject[key];
        }
    }
    var resource = extraAttributes.resource;
    if (resource) {
        if (!req.resource) {
            req.resource = {};
        }
        for (var key in resource) {
            if (!resource.hasOwnProperty(key)) {
                continue;
            }
            req.resource[key] = resource[key];
        }
    }
    var action = extraAttributes.action;
    if (action) {
        req.action |= action;
    }
}
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
        getPolicyEnforcer: function (policySetName, extraRequestAttributes, generatePermissionRequest) {
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
                    addExtraAttributesToRequest(extraRequestAttributes, permissionRequest);
                    return policyResolver(permissionRequest) ? next() : res.status(403).json({ success: false, message: 'Access denied' });
                };
            }
        }
    };
}
exports.initPEP = initPEP;
//# sourceMappingURL=pep.js.map