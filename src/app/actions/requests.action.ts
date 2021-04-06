import { ReqFolder } from "../models/ReqFolder.model";
import { ApiRequest } from "../models/Request.model";

export namespace RequestsAction {
    export namespace Req {
        export class Add {
            static readonly type = '[Requests] add';
            constructor(public payload: ApiRequest[]) { };
        }
        export class Refresh {
            static readonly type = '[Requests] refresh';
            constructor(public payload: ApiRequest[]) { };
        }
        export class Delete {
            static readonly type = '[Requests] delete';
            constructor(public payload: string[]) { };
        }
        export class Update {
            static readonly type = '[Requests] update';
            constructor(public payload: ApiRequest[]) { };
        }
    }

    export namespace Folder {
        export class Add {
            static readonly type = '[ReqFolder] add';
            constructor(public payload: ReqFolder[]) { };
        }
        export class Refresh {
            static readonly type = '[ReqFolder] refresh';
            constructor(public payload: ReqFolder[]) { };
        }
        export class Delete {
            static readonly type = '[ReqFolder] delete';
            constructor(public payload: string[]) { };
        }
        export class Update {
            static readonly type = '[ReqFolder] update';
            constructor(public payload: ReqFolder[]) { };
        }
    }
}