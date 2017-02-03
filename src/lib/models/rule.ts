// import { AuthRequest } from "../models/auth-request";
import { Resource } from './resource';
import { Subject } from './subject';
import { Action } from './action';
import { Decision } from './decision';

export interface Rule {
  subject?: Subject;
  action?: Action;
  resource?: Resource;
  decision: Decision;
}
