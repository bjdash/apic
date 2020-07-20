import { Env } from './../models/Envs.model';


export class AddEnvs {
    static readonly type = '[Env] add';
    constructor(public payload: Env[]) { };
}
export class RefreshEnvs {
    static readonly type = '[Env] refresh';
    constructor(public payload: Env[]) { };
}
export class DeleteEnv {
    static readonly type = '[Env] delete';
    constructor(public payload: string) { };
}
export class UpdateEnvs {
    static readonly type = '[Env] update';
    constructor(public payload: Env[]) { };
}