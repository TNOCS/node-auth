/**
 * Default Resource description
 *
 * @export
 * @interface Resource
 */
export interface Resource {
  domain?: string;
  [key: string]: string | number;
}