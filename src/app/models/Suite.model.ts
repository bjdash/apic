import { ApiRequest } from "./Request.model";

export interface SuiteReq extends ApiRequest {
    disabled: boolean
}
export interface Suite {
    env?: string,
    name: string
    owner?: string
    team?: string[]
    projId: string
    reqs: SuiteReq[]
    _created?: number
    _id: string
    _modified?: number
}