import { ApiRequest } from "./Request.model";

export interface Suite {
    env?: string,
    name: string
    owner?: string
    team?: string[]
    projId: string
    reqs: ApiRequest[]
    _created?: number
    _id: string
    _modified?: number
}