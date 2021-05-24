import { Suite } from "../models/Suite.model";
import { TestProject } from "../models/TestProject.model";

export namespace SuitesAction {
    export namespace Project {
        export class Add {
            static readonly type = '[TestProject] add';
            constructor(public payload: TestProject[]) { };
        }
        export class Refresh {
            static readonly type = '[TestProject] refresh';
            constructor(public payload: TestProject[]) { };
        }
        export class Delete {
            static readonly type = '[TestProject] delete';
            constructor(public payload: string[]) { };
        }
        export class Update {
            static readonly type = '[TestProject] update';
            constructor(public payload: TestProject[]) { };
        }
    }

    export namespace Suites {
        export class Add {
            static readonly type = '[Suite] add';
            constructor(public payload: Suite[]) { };
        }
        export class Refresh {
            static readonly type = '[Suite] refresh';
            constructor(public payload: Suite[]) { };
        }
        export class Delete {
            static readonly type = '[Suite] delete';
            constructor(public payload: string[]) { };
        }
        export class Update {
            static readonly type = '[Suite] update';
            constructor(public payload: Suite[]) { };
        }
    }
}