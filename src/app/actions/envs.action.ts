import { Env } from './../models/Envs.model';

export namespace EnvsAction {
    export class Add {
        static readonly type = '[Env] add';
        constructor(public payload: Env[]) { };
    }
    export class Refresh {
        static readonly type = '[Env] refresh';
        constructor(public payload: Env[]) { };
    }
    export class Delete {
        static readonly type = '[Env] delete';
        constructor(public payload: string) { };
    }
    export class Update {
        static readonly type = '[Env] update';
        constructor(public payload: Env[]) { };
    }
    export class Select {
        static readonly type = '[Env] Select';
        constructor(public payload: String) { };
    }
}