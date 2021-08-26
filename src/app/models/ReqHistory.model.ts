import { ApiRequest } from "./Request.model";

export interface HistoryRequest extends Partial<ApiRequest> {
    _time?: number
}