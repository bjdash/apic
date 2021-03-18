//@ts-check
import Utils from '../utils/helpers';

export default class User {
    static userData = {
        UID: null,
        AuthToken: null
    }

    static setData(data) {
        this.userData = Utils.deepCopy(data);
    }

    static getData() {
        return this.userData;
    }

    static getUID() {
        return this.userData ? this.userData.UID : undefined;
    }

    static getAuthToken() {
        return this.userData ? this.userData.AuthToken : undefined;
    }

    static logout() {
        // return Http.get(ApicUrls.logout).then(function (resp) {
        //     if (resp && resp.status === 'ok') {
        //         delete Http.defaultHeaders['Authorization'];
        //     }
        //     return resp.data;
        // });
    }
}