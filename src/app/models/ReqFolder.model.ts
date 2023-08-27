import { ApiRequest, LeftTreeRequest } from "./Request.model";

export interface ReqFolder {
  owner?: string
  _created?: number
  _id?: string
  _modified?: number
  desc?: string,
  name: string
  parentId?: string,
  team?: string
}

export interface ReqFolderPartial {

}
export interface LeftTreeFolder {
  desc?: string,
  name: string
  parentId?: string,
  owner?: string
  _created?: number
  _id?: string
  _modified?: number,
  children: LeftTreeFolder[],
  requests: LeftTreeRequest[]
  team?: string,
  treeItem?: 'Folder'
}
