process.env.NODE_ENV = 'test';

import * as chai from 'chai';
import { expect } from 'chai';
import * as PolicyStore from '../../lib/authorize/policy-store';
import { Decision } from '../../lib/models/decision';
import { Action } from '../../lib/models/action';

chai.should();

describe('The PolicyStore', () => {
  let policyStore: PolicyStore.PolicyStore;

  before(() => {
    policyStore = PolicyStore.init('test-policies.json', [{
      name: 'First policy set',
      combinator: 'first',
      policies: [{
        name: 'First policy',
        combinator: 'first',
        rules: [{
          subject: { admin: true },
          decision: Decision.permit
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
          action: Action.all,
          decision: Decision.permit
        }]
      }, {
        name: 'rbac',
        combinator: 'first',
        rules: [{
          subject: { role: 'editor' },
          action: Action.update,
          decision: Decision.permit,
          resource: {
            domain: 'articles'
          }
        }, {
          subject: { _id: '123' },
          action: Action.manage,
          decision: Decision.permit,
          resource: {
            editors: ['123']
          }
        }, {
          subject: { _id: '456' },
          action: Action.update,
          decision: Decision.permit,
          resource: {
            domain: 'project123'
          }
        }]
      }]
    }]);
  });

  it('should store policy sets', () => {
    const policySets = policyStore.getPolicySets();
    policySets.length.should.be.eql(2);
  });

  it('should store policies', () => {
    const policySets = policyStore.getPolicySets();
    let policySet = policyStore.getPolicySet(policySets[0].name);
    policySet.policies.length.should.be.eql(1);
    policySet = policyStore.getPolicySet(policySets[1].name);
    policySet.policies.length.should.be.eql(2);
  });

  it('should store rules', () => {
    const policySets = policyStore.getPolicySets();
    let policySet = policyStore.getPolicySet(policySets[0].name);
    let rules = policyStore.getPolicyRules(policySet.policies[0].name);
    rules.length.should.be.eql(1);
    policySet = policyStore.getPolicySet(policySets[1].name);
    rules = policyStore.getPolicyRules(policySet.policies[0].name);
    rules.length.should.be.eql(1);
    rules = policyStore.getPolicyRules(policySet.policies[1].name);
    rules.length.should.be.eql(3);
  });

  it('should retrieve relevant rules', () => {
    const policySets = policyStore.getPolicySets();
    let policySet = policyStore.getPolicySet(policySets[0].name);
    let rules = policyStore.getRelevantPolicyRules(policySet.policies[0].name, { subject: { admin: true } });
    rules.length.should.be.eql(1);
    rules = policyStore.getRelevantPolicyRules(policySet.policies[0].name, { subject: { admin: false } });
    rules.length.should.be.eql(0);
    rules = policyStore.getRelevantPolicyRules(policySet.policies[0].name, { resource: { domain: '*' } });
    rules.length.should.be.eql(0);

    policySet = policyStore.getPolicySet(policySets[1].name);
    rules = policyStore.getRelevantPolicyRules(policySet.policies[1].name, { subject: { admin: true } });
    rules.length.should.be.eql(0);
    rules = policyStore.getRelevantPolicyRules(policySet.policies[1].name, { subject: { _id: '12345' } });
    rules.length.should.be.eql(0);
    rules = policyStore.getRelevantPolicyRules(policySet.policies[1].name, { subject: { _id: '123' } });
    rules.length.should.be.eql(1);
    rules = policyStore.getRelevantPolicyRules(policySet.policies[1].name, { subject: { _id: '123' }, resource: { domain: 'articles' } });
    rules.length.should.be.eql(2);
    rules = policyStore.getRelevantPolicyRules(policySet.policies[1].name, { subject: { _id: '123' }, resource: { domain: 'project123' } });
    rules.length.should.be.eql(2);
    rules = policyStore.getRelevantPolicyRules(policySet.policies[1].name, { subject: { _id: '12345' }, resource: { domain: 'project123' } });
    rules.length.should.be.eql(1);
  });

  it('should insert new rules', () => {
    const policySets = policyStore.getPolicySets();
    let policySet = policyStore.getPolicySet(policySets[1].name);
    const policyName = policySet.policies[1].name;
    policyStore.addPolicyRule(policyName, { subject: { _id: '123456' }, decision: Decision.permit });
    policyStore.addPolicyRule(policyName, { subject: { role: 'moderator' }, decision: Decision.permit });
    policyStore.addPolicyRule(policyName, { subject: { email: 'john.doe@gmail.com' }, decision: Decision.permit });
    let rules = policyStore.getRelevantPolicyRules(policyName, { subject: { _id: '123456' } });
    rules.length.should.be.eql(1);
    rules = policyStore.getRelevantPolicyRules(policyName, { subject: { role: 'moderator' } });
    rules.length.should.be.eql(1);
    rules = policyStore.getRelevantPolicyRules(policyName, { subject: { email: 'john.doe@gmail.com' } });
    rules.length.should.be.eql(1);
  });

  it('should persist itself to disk', done => {
    policyStore.save(err => {
      expect(err).to.be.null;
      done();
    });
  });

});