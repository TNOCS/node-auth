/**
 * Default Resource description
 *
 * @export
 * @interface Resource
 */
export interface Resource {
  domain?: string;
  managers?: string[];
  editors?: string[];
  readers?: string[];
}