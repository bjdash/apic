export interface ApiRequest {
    Req?: {
        url_params?: any[], headers?: any[]
    }
    description?: string
    id?: string
    method: string
    name: string
    owner?: string
    postscript?: string
    prescript?: string
    respCodes?: any[]
    savedResp?: any[]
    _parent: string
    url: string
    _created: number
    _id: string
    _modified: number
}