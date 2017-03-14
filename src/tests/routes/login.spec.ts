process.env.NODE_ENV = 'test';

import * as chai from 'chai';
import { User, IUserModel } from '../../lib/models/user';
import { server } from '../../example/server';

chai.should();
chai.use(require('chai-http'));

describe('Login', () => {
  let adminToken: string;
  let userToken: string;
  let adminUser: IUserModel;
  let regularUser: IUserModel;

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
      const anotherUser = new User({
        name: 'Jane Doe',
        email: 'jane.doe@gmail.com',
        password: 'jane',
        verified: false,
        data: {}
      });
      adminUser.save((err, res) => regularUser.save((e, r) => anotherUser.save((e, r) => done())));
    });
  });

  describe('/POST login', () => {
    it('should not be able to login without email + pwd', (done: Function) => {
      chai.request(server)
        .post('/api/login')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.UNPROCESSABLE_ENTITY);
          done();
        });
    });

    it('should not be able to login with an incorrect password', (done: Function) => {
      chai.request(server)
        .post('/api/login')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ email: 'Erik.Vullings@GMAIL.com', password: 'pwd' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.UNAUTHORIZED);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });

    it('admins should be able to login with a correct password', (done: Function) => {
      const email = 'Erik.Vullings@GMAIL.com';
      chai.request(server)
        .post('/api/login')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ email: email, password: 'password' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.should.be.a('object');
          res.body.success.should.be.true;
          res.body.should.have.token;
          res.body.should.have.user;
          res.body.user.should.not.have.password;
          res.body.user.email.should.be.eql(email.toLowerCase());
          adminToken = res.body.token;
          done();
        });
    });

    it('should not be able to login with an incorrect token', (done: Function) => {
      chai.request(server)
        .post('/api/login')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', 'abcdef' + adminToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.UNAUTHORIZED);
          done();
        });
    });

    it('should be able to renew their token', (done: Function) => {
      chai.request(server)
        .post('/api/login')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          res.body.should.have.token;
          done();
        });
    });

    it('users should be able to login with a correct password', (done: Function) => {
      const email = 'john.smith@gmail.com';
      chai.request(server)
        .post('/api/login')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ email: email, password: 'johnny' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.should.be.a('object');
          res.body.success.should.be.true;
          res.body.should.have.token;
          res.body.should.have.user;
          res.body.user.should.not.have.password;
          res.body.user.email.should.be.eql(email.toLowerCase());
          userToken = res.body.token;
          done();
        });
    });
  });
});