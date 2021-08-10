import { Test } from "./TestResponse.model";

export interface RunResponse {
    headersStr?: string, // not available in apic-cli
    headers: { [key: string]: any; },
    status: number,
    statusText: string,
    readyState?: number,
    body: string,
    bodyPretty?: string,
    data: any,//json body
    timeTaken: number,
    timeTakenStr: string,
    respSize: string,
    logs: string[],
    tests: Test[],
    inMemEnvs?: { [key: string]: any; }
    meta?: any // additional metadata,
    scriptError: string
}