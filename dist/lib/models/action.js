"use strict";
var Action;
(function (Action) {
    Action[Action["None"] = 0] = "None";
    Action[Action["Create"] = 1] = "Create";
    Action[Action["Read"] = 2] = "Read";
    Action[Action["Update"] = 4] = "Update";
    Action[Action["Delete"] = 8] = "Delete";
    Action[Action["Author"] = 6] = "Author";
    Action[Action["Manage"] = 15] = "Manage";
    Action[Action["Approve"] = 16] = "Approve";
    Action[Action["Assign"] = 32] = "Assign";
    Action[Action["Delegate"] = 64] = "Delegate";
    Action[Action["Sign"] = 128] = "Sign";
    Action[Action["All"] = 255] = "All";
})(Action = exports.Action || (exports.Action = {}));
//# sourceMappingURL=action.js.map