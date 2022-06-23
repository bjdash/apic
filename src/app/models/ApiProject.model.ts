import { KeyVal } from "./KeyVal.model";

export interface SecurityDef {
    type: 'basic' | 'apiKey' | 'oauth2' | 'bearer',
    name: string,
    description?: string,
    apiKey?: {
        in?: string,
        name: string
    },
    oauth2?: {
        authorizationUrl?: string,
        flow?: string,
        tokenUrl?: string,
        scopes?: KeyVal[]
    },
    bearer?: {
        bearerFormat?: string
    },
    xProperty?: KeyVal[]
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
    summary?: string,
    path: string,
    method: string,
    folder: string | undefined,
    traits?: any[],
    tags?: string[],
    security?: any[],
    operationId?: string,
    schemes?: KeyVal[],
    consumes?: string[],
    produces?: string[],
    description?: string,
    deprecated?: boolean,
    pathParams?: any,
    queryParams?: any,
    headers?: any,
    body?: {
        type: 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'graphql',
        data: any
    },
    responses?: ApiResponse[],
    postrun?: string,
    prerun?: string,
}

export interface ApiTrait {
    _id: string,
    name: string,
    summary?: string,
    folder: string | undefined,
    headers?: any,
    pathParams?: any,
    queryParams?: any,
    responses?: ApiResponse[]
}

export interface ApiTag {
    name: string,
    description?: string,
    externalDocs?: {
        url: string,
        description?: string
    },
    xProperty?: KeyVal[]
}
export interface ApiResponse {
    data: any,
    examples: ApiExampleRef[],
    code: string,
    desc?: string,
    noneStatus?: boolean,
    fromTrait?: boolean,
    traitId?: string,
    traitName?: string
}
export type ApiExampleRef = KeyVal;
export interface ApiExample {
    _id: string,
    folder: string
    name: string
    summary?: string;
    value?: any;
    description?: string; valueType?: '$ref' | 'inline' | 'external'
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
    contact?: {
        name?: string,
        url?: string,
        email?: string
    },
    folders?: { [key: string]: ApiFolder },
    models?: { [key: string]: ApiModel },
    traits?: { [key: string]: ApiTrait },
    examples?: { [key: string]: ApiExample },
    setting?: {
        basePath?: string,
        envId?: string,
        host?: string,
        protocol?: string
    },
    endpoints?: { [key: string]: ApiEndp },
    termsOfService?: string,
    license?: {
        name?: string,
        url?: string
    },
    securityDefinitions?: SecurityDef[],
    simKey?: string,
    publishedId?: string,
    tags?: ApiTag[]
}

export const NewApiFolder: ApiFolder = {
    _id: 'NEW',
    name: '',
    desc: ''
}
export const NewApiModel: ApiModel = {
    _id: 'NEW',
    name: '',
    nameSpace: '',
    folder: '',
    data: { type: "object" }
}

export const NewApiExample: ApiExample = {
    _id: 'NEW',
    name: '',
    summary: '',
    folder: '',
    description: '',
    value: {},
    valueType: 'inline'
}

export const NewApiTrait: ApiTrait = {
    _id: 'NEW',
    name: '',
    summary: '',
    folder: '',
    headers: { type: "object" },
    pathParams: { type: "object" },
    queryParams: { type: "object" },
    responses: []
}

export const NewApiEndp: ApiEndp = {
    _id: 'NEW',
    summary: '',
    path: '',
    method: 'get',
    folder: '',
    traits: [],
    tags: [],
    security: [],
    operationId: '',
    schemes: [],
    consumes: [],
    produces: [],
    description: '',
    pathParams: { type: 'object' },
    queryParams: { type: 'object' },
    headers: { type: 'object' },
    body: {
        type: 'raw',
        data: { type: 'object' }
    },
    responses: [{ code: '200', data: { type: 'object' }, examples: [] }],
    postrun: '',
    prerun: '',
}