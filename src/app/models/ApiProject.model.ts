import { KeyVal } from "./KeyVal.model";

export interface SecurityDef {
    type: string,
    name: string,
    description?: string,
    apiKey?: {
        in?: string,
        name: string
    },
    oauth2?: {
        authorizationUrl?: string,
        flow?: string,
        scopes?: KeyVal[]
    }
}

export interface ApiFolder {
    _id: string,
    name: string,
    desc?: string
}

export interface ApiModel {
    _id: string,
    nameSpace: string,
    name: string,
    folder: string | undefined,
    data?: any
}

export interface ApiEndp {
    _id: string,
    name: string,
    method: string,
    folder: string | undefined,
    summary?: string
}

export interface APiTraits {
    _id: string,
    name: string,
    summary?: string,
    folder: string | undefined,
    headers?: any,
    pathParams?: any,
    queryParams?: any,
    responses?: any[]
}

export interface ApiProject {
    _id?: string,
    title: string,
    version?: string,
    _created?: number,
    _modified?: number,
    owner?: string,
    team?: string,
    description?: string,
    contact?: any,
    folders?: { [key: string]: ApiFolder },
    models?: { [key: string]: ApiModel },
    traits?: { [key: string]: APiTraits },
    setting?: any,
    endpoints?: { [key: string]: ApiEndp },
    termsOfService?: string,
    license?: {
        name?: string,
        url?: string
    },
    securityDefinitions?: SecurityDef[]
}

export const NewApiFolder: ApiFolder = {
    _id: 'NEW',
    name: '',
    desc: ''
}