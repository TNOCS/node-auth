process.env.NODE_ENV = 'test';

import { User, IUser, IUserModel } from '../lib/models/user';
import * as chai from 'chai';
import { server } from '../example/server';

chai.should();
chai.use(require('chai-http'));

describe('Authorize route', () => {
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
   */

  describe('/GET /unprotected/resource', () => {
    it('should be able to get unprotected resources anonymously', (done: Function) => {
      chai.request(server)
        .get('/unprotected/resource')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should be able to get unprotected resources as a user', (done: Function) => {
      chai.request(server)
        .get('/unprotected/resource')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });
  });

  describe('/GET /protected/resource', () => {
    it('should be able to get protected PUBLIC resources anonymously', (done: Function) => {
      chai.request(server)
        .get('/protected/public_article')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should be able to get protected PUBLIC resources as a user', (done: Function) => {
      chai.request(server)
        .get('/protected/public_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should not be able to get protected resources anonymously', (done: Function) => {
      chai.request(server)
        .get('/protected/protected_article')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to get protected resources as a user', (done: Function) => {
      chai.request(server)
        .get('/protected/456_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should be able to get protected resources as an admin', (done: Function) => {
      chai.request(server)
        .get('/protected/456_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should be able to get protected resources as an owner', (done: Function) => {
      chai.request(server)
        .get('/protected/johnny_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });
  });

  describe('/PUT /protected/resource', () => {
    it('should not be able to update protected PUBLIC resources anonymously', (done: Function) => {
      chai.request(server)
        .put('/protected/public_article')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to update protected PUBLIC resources as a user', (done: Function) => {
      chai.request(server)
        .put('/protected/public_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to update protected resources anonymously', (done: Function) => {
      chai.request(server)
        .put('/protected/protected_article')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to update protected resources as a user', (done: Function) => {
      chai.request(server)
        .put('/protected/456_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should be able to update protected resources as an admin', (done: Function) => {
      chai.request(server)
        .put('/protected/456_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should be able to update protected resources as an owner', (done: Function) => {
      chai.request(server)
        .put('/protected/johnny_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });
  });

  describe('/POST /protected/resource', () => {
    it('should not be able to create protected PUBLIC resources anonymously', (done: Function) => {
      chai.request(server)
        .post('/protected/public_article')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should be able to create protected PUBLIC resources as a user', (done: Function) => {
      chai.request(server)
        .post('/protected/public_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should not be able to create protected resources anonymously', (done: Function) => {
      chai.request(server)
        .post('/protected/protected_article')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should be able to create protected resources as a user', (done: Function) => {
      chai.request(server)
        .post('/protected/456_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should be able to create protected resources as an admin', (done: Function) => {
      chai.request(server)
        .post('/protected/456_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should be able to create EXISTING resources as an owner, i.e. we do not check for the existence of resources', (done: Function) => {
      chai.request(server)
        .post('/protected/johnny_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });
  });


  describe('/DELETE /protected/resource', () => {
    it('should not be able to delete protected PUBLIC resources anonymously', (done: Function) => {
      chai.request(server)
        .del('/protected/public_article')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to delete protected PUBLIC resources as a user', (done: Function) => {
      chai.request(server)
        .del('/protected/public_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to delete protected resources anonymously', (done: Function) => {
      chai.request(server)
        .del('/protected/protected_article')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to delete protected resources as a user', (done: Function) => {
      chai.request(server)
        .del('/protected/456_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should be able to delete protected resources as an admin', (done: Function) => {
      chai.request(server)
        .del('/protected/456_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should be able to delete owned resources as an owner', (done: Function) => {
      chai.request(server)
        .del('/protected/johnny_article')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });
  });


});