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
  description?: string,
  deprecated?: boolean,
  pathParams?: any,
  queryParams?: any,
  headers?: any,
  body?: EndpBody,
  responses?: ApiResponse[],
  postrun?: string,
  prerun?: string,
  xProperties?: KeyVal[]
}

export interface ApiTrait {
  _id: string,
  name: string,
  summary?: string,
  folder: string | undefined,
  headers?: any,
  pathParams?: any,
  queryParams?: any,
  responses?: ApiResponse[],
  xProperties?: KeyVal[]
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
  data: MediaTypeSchema[],
  headers?: { type: 'object', properties?: { [key: string]: any }, required?: string[] },
  code: string,
  desc?: string,
  noneStatus?: boolean,
  importedVia?: 'Trait' | 'NamedResponse',
  importedViaName?: string,
  traitId?: string
}
export type ApiExampleRef = KeyVal;
export type MediaTypeSchema = {
  schema: any,
  mime: string,
  examples?: ApiExampleRef[]
}
export interface ApiExample {
  _id: string,
  folder: string
  name: string
  summary?: string;
  value?: any;
  description?: string;
  valueType?: '$ref' | 'inline' | 'external'
}
export interface EndpBody {
  data: MediaTypeSchema[],
  desc?: string
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

export interface LeftTreeItem {
  _id: string,
  name: string,
  children: {
    _id: string,
    name: string,
    type: ProjectItemTypes,
    deprecated?: boolean,
    label: string,
    desc: string
  }[]
}

export type ProjectItemTypes = 'models' | 'examples' | 'traits' | 'endpoints' | 'folders'

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
  responses: [],
  xProperties: []
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
  description: '',
  pathParams: { type: 'object', properties: {}, required: [] },
  queryParams: { type: 'object', properties: {}, required: [] },
  headers: { type: 'object', properties: {}, required: [] },
  body: {
    data: [],
    desc: ''
  },
  responses: [{
    code: '200',
    data: [{
      schema: { type: 'object' },
      mime: 'application/json',
      examples: []
    }],
    headers: { type: 'object' }
  }],
  postrun: '',
  prerun: '',
  xProperties: []
}
