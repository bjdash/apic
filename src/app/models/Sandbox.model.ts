import { CompiledApiRequest } from "./CompiledRequest.model"
import { RunResponse } from "./RunResponse.model"


export type SandboxEvent = {
    type: 'TestMessage' | 'SchemaValidationMessage',
    payload: SandboxTestMessage | SandboxSchemaValidationMessage
}
export type SandboxTestMessage = {
    type: 'prescript' | 'postscript' | 'tempTest',
    script: string,
    $request?: CompiledApiRequest,
    $response?: RunResponse,
    envs?: {
        saved: { [key: string]: string },
        inMem: { [key: string]: any }
    }
}
export type SandboxSchemaValidationMessage = {
    schema: object,
    data: object
}
export type SandboxSchemaValidationResponse = {
    valid: boolean,
    error?: string
}