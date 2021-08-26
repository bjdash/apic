import { ApiProject } from './../models/ApiProject.model';

export namespace ApiProjectsAction {
    export class Add {
        static readonly type = '[ApiProject] add';
        constructor(public payload: ApiProject[]) { };
    }
    export class Refresh {
        static readonly type = '[ApiProject] refresh';
        constructor(public payload: ApiProject[]) { };
    }
    export class Delete {
        static readonly type = '[ApiProject] delete';
        constructor(public payload: string[]) { };
    }
    export class Update {
        static readonly type = '[ApiProject] update';
        constructor(public payload: ApiProject[]) { };
    }
}

