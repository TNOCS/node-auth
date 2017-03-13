"use strict";
var pdp_1 = require("../authorize/pdp");
var action_1 = require("../models/action");
var policy_store_1 = require("../authorize/policy-store");
var pdp;
function checkPermission(subject, newPrivilege, callback) {
    var pr = pdp.getPolicyResolver(newPrivilege.policySet);
    if (!pr) {
        callback({ success: false, message: 'Insufficient rights' });
    }
    var permit = pr({ subject: subject, action: action_1.Action.Manage, resource: newPrivilege.resource });
    callback(permit ? { success: true } : { success: false, message: 'Insufficient rights' });
}
function getPolicyEditor(newPrivilege) {
    var policy = newPrivilege.policy || -1;
    if (typeof policy === 'number') {
        var policySet = exports.policyStore.getPolicySet(newPrivilege.policySet);
        if (policy >= policySet.policies.length) {
            return null;
        }
        var policyName = policySet.policies[policy < 0 ? policySet.policies.length - 1 : policy].name;
        return exports.policyStore.getPolicyEditor(policyName);
    }
    else {
        return exports.policyStore.getPolicyEditor(policy);
    }
}
function createPrivilege(newPrivilege) {
    var policyEditor = getPolicyEditor(newPrivilege);
    if (!policyEditor) {
        return null;
    }
    return policyEditor('add', newPrivilege);
}
function updatePrivilege(newPrivilege) {
    var policyEditor = getPolicyEditor(newPrivilege);
    if (!policyEditor) {
        return null;
    }
    return policyEditor('update', newPrivilege);
}
function deletePrivilege(newPrivilege) {
    var policyEditor = getPolicyEditor(newPrivilege);
    if (!policyEditor) {
        return null;
    }
    return policyEditor('delete', newPrivilege);
}
function getPrivilegeRequest(req, res) {
    var newPrivilege = req['body'];
    if (!newPrivilege || !newPrivilege.policySet || !(newPrivilege.subject || newPrivilege.action || newPrivilege.resource)) {
        res.status(403).json({ success: false, message: 'Unknown body, expected { subject, action, resource } message.' });
        return null;
    }
    return newPrivilege;
}
function init(options) {
    if (!options.policyStore) {
        throw new Error('No PolicyStore defined! In case you do not turn of options.authorizations, you need to supply a policy store.');
    }
    exports.policyStore = policy_store_1.initPolicyStore(options.policyStore.name, options.policyStore.policySets);
    pdp = pdp_1.initPDP(exports.policyStore);
}
exports.init = init;
function getPrivileges(req, res) {
    var user = req['user'];
    if (!user) {
        res.status(403).json({ success: false, message: 'Service only available for authenticated users.' });
    }
    else {
        res.json({ success: true, message: exports.policyStore.getPrivileges(user) });
    }
}
exports.getPrivileges = getPrivileges;
function crudPrivileges(change, req, res, handler) {
    var subject = req['user'];
    if (!subject) {
        return;
    }
    var newPrivilege = getPrivilegeRequest(req, res);
    if (!newPrivilege) {
        return;
    }
    if (change !== 'create' && !newPrivilege.hasOwnProperty('meta')) {
        res.status(401).json({ success: false, message: 'Metadata is missing, original rule should be returned' });
        return;
    }
    checkPermission(subject, newPrivilege, handler(newPrivilege));
}
function createPrivileges(req, res) {
    var handler = function (newPrivilege) {
        return function (msg) {
            if (msg.success) {
                var rule = createPrivilege(newPrivilege);
                if (rule) {
                    res.status(201).json({ success: true, message: rule });
                }
                else {
                    res.status(401).json(msg);
                }
            }
            else {
                res.status(401).json(msg);
            }
        };
    };
    crudPrivileges('create', req, res, handler);
}
exports.createPrivileges = createPrivileges;
function updatePrivileges(req, res) {
    var handler = function (newPrivilege) {
        return function (msg) {
            if (msg.success) {
                var rule = updatePrivilege(newPrivilege);
                if (rule) {
                    res.json({ success: true, message: rule });
                }
                else {
                    res.status(401).json(msg);
                }
            }
            else {
                res.status(401).json(msg);
            }
        };
    };
    crudPrivileges('update', req, res, handler);
}
exports.updatePrivileges = updatePrivileges;
function deletePrivileges(req, res) {
    var handler = function (newPrivilege) {
        return function (msg) {
            if (msg.success) {
                var rule = deletePrivilege(newPrivilege);
                if (!rule) {
                    res.status(204).end();
                }
                else {
                    res.status(401).json(msg);
                }
            }
            else {
                res.status(401).json(msg);
            }
        };
    };
    crudPrivileges('delete', req, res, handler);
}
exports.deletePrivileges = deletePrivileges;
//# sourceMappingURL=authorize.js.map