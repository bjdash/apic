
export default class LocalStore {
    static LAST_SELECTED_ENV = 'lastSelectedEnv';
    static USER_ID = 'userId'; //auto generated id of the dummy user
    static FIRST_RUN = 'firstRun';
    static VERSION = 'version';
    static UID = 'UID'; //unique id of the logged in user
    static ID = 'id'; ////unique id of the logged in user = UID
    static AUTH_TOKEN = 'authToken'; //logged in user's auth token
    static EMAIL = 'email'; //logged in user's email
    static NAME = 'name'; //logged in user name
    static VERIFIED = 'verified'; //is the logged in users email verified
    static THEME_TYPE = 'themeType';
    static THEME_ACCENT = 'themeAccent';

    //return object for list of keys, direct value for single key
    static get(key: string): string {
        return localStorage.getItem(key);
    }

    static getMany(keys: string[]): any {
        var res = {};
        for (var i = 0; i < keys.length; i++) {
            res[keys[i]] = localStorage.getItem(keys[i]);
        }
        return res;
    }

    static set(key: string, val: any) {
        localStorage.setItem(key, val);
    }

    static setMany(key: object) {
        for (var k in key) { //for objects
            if (key.hasOwnProperty(k)) {
                localStorage.setItem(k, key[k]);
            }
        }
    }

    static remove(key) {
        if (key instanceof Array) {
            var res = [];
            for (var i = 0; i < key.length; i++) {
                res.push(localStorage.removeItem(key[i]));
            }
        } else {
            localStorage.removeItem(key);
        }
    }


}