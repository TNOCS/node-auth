/**
 * Default Resource description
 *
 * @export
 * @interface Resource
 */
export interface Resource {
  id?: string;
  domain?: string;
  type?: string;
  [key: string]: boolean | string | string[] | number | number[] ;
}