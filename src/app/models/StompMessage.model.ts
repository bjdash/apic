import { ApiProject } from "./ApiProject.model";
import { Env } from "./Envs.model";

export interface StompMessage {
    opId?: string,
    command?: string,
    own?: boolean,
    intrim?: boolean,
    since?: number,
    type?: string
    apiProjects?: ApiProject[],
    envs?: Env[],
    idList?: string[],
    action?: string,
    msg?: string,
    nonExistant?: {
        apiProjects?: string[],
        envs?: string[],
        folders?: string[],
        apiRequests?: string[],
        testCaseProjects?: string[],
        testSuits?: string[]
    },
    originalComand?: string
}