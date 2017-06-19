import { IRule } from './rule';
import { DecisionCombinator } from './decision-combinator';

export interface IPolicyBase {
  name: string;
  desc?: string;
  combinator: DecisionCombinator;
  isDefault?: boolean;
}

export interface IPolicy extends IPolicyBase {
  rules: IRule[];
}

export interface IPolicySet extends IPolicyBase {
  policies: IPolicy[];
}