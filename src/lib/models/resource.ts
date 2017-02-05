/**
 * Default Resource description
 *
 * @export
 * @interface Resource
 */
export interface Resource {
  domain?: string[];
  type?: string;
  [key: string]: string | string[] | number | number[] ;
}