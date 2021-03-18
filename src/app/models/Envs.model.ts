export interface Env {
    _id: string,
    name: string,
    proj?: {
        id: string,
        name: string
    },
    _created: number,
    _modified: number
    vals: any,
    owner?: string,
    team?: string
}