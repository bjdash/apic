import { KeyVal } from "./KeyVal.model";

export interface ApiRequest {
    Req?: {
        url_params?: any[], headers?: any[]
    },
    Body?: {
        rawData?: string,
        selectedRaw?: { name?: string, val?: string },
        type?: 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'graphql',
        gqlVars?: string,
        formData: KeyVal[],
        xForms: KeyVal[]
    }
    description?: string
    id?: string
    method: string
    name: string
    owner?: string
    postscript?: string
    prescript?: string
    respCodes?: any[]
    savedResp?: SavedResp[]
    _parent: string
    url: string
    _created: number
    _id: string
    _modified: number
}

export interface SavedResp {
    data: string,
    headers: any,
    size: string,
    status: string,
    time: string
}