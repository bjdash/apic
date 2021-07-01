import { KeyVal } from "./KeyVal.model";

export interface ApiRequest {
    Req?: {
        url_params?: KeyVal[], headers?: KeyVal[]
    },
    Body?: {
        rawData?: string,
        selectedRaw?: { name?: string, val?: string },
        type?: 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'graphql',
        gqlVars?: string,
        formData?: KeyVal[],
        xForms?: KeyVal[]
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
    _parent?: string
    url: string
    _created?: number
    _id: string
    _modified?: number,
    //ws
    type?: 'ws'
    //websocket
    message?: string,
    //sse
    sse?: {
        listeners: {
            active: boolean,
            readonly?: boolean,
            name: string
        }[],
        withCred: boolean
    },
    //Stomp
    stomp?: {
        subscUrl?: string,
        host?: string,
        login?: string,
        passcode?: string,
        headers?: KeyVal[],
        destQ?: string
    },
    //Socketio
    socketio?: {
        args?: string[],
        argTypes?: string[],
        curArg?: number,
        path?: string,
        listeners?: {
            active: boolean,
            readonly?: boolean,
            name: string
        }[],
        headers?: KeyVal[],
        query?: KeyVal[],
        emitName?: string,
        transport?: boolean[]
    }
}

export interface SavedResp {
    data: string,
    headers: any,
    size: string,
    status: number,
    statusText: string,
    time: number
}