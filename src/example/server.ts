// See also https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens
import * as express from 'express';
import { Application, Request } from 'express';
import * as bodyParser from 'body-parser';
import * as morgan from 'morgan';
import * as mongoose from 'mongoose';
import { IUser } from '../lib/models/user';
import { CRUD } from '../lib/models/crud';
import { Action } from '../lib/models/action';
import { Decision } from '../lib/models/decision';
import { nodeAuth } from '../lib/index';
import { initPolicyStore } from '../lib/authorize/policy-store';
import { initPEP } from '../lib/authorize/pep';

const config = require('config'); // get our config file
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
server.use(bodyParser.json({ type: 'application/json' }));

// Load of create a policy store
const policyStore = initPolicyStore('example-policies.json', [{
  name: 'Main policy set',
  combinator: 'first',
  policies: [{
    name: 'admins rule',
    combinator: 'first',
    rules: [{
      subject: { admin: true },
      action: Action.All,
      decision: Decision.Permit
    }]
  }, {
    name: 'rbac',
    combinator: 'first',
    rules: [{
      subject: { subscribed: true },
      action: Action.Create,
      resource: {
        type: 'article'
      },
      decision: Decision.Permit
    }, {
      subject: { subscribed: true },
      action: Action.Create,
      resource: {
        type: 'comment'
      },
      decision: Decision.Permit
    }, {
      subject: { email: 'john.smith@gmail.com' },
      action: Action.Manage,
      decision: Decision.Permit,
      resource: {
        articleID: ['johnny_article']
      }
    }, {
      subject: { _id: '456' },
      action: Action.Author,
      decision: Decision.Permit,
      resource: {
        articleID: ['456_article']
      }
    }, {
      description: 'Anyone can read public resources',
      action: Action.Read,
      decision: Decision.Permit,
      resource: {
        articleID: ['public_article']
      }
    }, {
      description: 'Subscribed users can create new resources',
      subject: {
        subscribed: true
      },
      action: Action.Create,
      decision: Decision.Permit
    }]
  }]
}]);

// use morgan to log requests to the console, but don't show the log when it is test
if (config.util.getEnv('NODE_ENV') !== 'test') {
  server.use(morgan('dev'));
}

////////////////////////
// routes for testing //
////////////////////////
server.get('/', (req, res) => {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});

server.use(nodeAuth(server, {
  secretKey: config.secret,
  blockUnauthenticatedUser: false, // if true, default, no unauthenticated user will pass beyond this point
  policyStore: policyStore,
  verify: {
    route: true,
    baseUrl: 'www.mydomain.com/api/activate',
    mailService: null,
    verifyMailOptions: {
      from: 'erik.vullings@gmail.com',
      subject: 'Just verifying that your email is correct',
      html: 'Hello'
    },
    confirmMailOptions: {
      from: 'erik.vullings@gmail.com',
      subject: 'Just confirming that your account is setup and good to go',
      html: 'Yay!'
    }
  },
  onUserChanged: (user: IUser, req: Request, change: CRUD) => {
    // console.log(`User ${change}d:`);
    // console.log(JSON.stringify(user, null, 2));
  }
}));

server.route('/unprotected/resource')
  .get((req, res, next) => {
    res.json({ success: true });
  });

const pep = initPEP(policyStore);
const cop = pep.getPolicyEnforcer('Main policy set');

server.all('/protected/:articleID', cop, (req, res, next) => {
  res.json({ success: true });
});

// =======================
// start the server ======
// =======================
// See also: http://www.marcusoft.net/2015/10/eaddrinuse-when-watching-tests-with-mocha-and-supertest.html
if (!module.parent) {
  server.listen(port);
}
// server.listen(port);
console.log('Magic happens at http://localhost:' + port);
// module.exports = app; // for testing