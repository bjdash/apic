import { KeyVal } from "./KeyVal.model";

export interface Env {
    _id?: string,
    _created?: number,
    _modified?: number,
    name: string,
    vals: KeyVal[],
    proj?: {
        id: string,
        name: string
    },
    owner?: string,
    team?: string
}

export interface ParsedEnv {
    _id: string,
    name: string,
    vals: any
}