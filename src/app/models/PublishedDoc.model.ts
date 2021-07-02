import { ApiProject } from "./ApiProject.model";

export interface PublishedDocs extends PublishedDocsPartial {
    id: string
    owner: string
    apiProj: ApiProject
    _created: number
    _modified: number
}

export interface PublishedDocsPartial {
    title: string
    version: string
    css?: string
    favicon?: string
    logo?: string,
    projId: string
}