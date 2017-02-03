process.env.NODE_ENV = 'test';

import { User, IUser, IUserModel } from '../../lib/models/user';
import * as chai from 'chai';
import { server } from '../../example/server';

chai.should();
chai.use(require('chai-http'));

// export enum CRUD {
//   "read",
//   "write"
// }

// export namespace CRUD {
//   "delete";
//   export function mix() {}
// }

// const action: CRUD = CRUD.delete;
// console.log(action.mix());
// export type CRUD = "create" | "read";
// export type Action = "approve" | CRUD;
// let action: Action = "create";
// console.log(action);

describe('Authorize route', () => {
  let adminUser: IUserModel;
  let regularUser: IUserModel;
  let verifiedUser: IUserModel;
  let users: IUser[] = [];
  /**
   * Before we start the tests, we empty the database and
   * - create an admin
   * - create two regular user
   *
   * PLEASE NOTE: There is an order in these tests, and a dependence between them.
   * Some test allow a user to login, and his token is saved for subsequent calls.
   */
  before((done: Function) => {
    User.remove({}, (err) => {
      adminUser = new User({
        name: 'Erik Vullings',
        email: 'erik.vullings@gmail.com',
        password: 'password',
        verified: false,
        admin: true,
        data: {}
      });
      regularUser = new User({
        name: 'John Smith',
        email: 'john.smith@gmail.com',
        password: 'johnny',
        verified: false,
        data: {}
      });
      verifiedUser = new User({
        name: 'Jane Doe',
        email: 'jane.doe@gmail.com',
        password: 'jane',
        verified: true,
        data: {}
      });
      adminUser.save((err, r: IUserModel) => {
        users.push(<IUser>r.toJSON());
        regularUser.save((e, r: IUserModel) => {
          users.push(<IUser>r.toJSON());
          verifiedUser.save((e, r: IUserModel) => {
            users.push(<IUser>r.toJSON());
            done();
          });
        });
      });
    });
  });

 /**
  *  RESOURCE /projects/12345
  * - A user should GET a resource when it is public
  * - A user should GET a protected file if he has READ, EDIT, or ADMIN rights for that particular resource
  * - A user should not GET a protected file if he has no READ rights for that particular resource
  * - A user with READ rights should not be able to change the protected file for that particular resource
  * - A user with EDIT rights should be able to change PUT/POST, but not DELETE, the protected file for that particular resource
  * - A user with ADMIN rights should be able to change PUT/POST/DELETE the protected file for that particular resource
  * - A user with ADMIN rights should be able to change the users that can access this file for that particular resource:
  *   add or delete a user, and change the READ, EDIT, ADMIN rights of a user
  * - An ADMIN user i.e. user.admin === true, should have ADMIN rights for all resources
  *
  * Therefore, we need to intercept each call to a resource, look it up, and check if it:
  * 1. Is it public. If yes, call `next()`
  * 2. It is not public:
  *
  * Question:
  * - How are we dealing with child-resources (layers)
  * - Do we use central authZ, i.e. one function that intercepts everything, or do we decentralize it for each specific route.
  *
  We can approach it from directions:
  1. What permissions does the user have? E.g. user has a claim to author a resource.
  2. What restrictions apply to the resource? E.g. resource specifies that certain subjects can author it.
     Resources have a list of admins, editors and readers. Manage them in a separate table.

export interface AuthRequest extends Request {
  user?: IUser;
  resource?: IResource;
}



  A SUBJECT is performing an ACTION to a RESOURCE, e.g.
  rule: {
    subject: any,
    action: [read]
    resource: any
  }

  A POLICY is a set of rules and a combinator, e.g. first that permits after the first rule permits, all after all rules permit.

  A POLICY SET is a set of POLICIES

  rule: {
    desc: 'Authenticated users can create new projects'
    subject: id
    action: [create]
    resource: any
  }
  new Rule(title, ({subject?; action?; resource?}) => boolean) // permit/deny

  Policy {
    title: string;
    combinator: first | all;
    rules: Rule[];
    permit(subject, action, resource): boolean;
  }
  PolicySet {
    title: string;
    combinator: first | all
    policies: Policy[]
  }

  adminPolicy = new Policy('Admins are allowed to do everything', 'first', [
    new Rule('Admins are permitted anything', (user) => { return user.admin; })
  ])

  rule: {
    subject: id
    action: [create, read, update, delete]
    resource: {
      subject is admin or editor
    }
  }
  *
  */

  describe('/GET /unprotected/resource', () => {
    it('should be able to get unprotected resources', (done: Function) => {
      chai.request(server)
        .get('/unprotected/resource')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          done();
        });
    });

    it('should not be able to get protected resources', (done: Function) => {
      chai.request(server)
        .get('/protected/resource')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.BAD_REQUEST);
          done();
        });
    });
  });
});