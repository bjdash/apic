import { ApiProject } from "./ApiProject.model";
import { Env } from "./Envs.model";
import { ReqFolder } from "./ReqFolder.model";
import { ApiRequest } from "./Request.model";
import { Suite } from "./Suite.model";
import { TestProject } from "./TestProject.model";

export interface StompMessage {
    opId?: string,
    command?: string,
    own?: boolean,//TODO: remove own, use force = true for fetch/read, force=false, update, delete
    force?: boolean, //same user performing this action will not be shown background update message
    intrim?: boolean,
    since?: number,
    type?: string
    apiProjects?: ApiProject[],
    envs?: Env[],
    folders?: ReqFolder[],
    apiRequests?: ApiRequest[],
    testCaseProjects?: TestProject[],
    testSuits?: Suite[]
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