process.env.NODE_ENV = 'test';

import * as chai from 'chai';
import * as sinon from 'sinon';
import { Request } from 'express';
import { PolicyStore, PolicyStoreFactory } from '../../lib/authorize/policy-store';
import { PermissionRequest } from '../../lib/models/decision';
import { Decision } from '../../lib/models/decision';
import { Action } from '../../lib/models/action';
import { PolicyEnforcementPoint, initPEP } from '../../lib/authorize/pep';

chai.should();

describe('The PolicyEnforcementPoint', () => {
  let policyStore: PolicyStore;
  let pep: PolicyEnforcementPoint;
  let server: sinon.SinonFakeServer;

  setup(() => {
    server = sinon.fakeServer.create();
  });

  teardown(() => {
    server.restore();
  });

  before(() => {
    policyStore = PolicyStoreFactory('test-policies.json', [{
      name: 'First policy set',
      combinator: 'first',
      policies: [{
        name: 'First policy',
        combinator: 'first',
        rules: [{
          subject: { admin: true },
          decision: Decision.Permit
        }]
      }]
    }, {
      name: 'Second policy set',
      combinator: 'first',
      policies: [{
        name: 'admins rule',
        combinator: 'first',
        rules: [{
          subject: { admin: true },
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
          subject: { _id: '123' },
          action: Action.Manage,
          decision: Decision.Permit,
          resource: {
            articleID: ['123_article']
          }
        }, {
          subject: { _id: '456' },
          action: Action.Author,
          decision: Decision.Permit,
          resource: {
            articleID: ['456_article']
          }
        }]
      }]
    }]);

    pep = initPEP(policyStore);
  });


  it('should allow admins to edit an article using the default permission request object.', () => {
    const policySets = policyStore.getPolicySets();
    const policyEnforcer = pep.getPolicyEnforcer(policySets[1].name);
    const responseSpy = sinon.spy();
    const response = {
      status(id?) {
        return {
          json: responseSpy
        };
      }
    };
    // const stub = sinon.stub(response, 'status');
    const next = sinon.spy();
    policyEnforcer(<Request>{ method: 'GET' }, <any>response, <any>next);
    next.calledOnce.should.be.false;
    responseSpy.calledOnce.should.be.true;

    next.reset();
    responseSpy.reset();
    policyEnforcer(<any>{ method: 'GET', user: { admin: true } }, <any>response, <any>next);
    next.calledOnce.should.be.true;
    responseSpy.calledOnce.should.be.false;

    next.reset();
    responseSpy.reset();
    policyEnforcer(<any>{ method: 'DELETE', user: { admin: true } }, <any>response, <any>next);
    next.calledOnce.should.be.true;
    responseSpy.calledOnce.should.be.false;

    next.reset();
    responseSpy.reset();
    policyEnforcer(<any>{ method: 'DELETE', user: { admin: true }, params: { articleID: '123_article' } }, <any>response, <any>next);
    next.calledOnce.should.be.true;
    responseSpy.calledOnce.should.be.false;
  });

  it('should allow authors to edit their own article only.', () => {
    const policySets = policyStore.getPolicySets();
    const policyEnforcer = pep.getPolicyEnforcer(policySets[1].name);
    const blocked = sinon.spy();
    const response = {
      status(id?) {
        return {
          json: blocked
        };
      }
    };
    // const stub = sinon.stub(response, 'status');
    const passed = sinon.spy();
    policyEnforcer(<Request>{ method: 'GET' }, <any>response, <any>passed);
    passed.calledOnce.should.be.false;
    blocked.calledOnce.should.be.true;

    passed.reset();
    blocked.reset();
    policyEnforcer(<any>{ method: 'GET', user: { _id: '123' } }, <any>response, <any>passed);
    passed.calledOnce.should.be.false;
    blocked.calledOnce.should.be.true;

    passed.reset();
    blocked.reset();
    policyEnforcer(<any>{ method: 'GET', user: { _id: '123' }, params: { articleID: '123_article' } }, <any>response, <any>passed);
    passed.calledOnce.should.be.true;
    blocked.calledOnce.should.be.false;

    passed.reset();
    blocked.reset();
    policyEnforcer(<any>{ method: 'PUT', user: { _id: '123' }, params: { articleID: '123_article' } }, <any>response, <any>passed);
    passed.calledOnce.should.be.true;
    blocked.calledOnce.should.be.false;

    passed.reset();
    blocked.reset();
    policyEnforcer(<any>{ method: 'PUT', user: { _id: '123' }, params: { articleID: ['123_article'] } }, <any>response, <any>passed);
    passed.calledOnce.should.be.true;
    blocked.calledOnce.should.be.false;

    passed.reset();
    blocked.reset();
    policyEnforcer(<any>{ method: 'PUT', user: { _id: '456' }, params: { articleID: '123_article' } }, <any>response, <any>passed);
    passed.calledOnce.should.be.false;
    blocked.calledOnce.should.be.true;
  });

  it('should allow authors to limit their requests.', () => {
    const policySets = policyStore.getPolicySets();
    const policyEnforcer = pep.getPolicyEnforcer(policySets[1].name);
    const blocked = sinon.spy();
    const response = {
      status(id?) {
        return {
          json: blocked
        };
      }
    };
    // const stub = sinon.stub(response, 'status');
    const passed = sinon.spy();
    passed.reset();
    blocked.reset();
    policyEnforcer(<any>{ method: 'PUT', user: { _id: '456' }, params: { articleID: ['123_article', '456_article'] } }, <any>response, <any>passed);
    passed.calledOnce.should.be.false;
    blocked.calledOnce.should.be.true;
  });

  it('should allow you to add custom properties to your PUT request.', () => {
    const policySets = policyStore.getPolicySets();
    const policyEnforcer = pep.getPolicyEnforcer(policySets[1].name, {
      subject: { subscribed: true },
      action: Action.Update,
      resource: { articleID: '123_article' }
    });
    const blocked = sinon.spy();
    const response = {
      status(id?) {
        return {
          json: blocked
        };
      }
    };
    const passed = sinon.spy();
    policyEnforcer(<any>{ method: 'PUT', user: { _id: '123' } }, <any>response, <any>passed);
    passed.calledOnce.should.be.true;
    blocked.calledOnce.should.be.false;
  });

  it('should allow you to add custom properties to your POST request.', () => {
    const policySets = policyStore.getPolicySets();
    const policyEnforcer = pep.getPolicyEnforcer(policySets[1].name, {
      subject: { subscribed: true },
      resource: { type: 'article' }
    });
    const blocked = sinon.spy();
    const response = {
      status(id?) {
        return {
          json: blocked
        };
      }
    };
    const passed = sinon.spy();
    policyEnforcer(<any>{ method: 'POST', user: { _id: '123' } }, <any>response, <any>passed);
    passed.calledOnce.should.be.true;
    blocked.calledOnce.should.be.false;
  });

  it('should allow you to specify your own request generating function.', () => {
    const policySets = policyStore.getPolicySets();
    const policyEnforcer = pep.getPolicyEnforcer(policySets[1].name, null, (req) => {
      return <PermissionRequest>{ subject: { _id: '123' }, action: Action.Delete, resource: { articleID: '123_article' } };
    });
    const blocked = sinon.spy();
    const response = {
      status(id?) {
        return {
          json: blocked
        };
      }
    };
    // const stub = sinon.stub(response, 'status');
    const passed = sinon.spy();
    policyEnforcer(<Request>{}, <any>response, <any>passed);
    passed.calledOnce.should.be.true;
    blocked.calledOnce.should.be.false;
  });
});
