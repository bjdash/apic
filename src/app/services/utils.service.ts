import { Toaster } from './toaster.service';
import { Injectable } from "@angular/core";
import apic from '../utils/apic';
import { Const } from '../utils/constants';
import { KeyVal } from '../models/KeyVal.model';


@Injectable()
export class Utils {
    constructor(private toaster: Toaster) {

    }

    copyToClipboard(text: string) {
        var input = document.createElement('textarea');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('Copy');
        document.body.removeChild(input);
        this.toaster.success('Copied');
    }

    static initXMLHttpRequest() {
        //TODO:
        // XMLHttpRequest.prototype.addHeadersFromObj = function (headers) {
        //     var _this = this;

        //     for (var key in headers) {
        //         if (key && headers.hasOwnProperty(key)) {
        //             var val = headers[key];
        //             var header = key.toUpperCase();
        //             if (Const.restrictedHeaders.indexOf(header) > -1) {
        //                 header = 'APIC-' + header;
        //             }
        //             try {
        //                 _this.setRequestHeader(header, val);
        //             } catch (e) {
        //                 var m = e.message;
        //                 console.warn(m.slice(m.indexOf(':') + 1).trim());
        //             }
        //         }
        //     }
        //     return _this;
        // };
    }

    static arrayToObj<T>(array: T[], key: string): { [key: string]: T } {
        return array.reduce((obj, item: T) => Object.assign(obj, { [item[key]]: item }), {});
    }

    static keyValPairAsObject(keyVals: KeyVal[], includeInactive?: boolean) {
        if (!keyVals?.length) return {};
        return keyVals
            .filter(kv => includeInactive || kv.active)
            .reduce((obj, item: KeyVal) => Object.assign(obj, { [item.key]: item.val }), {});
    }

    static objectEntries(obj): [string, any][] {
        return obj ? (Object.entries(obj) as [string, any][]) : [];
    }

    static objectKeys(obj): string[] {
        return obj ? Object.keys(obj) : [];
    }

    static assertBuilder(a, b, type, not) {
        //type = eql, gt, gte, lt, lte, a (to.be.a('string')),include
        var be = ['eql', 'gt', 'gte', 'lt', 'lte', 'a', 'an'];
        if (!type) type = 'eql';
        return 'expect(' + a + ')' + (not ? '.not' : '') + '.to' + (be.indexOf(type) > -1 ? '.be' : '') + '.' + type + '(' + b + ')';
    }

