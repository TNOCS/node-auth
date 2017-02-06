"use strict";
var _policyStore;
function init(options) {
    if (!options.policyStore) {
        throw new Error('No PolicyStore defined! In case you do not turn of options.authorizations, you need to supply a policy store.');
    }
    _policyStore = options.policyStore;
}
exports.init = init;
function authorize(req, res) {
    var user = req['user'];
    if (!user) {
        res.status(403).json({ success: false, message: 'Service only available for authenticated users.' });
    }
    else {
        res.json({ success: true, message: _policyStore.getPrivileges(user) });
    }
}
exports.authorize = authorize;
//# sourceMappingURL=authorize.js.map