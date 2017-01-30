// See also https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens
import * as express from "express";
import { Request } from "express";
import * as bodyParser from "body-parser";
import * as morgan from "morgan";
import * as mongoose from "mongoose";
import { IUser } from "../lib/models/user";
import { CRUD } from "../lib/models/crud";
import { nodeAuth } from "../lib/index";

const config = require("config"); // get our config file
const app = express();

// =======================
// configuration =========
// =======================
const port = process.env.PORT || config.port || 3210; // used to create, sign, and verify tokens
mongoose.connect(config.database); // connect to database
app.set("jwtAuthSecret", config.secret); // secret variable

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: "application/json"}));

// use morgan to log requests to the console, but don't show the log when it is test
if (config.util.getEnv("NODE_ENV") !== "test") {
  app.use(morgan("dev"));
}

// =======================
// routes ================
// =======================
// basic route
app.get("/", (req, res) => {
  res.send("Hello! The API is at http://localhost:" + port + "/api");
});

// app.get('/setup', (req, res) => {
//   // create a sample user
//   const user = new User({
//     name: 'ev',
//     password: 'password', // hash it
//     admin: true,
//     data: {
//       projects: [ {
//         id: 1,
//         role: 'admin'
//       }]
//     }
//   });

//   // save the sample user
//   user.save((err) => {
//     if (err) throw err;

//     console.log('User saved successfully');
//     res.json({ success: true });
//   });
// });

app.use(nodeAuth(app, {
  secretKey: config.secret,
  onUserChanged: (user: IUser, req: Request, change: CRUD) => {
    // console.log(`User ${change}d:`);
    // console.log(JSON.stringify(user, null, 2));
  }
}));
// =======================
// start the server ======
// =======================
app.listen(port);
console.log("Magic happens at http://localhost:" + port);
module.exports = app; // for testing