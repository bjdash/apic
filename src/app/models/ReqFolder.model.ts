import { ApiRequest } from "./Request.model";

export interface ReqFolder {
    owner?: string
    _created?: number
    _id: string
    _modified?: number
    desc?: string,
    name: string
    parentId?: string,
}

export interface ReqFolderPartial {

}
export interface TreeReqFolder {
    desc?: string,
    name: string
    parentId?: string,
    owner?: string
    _created?: number
    _id: string
    _modified?: number,
    children: TreeReqFolder[],
    requests: ApiRequest[]
}
