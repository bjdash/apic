import { User } from '../models/User.model';

export namespace UserAction {
    export class Set {
        static readonly type = '[User] set';
        constructor(public payload: User) { };
    }
    export class Update {
        static readonly type = '[User] update';
        constructor(public payload: User) { };
    }

    export class RefreshFromLocal {
        static readonly type = '[User] refresh';
        constructor() { }
    }

    export class Clear {
        static readonly type = '[User] clear';
        constructor() { }
    }
}