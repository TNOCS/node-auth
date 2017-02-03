import { Rule } from './rule';
import { DecisionCombinator } from './decision-combinator';
export interface PolicyBase {
    name: string;
    desc?: string;
    combinator: DecisionCombinator;
}
export interface Policy extends PolicyBase {
    rules: Rule[];
}
export interface PolicySet extends PolicyBase {
    policies: Policy[];
}
