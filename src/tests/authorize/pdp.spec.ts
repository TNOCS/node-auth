process.env.NODE_ENV = 'test';

import * as chai from 'chai';
// import { expect } from 'chai';
import { PolicyStore, initPolicyStore } from '../../lib/authorize/policy-store';
import { Decision } from '../../lib/models/decision';
import { Action } from '../../lib/models/action';
import { PolicyDecisionPoint, initPDP } from '../../lib/authorize/pdp';

chai.should();

describe('The PolicyDecisionPoint', () => {
  let policyStore: PolicyStore;
  let pdp: PolicyDecisionPoint;

  before(() => {
    policyStore = initPolicyStore('test-policies.json', [{
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
            domain: 'my_domain'
          }
        }, {
          subject: { _id: '456' },
          action: Action.Author,
          decision: Decision.Permit,
          resource: {
            domain: 'my_domain'
          }
        }]
      }]
    }]);

    pdp = initPDP(policyStore);
  });

  it('should deny permission when the policy set has no match.', () => {
    const resolvePolicy = pdp.getPolicyResolver('Second policy set');
    let permit = resolvePolicy({});
    permit.should.be.false;
    permit = resolvePolicy({ subject: { subscribed: false }});
    permit.should.be.false;
    permit = resolvePolicy({ subject: { subscribed: true }});
    permit.should.be.false;
    permit = resolvePolicy({ subject: { subscribed: true }, resource: { type: 'comment' }});
    permit.should.be.false;
  });

  it('should allow permission when the policy set permits it.', () => {
    const resolvePolicy = pdp.getPolicyResolver('Second policy set');
    let permit = resolvePolicy({ subject: { subscribed: true }, action: Action.Create, resource: { type: 'comment' }});
    permit.should.be.true;
    permit = resolvePolicy({ subject: { subscribed: true }, action: Action.Delete, resource: { type: 'comment' }});
    permit.should.be.false;
  });



});