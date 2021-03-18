export interface StompMessage {
    opId?: string,
    command?: string,
    own?: boolean,
    intrim?: boolean,
    since?: number,
    type?: string
    apiProjects?: any[],
    idList?: string[],
    action?: string
}