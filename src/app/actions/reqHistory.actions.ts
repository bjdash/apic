import { HistoryRequest } from "../models/ReqHistory.model";

export namespace ReqHistoryAction {
    export class Add {
        static readonly type = '[ReqHistory] add';
        constructor(public payload: HistoryRequest[]) { };
    }
    export class Refresh {
        static readonly type = '[ReqHistory] refresh';
        constructor(public payload: HistoryRequest[]) { };
    }
    export class Delete {
        static readonly type = '[ReqHistory] delete';
        constructor(public payload: string[]) { };
    }

    export class Clear {
        static readonly type = '[ReqHistory] clear';
        constructor() { };
    }
}

