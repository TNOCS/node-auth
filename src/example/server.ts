// See also https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens
import * as express from "express";
import { Application, Request } from "express";
import * as bodyParser from "body-parser";
import * as morgan from "morgan";
import * as mongoose from "mongoose";
import { IUser } from "../lib/models/user";
import { CRUD } from "../lib/models/crud";
import { nodeAuth } from "../lib/index";

const config = require("config"); // get our config file
export const server: Application = express();

// =======================
// configuration =========
// =======================
const port = process.env.PORT || config.port || 3210;
mongoose.connect(config.database); // connect to database
// server.set("jwtAuthSecret", config.secret); // secret variable

// use body parser so we can get info from POST and/or URL parameters
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(bodyParser.json({ type: "application/json"}));

// use morgan to log requests to the console, but don't show the log when it is test
if (config.util.getEnv("NODE_ENV") !== "test") {
  server.use(morgan("dev"));
}

////////////////////////
// routes for testing //
////////////////////////
server.get("/", (req, res) => {
  res.send("Hello! The API is at http://localhost:" + port + "/api");
});

server.use(nodeAuth(server, {
  secretKey: config.secret,
  blockUnauthenticatedUser: false, // if true, default, no unauthenticated user will pass
  onUserChanged: (user: IUser, req: Request, change: CRUD) => {
    // console.log(`User ${change}d:`);
    // console.log(JSON.stringify(user, null, 2));
  }
}));

server.route("/unprotected/resource")
  .all((req, res, next) => {
    next();
  })
  .get((req, res, next) => {
    res.json({ success: true });
  });

server.get("/protected/resource", (req, res, next) => {
  res.status(HTTPStatusCodes.BAD_REQUEST).json({ success: false });
});

// =======================
// start the server ======
// =======================
server.listen(port);
console.log("Magic happens at http://localhost:" + port);
// module.exports = app; // for testing