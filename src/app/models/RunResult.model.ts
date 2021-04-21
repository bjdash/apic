import { CompiledApiRequest } from "./CompiledRequest.model";
import { RunResponse } from "./RunResponse.model";

export interface RunResult {
    req: CompiledApiRequest,
    resp: RunResponse
}