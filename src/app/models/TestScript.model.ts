import { CompiledApiRequest } from "./CompiledRequest.model";
import { RunResponse } from "./RunResponse.model";

export interface TestScript {
    type: 'prescript' | 'postscript',
    script: string,
    $request?: CompiledApiRequest,
    $response?: RunResponse,
    envs?: {
        saved: { [key: string]: string },
        inMem: { [key: string]: any }
    }
}