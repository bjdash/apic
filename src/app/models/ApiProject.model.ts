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
    folders?: any,
    models?: any,
    traits?: any,
    setting?: any,
    endpoints?: any,
    termsOfService?: string,
    license?: {
        name?: string,
        url?: string
    },
    securityDefinitions?: SecurityDef[]
}