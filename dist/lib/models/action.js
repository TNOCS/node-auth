"use strict";
(function (Action) {
    Action[Action["none"] = 0] = "none";
    Action[Action["create"] = 1] = "create";
    Action[Action["read"] = 2] = "read";
    Action[Action["update"] = 4] = "update";
    Action[Action["delete"] = 8] = "delete";
    Action[Action["author"] = 6] = "author";
    Action[Action["manage"] = 15] = "manage";
    Action[Action["approve"] = 16] = "approve";
    Action[Action["assign"] = 32] = "assign";
    Action[Action["delegate"] = 64] = "delegate";
    Action[Action["all"] = 127] = "all";
})(exports.Action || (exports.Action = {}));
var Action = exports.Action;
//# sourceMappingURL=action.js.map