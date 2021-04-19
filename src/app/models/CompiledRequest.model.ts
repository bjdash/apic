export interface CompiledApiRequest {
    _id?: string
    url: string
    method: string
    name?: string
    postscript?: string
    prescript?: string
    headers?: { [key: string]: string; },
    body?: string | FormData
}
