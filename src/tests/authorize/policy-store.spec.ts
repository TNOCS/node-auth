process.env.NODE_ENV = 'test';

import * as chai from 'chai';
import { expect } from 'chai';
import { IPolicyStore, PolicyStoreFactory } from '../../lib/authorize/policy-store';
import { Decision } from '../../lib/models/decision';
import { Action } from '../../lib/models/action';

chai.should();

describe('The PolicyStore', () => {
  let policyStore: IPolicyStore;

  before(done => {
    const callback = (err: Error, ps: IPolicyStore) => {
      if (err) { throw err; }
      policyStore = ps;
      done();
    };
    PolicyStoreFactory('test-policies.json', callback, [{
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
          action: Action.All,
          decision: Decision.Permit
        }]
      }, {
        name: 'rbac',
        combinator: 'first',
        rules: [{
          subject: { role: ['editor'] },
          action: Action.Update,
          decision: Decision.Permit,
          resource: {
            domain: 'articles'
          }
        }, {
          subject: { _id: '123' },
          action: Action.Manage,
          decision: Decision.Permit,
          resource: {
            editors: '123'
          }
        }, {
          subject: { _id: '456' },
          action: Action.Update,
          decision: Decision.Permit,
          resource: {
            domain: 'project123'
          }
        }, {
          subject: { role: ['author', 'member'] },
          action: Action.Update,
          decision: Decision.Permit,
          resource: {
            domain: 'project123'
          }
        }, {
          subject: { role: ['author', 'member'] },
          action: Action.Update,
          decision: Decision.Permit,
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
    rules.length.should.be.eql(5);
  });

  it('should retrieve relevant unique rules', () => {
    const policySets = policyStore.getPolicySets();
    let policySet = policyStore.getPolicySet(policySets[0].name);
    let ruleResolver = policyStore.getRuleResolver(policySet.policies[0].name);
    let rules = ruleResolver({ subject: { admin: true } });
    rules.length.should.be.eql(1);
    rules = ruleResolver({ subject: { admin: false } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ resource: { domain: '*' } });
    rules.length.should.be.eql(0);

    policySet = policyStore.getPolicySet(policySets[1].name);
    ruleResolver = policyStore.getRuleResolver(policySet.policies[1].name);
    rules = ruleResolver({ subject: { admin: true } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { _id: '12345' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { _id: '123' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { _id: '123' }, resource: { editors: '123' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { _id: '123' }, action: Action.Create, resource: { editors: '123' } });
    rules.length.should.be.eql(1);
    rules = ruleResolver({ subject: { _id: '123' }, resource: { domain: 'articles' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { _id: '123' }, resource: { domain: 'project123' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { _id: '12345' }, resource: { domain: 'project123' } });
    rules.length.should.be.eql(0);
  });

  it('should get partial action matches', () => {
    const policySets = policyStore.getPolicySets();
    let policySet = policyStore.getPolicySet(policySets[1].name);
    let ruleResolver = policyStore.getRuleResolver(policySet.policies[1].name);
    let rules = ruleResolver({ subject: { admin: true } });
    rules = ruleResolver({ subject: { _id: '456' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { _id: '456' }, resource: { domain: 'project123' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { _id: '456' }, action: Action.Update, resource: { domain: 'project123' } });
    rules.length.should.be.eql(1);
    rules = ruleResolver({ subject: { _id: '456' }, action: Action.Delete, resource: { domain: 'project123' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { _id: '456' }, action: Action.Manage, resource: { domain: 'project123' } });
    rules.length.should.be.eql(0); // NOTE: we ask for more privileges than we are allowed to have, e.g. Action.Manage > Action.Update, so do not permit it.
  });

  it('should add new rules', () => {
    const policySets = policyStore.getPolicySets();
    let policySet = policyStore.getPolicySet(policySets[1].name);
    const policyName = policySet.policies[1].name;
    const policyEditor = policyStore.getPolicyEditor(policyName);
    const ruleResolver = policyStore.getRuleResolver(policyName);
    policyEditor('add', { subject: { _id: '123456' }, decision: Decision.Permit });
    policyEditor('add', { subject: { role: ['moderator'] }, decision: Decision.Permit });
    policyEditor('add', { subject: { email: 'john.doe@gmail.com' }, decision: Decision.Permit });
    let rules = ruleResolver({ subject: { _id: '123456' } });
    rules.length.should.be.eql(1);
    rules = ruleResolver({ subject: { role: ['moderator'] } });
    rules.length.should.be.eql(1);
    rules = ruleResolver({ subject: { email: 'john.doe@gmail.com' } });
    rules.length.should.be.eql(1);
  });

  it('should delete existing rules, i.e. rules from the database', () => {
    const policySets = policyStore.getPolicySets();
    let policySet = policyStore.getPolicySet(policySets[1].name);
    const policyName = policySet.policies[1].name;
    const policyEditor = policyStore.getPolicyEditor(policyName);
    const ruleResolver = policyStore.getRuleResolver(policyName);
    const rule1 = policyEditor('add', { subject: { _id: '654321' }, decision: Decision.Permit });
    const rule2 = policyEditor('add', { subject: { role: ['moderator2'] }, decision: Decision.Permit });
    const rule3 = policyEditor('add', { subject: { email: 'jane.doe@gmail.com' }, decision: Decision.Permit });
    policyEditor('delete', rule1.rule );
    policyEditor('delete', rule2.rule );
    policyEditor('delete', rule3.rule );
    let rules = ruleResolver({ subject: { _id: '654321' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { role: ['moderator2'] } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { email: 'jane.doe@gmail.com' } });
    rules.length.should.be.eql(0);
  });

  it('should update existing rules, i.e. rules from the database', () => {
    const policySets = policyStore.getPolicySets();
    const policySet = policyStore.getPolicySet(policySets[1].name);
    const policyName = policySet.policies[1].name;
    const policyEditor = policyStore.getPolicyEditor(policyName);
    const ruleResolver = policyStore.getRuleResolver(policyName);
    const rule1 = policyEditor('add', { subject: { _id: '654321' }, decision: Decision.Permit }).rule;
    rule1.subject._id = '123';
    const rule2 = policyEditor('add', { subject: { role: ['moderator2'] }, decision: Decision.Permit }).rule;
    rule2.resource = { domain: 'hello' };
    const rule3 = policyEditor('add', { subject: { email: 'janet.doe@gmail.com' }, decision: Decision.Permit }).rule;
    rule3.subject.admin = true;
    policyEditor('update', rule1);
    policyEditor('update', rule2);
    policyEditor('update', rule3);
    let rules = ruleResolver({ subject: { _id: '654321' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { role: ['moderator2'] }, resource: { domain: 'hello' } });
    rules.length.should.be.eql(1);
    rules = ruleResolver({ subject: { email: 'janet.doe@gmail.com' } });
    rules.length.should.be.eql(0);
    rules = ruleResolver({ subject: { email: 'janet.doe@gmail.com', admin: true } });
    rules.length.should.be.eql(1);
  });

  it('should retrieve a subject\'s privileges', () => {
    const policySets = policyStore.getPolicySets();
    const privilegesResolver = policyStore.getPrivilegesResolver(policySets[1].name);
    let actions = privilegesResolver({ subject: { role: ['editor'] }, resource: { domain: 'articles'} });
    ((actions & Action.Update) === Action.Update).should.be.true;
    actions = privilegesResolver({ subject: { admin: true }, resource: { domain: 'articles'} });
    ((actions & Action.Update) === Action.Update).should.be.true;
    actions = privilegesResolver({ subject: { _id: '123', role: ['editor'] }, resource: { domain: 'articles', editors: '123' } });
    ((actions & Action.Manage) === Action.Manage).should.be.true;
  });

  it('should persist itself to disk', done => {
    policyStore.save(err => {
      expect(err).to.be.null;
      done();
    });
  });

});