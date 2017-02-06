process.env.NODE_ENV = 'test';

import { User, IUser, IUserModel } from '../../lib/models/user';
import { Rule } from '../../lib/models/rule';
import * as chai from 'chai';
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
                    done();
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
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should return privileges for authenticated users', (done: Function) => {
      chai.request(server)
        .get('/api/authorizations')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          const rules: Rule[] = res.body.message;
          rules.length.should.be.eql(4);
          done();
        });
    });

    it('should return privileges for admins', (done: Function) => {
      chai.request(server)
        .get('/api/authorizations')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          const rules: Rule[] = res.body.message;
          rules[0].subject.admin.should.be.true;
          rules.length.should.be.eql(4);
          done();
        });
    });
  });

});