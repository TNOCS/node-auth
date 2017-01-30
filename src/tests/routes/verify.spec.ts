process.env.NODE_ENV = 'test';

import { User, IUser, IUserModel } from '../../lib/models/user';
import * as chai from 'chai';
import * as server from '../../example/server';
import * as bcrypt from 'bcrypt';

chai.should();
chai.use(require('chai-http'));

describe('Verify route', () => {
  let adminUser: IUserModel;
  let regularUser: IUserModel;
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
      const anotherUser = new User({
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
          anotherUser.save((e, r: IUserModel) => {
            users.push(<IUser>r.toJSON());
            done();
          });
        });
      });
    });
  });

  describe('/GET /api/users/activate?email=[EMAIL]', () => {
    it('should not be able to resend an email without specifying the email', (done: Function) => {
      chai.request(server)
        .get('/api/activate')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.BAD_REQUEST);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to resend an activation email with an invalid email', (done: Function) => {
      chai.request(server)
        .get('/api/activate?email=unknown')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.BAD_REQUEST);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to resend an activation email with an unknown email', (done: Function) => {
      chai.request(server)
        .get('/api/activate?email=unknown@gmail.com')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.BAD_REQUEST);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should be able to resend an activation email with an known email for an unverified user', (done: Function) => {
      chai.request(server)
        .get('/api/activate?email=' + users[1].email)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.OK);
          res.body.success.should.be.true;
          done();
        });
    });

    it('should not be able to resend an activation email with a known VERIFIED email', (done: Function) => {
      chai.request(server)
        .get('/api/activate?email=' + users[2].email)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.BAD_REQUEST);
          res.body.success.should.be.false;
          done();
        });
    });
  });

  describe('/GET /api/users/activate/:id?t=[TOKEN]', () => {
    it('should not be able to activate an account without id', (done: Function) => {
      chai.request(server)
        .get('/api/activate')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.BAD_REQUEST);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to activate an account with an invalid id', (done: Function) => {
      chai.request(server)
        .get('/api/activate/12345678?t=1234')
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.BAD_REQUEST);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to activate an account without token', (done: Function) => {
      const id = users[1]._id.toString();
      chai.request(server)
        .get(`/api/activate/${id}`)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.BAD_REQUEST);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should not be able to activate an account with an incorrect token', (done: Function) => {
      const id = users[1]._id.toString();
      const token = '123';
      chai.request(server)
        .get(`/api/activate/${id}?t=${token}`)
        .end((err, res) => {
          res.should.have.status(HTTPStatusCodes.BAD_REQUEST);
          res.body.success.should.be.false;
          done();
        });
    });

    it('should be able to activate an account with a correct token', (done: Function) => {
      const id = users[1]._id.toString();
      bcrypt.hash(users[1].email, 10, (err, hash) => {
        const token = hash;
        chai.request(server)
          .get(`/api/activate/${id}?t=${token}`)
          .end((err, res) => {
            res.should.have.status(HTTPStatusCodes.OK);
            res.body.success.should.be.true;
            User.findById( id, (err, user) => {
              const json = <IUser>user.toJSON();
              json.verified.should.be.true;
              done();
            });
          });
      });
    });
  });
});