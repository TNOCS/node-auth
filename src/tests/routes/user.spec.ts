process.env.NODE_ENV = 'test';

import * as chai from 'chai';
import { User, IUser, IUserModel } from '../../lib/models/user';
import { server } from '../../example/server';

chai.should();
chai.use(require('chai-http'));

describe('Users', () => {
  let adminToken: string;
  let johnnyToken: string;
  let users: IUser[] = [];
  let adminUser: IUserModel;
  let regularUser: IUserModel;
  let verifiedUser: IUserModel;

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

  describe('/GET users', () => {
    it('should return false for unauthenticated users', (done: Function) => {
      chai.request(server)
        .get('/api/users')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });

    it('should return false for authenticated but non-admin users', (done: Function) => {
      chai.request(server)
        .get('/api/users')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.UNAUTHORIZED);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });

    it('should return a list of IUser users without pwd for authenticated admins', (done: Function) => {
      chai.request(server)
        .get('/api/users')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.should.be.a('array');
          res.body.length.should.be.eql(3);
          users = res.body;
          users.forEach(u => u.hasOwnProperty('password').should.be.false);
          done();
        });
    });

    it('should return one user by id if he is admin', (done: Function) => {
      chai.request(server)
        .get('/api/users/' + users[1]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.should.be.a('object');
          const user = <IUser> res.body.user;
          user.name.should.be.eql(users[1].name);
          done();
        });
    });

    it('should return one user by id if it is himself', (done: Function) => {
      chai.request(server)
        .get('/api/users/' + users[1]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.should.be.a('object');
          const user = <IUser> res.body.user;
          user.name.should.be.eql(users[1].name);
          done();
        });
    });

    it('should not return a user by id if he is neither admin nor himself', (done: Function) => {
      chai.request(server)
        .get('/api/users/' + users[0]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.UNAUTHORIZED);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });
  });

  describe('/POST signup', () => {
    const email = 'who_the_heck.cares2@gmail.com';
    it('should allow unauthenticated users to create a user', (done: Function) => {
      chai.request(server)
        .post('/api/signup/')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ email: email, password: 'wc', name: 'Who Cares' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.CREATED);
          res.body.should.be.a('object');
          res.body.user.email.should.be.eql(email);
          done();
        });
    });

    it('should not allow you to create an existing user', (done: Function) => {
      chai.request(server)
        .post('/api/signup/')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ email: regularUser.email, password: 'wc', name: 'Who Cares' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.UNPROCESSABLE_ENTITY);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });

    it('should reject authenticated user', (done: Function) => {
      chai.request(server)
        .post('/api/signup/')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .send({ email: 'my.ohmy@email.com', password: 'wc', name: 'Who Cares' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.BAD_REQUEST);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });
  });

  describe('/POST users', () => {
    it('should return false for unauthenticated users', (done: Function) => {
      chai.request(server)
        .post('/api/users/')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ email: 'Who.Cares@GMAIL.com', password: 'wc', name: 'Who Cares' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });

    it('should return false for authenticated non-admin users', (done: Function) => {
      chai.request(server)
        .post('/api/users/')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .send({ email: 'Who.Cares@GMAIL.com', password: 'wc', name: 'Who Cares' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.METHOD_NOT_ALLOWED);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });

    it('should return true for admin users', (done: Function) => {
      const email = 'Who.Cares@GMAIL.com';
      chai.request(server)
        .post('/api/users/')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .send({ email: email, password: 'wc', name: 'Who Cares' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.CREATED);
          res.body.should.be.a('object');
          res.body.user.email.should.be.eql(email.toLowerCase());
          done();
        });
    });

    it('should not allow you to create an existing user', (done: Function) => {
      chai.request(server)
        .post('/api/users/')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .send({ email: regularUser.email, password: 'wc', name: 'Who Cares' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.UNPROCESSABLE_ENTITY);
          res.body.should.be.a('object');
          done();
        });
    });
  });

  describe('/PUT users', () => {
    it('should allow authenticated users to change their name', (done: Function) => {
      const newName = 'New name';
      chai.request(server)
        .put('/api/users/' + users[1]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .send({ name: newName })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.should.be.a('object');
          res.body.user.name.should.be.eql(newName);
          done();
        });
    });

    it('should not allow regular users to change their admin status', (done: Function) => {
      chai.request(server)
        .put('/api/users/' + users[1]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .send({ admin: true })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.should.be.a('object');
          res.body.should.not.have.admin;
          done();
        });
    });

    it('should not allow regular users to change someone else\'s name', (done: Function) => {
      const newName = 'New name';
      chai.request(server)
        .put('/api/users/' + users[2]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .send({ name: newName })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.UNAUTHORIZED);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });

    it('should allow admins to change an admin status', (done: Function) => {
      chai.request(server)
        .put('/api/users/' + users[2]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .send({ admin: true })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.should.be.a('object');
          res.body.user.admin.should.be.true;
          done();
        });
    });

    it('should allow admins to change a user\'s name', (done: Function) => {
      const name = 'Another new Name';
      chai.request(server)
        .put('/api/users/' + users[2]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .send({ name: name })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.should.be.a('object');
          res.body.user.name.should.be.eql(name);
          done();
        });
    });
  });

  describe('/GET profile', () => {
    it('should not allow unauthenticated users to get a profile', (done: Function) => {
      chai.request(server)
        .get('/api/profile')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.FORBIDDEN);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should allow users to get their profile', (done: Function) => {
      chai.request(server)
        .get('/api/profile')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.user.email.should.be.eql(users[1].email);
          done();
        });
    });

    it('should allow users to update their profile', (done: Function) => {
      const name = 'Cool Cat';
      chai.request(server)
        .put('/api/profile')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .send( { name: name })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.user.name.should.be.eql(name);
          done();
        });
    });
  });

  describe('/DELETE users', () => {
    it('should not allow you to delete a non-existing user', (done: Function) => {
      chai.request(server)
        .del('/api/users/1')
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.INTERNAL_SERVER_ERROR);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not allow you to delete an existing user as regular user', (done: Function) => {
      chai.request(server)
        .del('/api/users/' + users[2]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.UNAUTHORIZED);
          res.body.should.be.a('object');
          res.body.success.should.be.false;
          done();
        });
    });

    it('should allow you to delete an existing user as admin', (done: Function) => {
      chai.request(server)
        .del('/api/users/' + users[2]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', adminToken)
        .send({ email: regularUser.email, password: 'wc', name: 'Who Cares' })
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.NO_CONTENT);
          res.body.should.be.empty;
          done();
        });
    });

    it('should allow you to delete yourself', (done: Function) => {
      chai.request(server)
        .del('/api/users/' + users[1]._id)
        .set('content-type', 'application/x-www-form-urlencoded')
        .set('x-access-token', johnnyToken)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.NO_CONTENT);
          res.body.should.be.empty;
          done();
        });
    });

  });


});