    static getUrlParts(url) {
        if (!url)
            return [];
        var parts = [];
        var baseUrl = url;
        var begining = 0;
        var end = url.length;
        if (url.indexOf('http://') === 0) {
            begining = 7;
        } else if (url.indexOf('https://') === 0) {
            begining = 8;
        }

        if (url.search('\\?') > 0) {
            end = url.search('\\?');
        }
        baseUrl = url.substring(begining, end);
        parts = baseUrl.split('/');
        if (parts[0].search(':') > 0) {
            parts[0] = parts[0].substring(0, parts[0].search(':'));
        }
        var part = parts[parts.length - 1];
        if (part.indexOf('{{') >= 0) {
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i].indexOf('{{') !== 0) {
                    part = parts[i];
                    break;
                }
            }
        }
        return part;

    }

    static getUrlEncodedBody(xForms) {
        var paramsList = [];
        for (var i = 0; i < xForms.length; i++) {
            var pair = xForms[i];
            if (pair.key) {
                var key = encodeURIComponent(pair.key);
                key = key.replace(/%20/g, '+');
                var val = encodeURIComponent(pair.val);
                val = val.replace(/%20/g, '+');
                paramsList.push(key + '=' + val);
            }
        }
        if (paramsList.length > 0) {
            return paramsList.join('&');
        } else {
            return null;
        }
    }

    static getGqlBody(query, vars) {
        var variables = null;
        if (vars) variables = JSON.parse(vars.trim());
        var q: any = {
            query: query,
        };
        if (variables) q.variables = variables;
        return JSON.stringify(q);
    }

    static getFormDataBody(formData) {
        var bodyData = new FormData();
        for (var i = 0; i < formData.length; i++) {
            var obj = formData[i];
            if (obj.key) {
                if (obj.type.toLowerCase() === 'text') {
                    bodyData.append(obj.key, obj.val);
                } else if (obj.type.toLowerCase() === 'file') {
                    bodyData.append(obj.key, obj.file);
                }
            }
        }
        return bodyData;
    }

    static prepareHeadersObj(headerStr) {
        var headerList = headerStr.split('\n'),
            headers = {};
        for (var i = 0; i < headerList.length; i++) {
            if (headerList[i].search(':') >= 0) {
                var index = headerList[i].indexOf(':');
                //var split = headerList[i].split(':');
                headers[headerList[i].substring(0, index).trim()] = headerList[i].substring(index + 1).trim();
            }
        }
        return headers;
    }

    static urlToReqName(method, url) {
        var urlParts = Utils.getUrlParts(url);
        var phrase = '';
        switch (method) {
            case 'GET':
                phrase = 'Get ';
                break;
            case 'POST':
                phrase = 'Create ';
                break;
            case 'DELETE':
                phrase = 'Delete ';
                break;
            case 'PUT':
            case 'PATCH':
                phrase = 'Update ';
                break;
            case 'Stomp':
                phrase = 'Stomp ';
                break;
            case 'Websocket':
                phrase = 'Websocket ';
                break;
            case 'Socketio':
                phrase = 'SocketIO ';
                break;
            case 'SSE':
                phrase = 'SSE ';
                break;
        }
        return phrase + urlParts;
    }

    static isElectron() {
        return window.navigator.userAgent.toLowerCase().indexOf('electron') >= 0 ? true : false;
    }

    static formatTime(timeDiff: number): string {
        return timeDiff >= 1000 ? (timeDiff / 1000) + ' s' : timeDiff + ' ms'
    }

    static getAppType() {
        if (Utils.isElectron()) {
            return 'ELECTRON';
        } else if (window.location && window.location.protocol === 'chrome-extension:') {
            return 'CHROME';
        } else {
            return 'WEB';
        }
    }

    static isNewVersion(newVersion, oldVersion) {
        var newVParts = newVersion.split("."),
            oldVParts = oldVersion.split(".");

        if (parseInt(newVParts[0]) > parseInt(oldVParts[0])) {
            return true;
        } else if (parseInt(newVParts[0]) === parseInt(oldVParts[0])) {
            if (parseInt(newVParts[1]) > parseInt(oldVParts[1])) {
                return true;
            } else if (parseInt(newVParts[1]) === parseInt(oldVParts[1])) {
                if (parseInt(newVParts[2]) > parseInt(oldVParts[2])) {
                    return true;
                }
            }
        }

        return false;
    }

    static notify(title, content, link, image?) {
        if (!image)
            image = '/img/logo-tmp.png';
        if (typeof window['chrome'] !== "undefined" && window['chrome'].notifications && window['chrome'].notifications.create) {
            var optn = {
                type: "basic",
                title: title,
                message: content,
                iconUrl: image,
                buttons: [{
                    title: "View"
                }]
            };
            window['chrome'].notifications.create(apic.s8(), optn);
            window['chrome'].notifications.onButtonClicked.addListener(function (notifId, btnIdx) {
                if (btnIdx === 0) {
                    window.open(link);
                }
            });
        } else {
            content += ' Click for more';
            Notification.requestPermission(function (permission) {
                // If the user accepts, let's create a notification
                if (permission === "granted") {
                    var notification = new Notification(content);
                    notification.onclick = function (event) {
                        event.preventDefault(); // prevent the browser from focusing the Notification's tab
                        window.open(link, '_blank');
                    };

                }
            });
        }
    }
}
