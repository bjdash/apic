import { ApiProject } from './../models/ApiProject.model';

export class AddApiProjects {
    static readonly type = '[ApiProject] add';
    constructor(public payload: ApiProject[]) { };
}
export class RefreshApiProjects {
    static readonly type = '[ApiProject] refresh';
    constructor(public payload: ApiProject[]) { };
}
export class DeleteApiProject {
    static readonly type = '[ApiProject] delete';
    constructor(public payload: string) { };
}
export class UpdateApiProjects {
    static readonly type = '[ApiProject] update';
    constructor(public payload: ApiProject[]) { };
}