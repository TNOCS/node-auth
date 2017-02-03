import { PolicySet } from '../models/policy';
import { Decision, PolicyDecision } from '../models/decision';
import { Subject } from '../models/subject';
import { Action } from '../models/action';
import { Resource } from '../models/resource';

export function PolicyDecisionPoint(policySets: PolicySet[]): PolicyDecision {
  // Insert the policy set into the database

  return (permissionRequest: { subject?: Subject, action?: Action, resource?: Resource }) => {
    return Decision.permit;
  };
}