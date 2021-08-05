import { KeyVal } from "./KeyVal.model";

export interface ReqAuthMsg {
    addTo: 'header' | 'body' | 'query',
    value: KeyVal[]
}