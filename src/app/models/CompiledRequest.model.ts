export interface CompiledApiRequest {
    _id?: string
    url: string
    method: string
    name?: string
    postscript?: string
    prescript?: string
    headers?: { [key: string]: string; },
    queryParams?: { [key: string]: string; },
    bodyData?: string | FormData //body to use used wile sending request
    body?: any //body to be used with pre/post scripts
    bodyType?: 'x-www-form-urlencoded' | 'raw' | 'graphql' | 'form-data',
    respCodes: any[]
}
