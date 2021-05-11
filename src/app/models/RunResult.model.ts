import { CompiledApiRequest } from "./CompiledRequest.model";
import { RunResponse } from "./RunResponse.model";

export interface RunResult {
    $request: CompiledApiRequest,
    $response: RunResponse
}