// import * as proxyquire from 'proxyquire';
// process.env.NODE_ENV = 'test';

// import * as sinon from 'sinon';
// import { expect } from 'chai';
// import * as mongooseMock from '../mocks/mongooseMock';

// describe('User', () => {
//   let User;

//   before(() => {
//     User = proxyquire('../../models/user', { 'mongoose': mongooseMock }).User;
//   });

//   it('should find a user by id', () => {
//     let callback = sinon.spy();
//     User.findById('1', callback);
//     expect(User.findById.calledOnce).to.be.true;
//   });

//   it('should be saved', () => {
//     let callback = sinon.spy();
//     const user = new User({
//       id: '1',
//       name: 'Hello World',
//       email: 'hello@world.com',
//       password: 'password',
//       verified: false,
//       admin: false,
//       data: {}
//     });
//     user.save(callback);
//     expect(user.save.calledOnce).to.be.true;
//   });

// });