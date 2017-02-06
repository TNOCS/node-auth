"use strict";
function init(options) {
}
exports.init = init;
function authorize(req, res) {
    var user = req['user'];
    if (!user) {
        res.status(403).json({ success: false, message: 'Service only available for authenticated users.' });
    }
    else {
        res.json({ success: true });
    }
}
exports.authorize = authorize;
//# sourceMappingURL=authorize.js.map