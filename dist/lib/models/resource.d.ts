export interface Resource {
    domain?: string[];
    type?: string;
    [key: string]: boolean | string | string[] | number | number[];
}
