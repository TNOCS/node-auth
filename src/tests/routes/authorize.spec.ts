process.env.NODE_ENV = 'test';
import { UNAUTHORIZED, CREATED, NO_CONTENT, OK, FORBIDDEN, NOT_MODIFIED } from 'http-status-codes';
import * as chai from 'chai';
import { User, IUser, IUserModel } from '../../lib/models/user';
import { IRule, IPrivilegeRequest } from '../../lib/models/rule';
import { Decision } from '../../lib/models/decision';
import { Action } from '../../lib/models//action';
import { server } from '../../example/server';

chai.should();
chai.use(require('chai-http'));

/**
 * The authorization route allows users to get their rights based on their profile.
 * It is also used to add or change authorization rules.
 */
describe('Authorizations route', () => {
  let adminToken: string;
  let johnnyToken: string;
  let janeToken: string;
  let adminUser: IUserModel;
  let regularUser: IUserModel;
  let verifiedUser: IUserModel;
  let users: IUser[] = [];
  let newRule: IRule;

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
        subscribed: true,
        verified: true,
        admin: true,
        data: {}
      });
      regularUser = new User({
        name: 'John Smith',
        email: 'john.smith@gmail.com',
        password: 'johnny',
        verified: true,
        subscribed: true,
        data: {}
      });
      verifiedUser = new User({
        name: 'Jane Doe',
        email: 'jane.doe@gmail.com',
        password: 'jane',
        subscribed: true,
        verified: true,
        data: {}
      });
      adminUser.save((err, r: IUserModel) => {
        users.push(<IUser>r.toJSON());
        regularUser.save((e, r: IUserModel) => {
          users.push(<IUser>r.toJSON());
          verifiedUser.save((e, r: IUserModel) => {
            users.push(<IUser>r.toJSON());
            chai.request(server)
              .post('/api/login')
              .set('content-type', 'application/x-www-form-urlencoded')
              .send({ email: 'Erik.Vullings@GMAIL.com', password: 'password' })
              .end((err, res) => {
                adminToken = res.body.token;
                chai.request(server)
                  .post('/api/login')
                  .set('content-type', 'application/x-www-form-urlencoded')
                  .send({ email: 'john.smith@gmail.com', password: 'johnny' })
                  .end((err, res) => {
                    johnnyToken = res.body.token;
                    chai.request(server)
                      .post('/api/login')
                      .set('content-type', 'application/x-www-form-urlencoded')
                      .send({ email: 'jane.doe@gmail.com', password: 'jane' })
                      .end((err, res) => {
                        janeToken = res.body.token;
                        done();
                      });
                  });
              });
          });
        });
      });
    });
  });

  describe('/GET /api/authorizations', () => {
    it('should block anonymous users', (done: Function) => {
      chai.request(server)
        .get('/api/authorizations')
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should return privileges for admins', (done: Function) => {
      chai.request(server)
        .get('/api/authorizations')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(OK);
          res.body.success.should.be.true;
          const rules: IRule[] = res.body.message;
          rules[0].subject.admin.should.be.true;
          rules.length.should.be.eql(4);
          done();
        });
    });
  });

  describe('/POST /api/authorizations', () => {
    it('should block anonymous users', (done: Function) => {
      chai.request(server)
        .post('/api/authorizations')
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should block users without a message body', (done: Function) => {
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should block users with an incorrect message body', (done: Function) => {
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .send({ whatever: true, interests: 'you' })
        .end((err, res) => {
          res.should.have.status(FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should allow users with correct requests', (done: Function) => {
      const newPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        subject: {
          email: 'jane.doe@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: 'johnny_article'
        },
        decision: Decision.Permit,
      };
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .send(newPrivilege)
        .end((err, res) => {
          res.should.have.status(CREATED);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should allow users with correct requests WITHOUT specifying the policy set to use', (done: Function) => {
      const newPrivilege: IPrivilegeRequest = {
        subject: {
          email: 'jonas.doe@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: 'johnny_article'
        },
        decision: Decision.Permit,
      };
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .send(newPrivilege)
        .end((err, res) => {
          res.should.have.status(CREATED);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should not create new rules when you already have permission', (done: Function) => {
      const newPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        subject: {
          email: 'monty.python@gmail.com'
        },
        action: Action.Manage,
        resource: {
          id: 'johnny_article'
        },
        decision: Decision.Permit,
      };
      const unneededPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        subject: {
          email: 'monty.python@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: 'johnny_article'
        },
        decision: Decision.Permit,
      };
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', johnnyToken)
        .send(newPrivilege)
        .end((err, res) => {
          res.should.have.status(CREATED);
          res.body.success.should.be.true;
          chai.request(server)
            .post('/api/authorizations')
            .set('content-type', 'application/json')
            .set('x-access-token', johnnyToken)
            .send(unneededPrivilege)
            .end((err, res) => {
              res.should.have.status(NOT_MODIFIED);
              done();
            });
        });
    });

    it('should update existing rules when you INCREASE a privilege', (done: Function) => {
      const firstPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        subject: {
          email: 'flying.circus@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: 'monty_article'
        },
        decision: Decision.Permit
      };
      const secondPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        subject: {
          email: 'flying.circus@gmail.com'
        },
        action: Action.Update,
        resource: {
          id: 'monty_article'
        },
        decision: Decision.Permit
      };
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', johnnyToken)
        .send(firstPrivilege)
        .end((err, res) => {
          res.should.have.status(CREATED);
          res.body.success.should.be.true;
          chai.request(server)
            .post('/api/authorizations')
            .set('content-type', 'application/json')
            .set('x-access-token', johnnyToken)
            .send(secondPrivilege)
            .end((err, res) => {
              res.should.have.status(CREATED);
              res.body.success.should.be.true;
              res.body.message.action.should.eql(Action.Read | Action.Update);
              done();
            });
        });
    });

    it('should update existing rules when you DECREASE a privilege', (done: Function) => {
      const firstPrivilege: IPrivilegeRequest = {
        subject: {
          email: 'fawlty.towers@gmail.com'
        },
        action: Action.Read | Action.Update,
        resource: {
          id: 'monty_article'
        },
        decision: Decision.Permit
      };
      const deletedPrivilege: IPrivilegeRequest = {
        subject: {
          email: 'fawlty.towers@gmail.com'
        },
        action: Action.Update,
        resource: {
          id: 'monty_article'
        },
        decision: Decision.Deny // <= Here we remove the privilege
      };
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', johnnyToken)
        .send(firstPrivilege)
        .end((err, res) => {
          res.should.have.status(CREATED);
          res.body.success.should.be.true;
          res.body.message.action.should.eql(Action.Read | Action.Update);
          chai.request(server)
            .post('/api/authorizations')
            .set('content-type', 'application/json')
            .set('x-access-token', johnnyToken)
            .send(deletedPrivilege)
            .end((err, res) => {
              res.should.have.status(CREATED);
              res.body.success.should.be.true;
              res.body.message.action.should.eql(Action.Read);
              done();
            });
        });
    });

    it('should block users with unknown policy sets', (done: Function) => {
      const newPrivilege: IPrivilegeRequest = {
        policySet: 'Whatever policy set you can think of',
        subject: {
          email: 'jane.doe@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: '456_article'
        },
        decision: Decision.Permit,
      };
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', johnnyToken)
        .send(newPrivilege)
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should block users with unknown policy', (done: Function) => {
      const newPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        policy: 'pick one',
        subject: {
          email: 'jane.doe@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: '456_article'
        },
        decision: Decision.Permit,
      };
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', johnnyToken)
        .send(newPrivilege)
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should block users with unknown numeric policy', (done: Function) => {
      const newPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        policy: 15,
        subject: {
          email: 'jane.doe@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: '456_article'
        },
        decision: Decision.Permit,
      };
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', johnnyToken)
        .send(newPrivilege)
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should block users with insufficient rights', (done: Function) => {
      const newPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        subject: {
          email: 'jane.doe@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: '456_article'
        },
        decision: Decision.Permit,
      };
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', johnnyToken)
        .send(newPrivilege)
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should allow admins to change permissions', (done: Function) => {
      const newPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        subject: {
          email: 'jane.doe@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: '456_article'
        },
        decision: Decision.Permit,
      };
      chai.request(server)
        .post('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', adminToken)
        .send(newPrivilege)
        .end((err, res) => {
          res.should.have.status(CREATED);
          res.body.success.should.be.true;
          newRule = res.body.message;
          done();
        });
    });
  });

  describe('/PUT /api/authorizations', () => {
    it('should block anonymous users', (done: Function) => {
      chai.request(server)
        .put('/api/authorizations')
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should block users without body', (done: Function) => {
      chai.request(server)
        .put('/api/authorizations')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should block users with incorrect request, i.e. missing metadata', (done: Function) => {
      const newPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        subject: {
          email: 'janette.doe@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: 'johnny_article'
        },
        decision: Decision.Permit,
      };
      chai.request(server)
        .put('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', adminToken)
        .send(newPrivilege)
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should allow users with correct request and permissions', (done: Function) => {
      const newEmail = 'janette.doe@gmail.com';
      newRule.subject.email = newEmail;
      chai.request(server)
        .put('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', adminToken)
        .send(newRule)
        .end((err, res) => {
          res.should.have.status(OK);
          res.body.success.should.be.true;
          newRule = res.body.message;
          newRule.subject.email.should.be.eql(newEmail);
          done();
        });
    });
  });


  describe('/DELETE /api/authorizations', () => {
    it('should block anonymous users', (done: Function) => {
      chai.request(server)
        .del('/api/authorizations')
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should block users without body', (done: Function) => {
      chai.request(server)
        .del('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should block users with incorrect request, i.e. missing metadata', (done: Function) => {
      const newPrivilege: IPrivilegeRequest = {
        policySet: 'Main policy set',
        subject: {
          email: 'janette.doe@gmail.com'
        },
        action: Action.Read,
        resource: {
          id: 'johnny_article'
        },
        decision: Decision.Permit,
      };
      chai.request(server)
        .del('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', adminToken)
        .send(newPrivilege)
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should allow users with correct request and permissions', (done: Function) => {
      chai.request(server)
        .del('/api/authorizations')
        .set('content-type', 'application/json')
        .set('x-access-token', adminToken)
        .send(newRule)
        .end((err, res) => {
          res.should.have.status(NO_CONTENT);
          done();
        });
    });
  });

  it('should return all privileges for authenticated users', (done: Function) => {
    chai.request(server)
      .get('/api/authorizations')
      .set('content-type', 'application/json')
      .set('x-access-token', johnnyToken)
      .end((err, res) => {
        res.should.have.status(OK);
        res.body.success.should.be.true;
        const rules: IRule[] = res.body.message;
        rules.length.should.be.eql(6);
        done();
      });
  });

  describe('/GET /api/authorizations/resources/:resourceID', () => {

    it('should return a resource\'s permissions to subjects with Manage privileges for that resource', () => {
      const id = 'star_wars';
      chai.request(server)
        .get(`/api/authorizations/resources/${id}`)
        .set('content-type', 'application/json')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(OK);
          res.body.success.should.be.true;
          const rules: IRule[] = res.body.message;
          rules.length.should.be.eql(3);
        });
    });

    it('should return a resource\'s permissions to admins', () => {
      const id = 'star_wars';
      chai.request(server)
        .get(`/api/authorizations/resources/${id}`)
        .set('content-type', 'application/json')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(OK);
          res.body.success.should.be.true;
          const rules: IRule[] = res.body.message;
          rules.length.should.be.eql(3);
        });
    });

    it('should NOT return a resource\'s permissions to subjects who do not have Manage privileges for that resource', () => {
      const id = 'star_wars';
      chai.request(server)
        .get(`/api/authorizations/resources/${id}`)
        .set('content-type', 'application/json')
        .set('x-access-token', janeToken)
        .end((err, res) => {
          res.should.have.status(UNAUTHORIZED);
          res.body.success.should.be.false;
        });
    });

  });
});
