import structuredClone from '@ungap/structured-clone'
import { Toaster } from './toaster.service';
import { Injectable } from "@angular/core";
import apic from '../utils/apic';
import { Const, MONTHS, RESTRICTED_HEADERS } from '../utils/constants';
import { KeyVal } from '../models/KeyVal.model';
import { JsonUtils } from '../utils/json.utils';
import { ApiRequest } from '../models/Request.model';


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

    static arrayToObj<T>(array: T[], key: string): { [key: string]: T } {
        return array.reduce((obj, item: T) => Object.assign(obj, { [item[key]]: item }), {});
    }

    static keyValPairAsObject(keyVals: KeyVal[], includeInactive?: boolean) {
        if (!keyVals?.length) return {};
        return keyVals
            .filter(kv => includeInactive || kv.active)
            .reduce((obj, item: KeyVal) => Object.assign(obj, { [item.key]: item.val }), {});
    }

    static objectEntries<T>(obj: { [key: string]: T }): [string, T][] {
        return obj ? (Object.entries(obj)) : [];
    }

    static objectValues<T>(obj: { [key: string]: T }): T[] {
        return obj ? Object.values(obj) : [];
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

    static getUrlEncodedXForm(xForm: { [key: string]: string }) {
        var paramsList = Utils.objectEntries(xForm).map(([key, val]) => {
            if (key) {
                key = encodeURIComponent(key).replace(/%20/g, '+');
                val = encodeURIComponent(val).replace(/%20/g, '+');
                return (key + '=' + val);
            }
            return;
        }).filter(p => p != undefined);

        return paramsList.length > 0 ? paramsList.join('&') : null;
    }

    static formatDate(ts: number): string {
        var date = new Date(ts);
        var formatedDate = MONTHS[date.getMonth()] + ' ' + date.getDate() + ' ' + date.getFullYear();
        return formatedDate;
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
                    bodyData.append(obj.key, obj.meta);
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

    static notify(title, content, link, image?) {
        if (!image)
            image = '/assets/images/logo192.png';
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

    static harToApicReq(harEntry): ApiRequest {
        var harReq = harEntry.request;
        var req = {
            _id: apic.s12(),
            disabled: undefined,
            method: harReq.method,
            url: harReq.url,
            name: Utils.urlToReqName(harReq.method, harReq.url),
            description: '',
            postscript: '',
            prescript: '',
            Req: {
                url_params: [],
                headers: []
            },
            Body: {
                formData: [],
                xForms: [],
                type: null,
                selectedRaw: {},
                rawData: null
            },
            respCodes: [],
            savedResp: []
        }

        harReq.queryString.forEach(function (query) {
            req.Req.url_params.push({ key: query.name, val: query.value, active: true })
        })
        req.Req.url_params.push({ key: "", val: "", active: true });

        harReq.headers.forEach(function (header) {
            var headerName = header.name.toUpperCase();
            if (!RESTRICTED_HEADERS.includes(headerName) && !headerName.startsWith('SEC-') && !headerName.startsWith('PROXY-')) {
                req.Req.headers.push({ key: header.name, val: header.value, active: true })
            } else if (headerName === 'COOKIE' || headerName === 'COOKIE2') {
                req.Req.headers.push({ key: header.name, val: header.value, active: true })
            }
        })
        req.Req.headers.push({ key: "", val: "", active: true });

        //parsing request body
        if (harReq.postData && harReq.bodySize > 0) {
            //x-form
            if (harReq.postData.mimeType.indexOf('application/x-www-form-urlencoded') >= 0) {
                req.Body.type = 'x-www-form-urlencoded';
                harReq.postData.params.forEach(function (param) {
                    req.Body.xForms.push({ key: param.name, val: param.value, active: true });
                })
            } else if (harReq.postData.mimeType.indexOf('multipart/form-data') >= 0) {
                req.Body.type = 'form-data';
                harReq.postData.params.forEach(function (param) {
                    req.Body.formData.push({ key: param.name, val: param.value, active: true });
                })
            } else {
                req.Body.type = 'raw';
                req.Body.rawData = harReq.postData.text;
                req.Body.selectedRaw = {
                    name: harReq.postData.mimeType.toLowerCase().indexOf('json') >= 0 ? 'JSON' : harReq.postData.mimeType,
                    val: harReq.postData.mimeType
                }
            }
        }
        req.Body.formData.push({ key: "", val: "", active: true });
        req.Body.xForms.push({ key: "", val: "", active: true });


        //parsing response
        var harResp = harEntry.response;
        if (harResp.status != 0) {
            //populate the respCodes/schema tab data
            var jsonResp = null;
            try {
                jsonResp = JSON.parse(harResp.content.text);
                req.respCodes.push({
                    code: harResp.status + '',
                    data: JsonUtils.easyJsonSchema(jsonResp)
                })
            } catch (e) {
                console.warn('response is not in json', harResp.content.text);
                req.respCodes.push({
                    code: '200',
                    data: { type: 'object' }
                })
            }

            //save current response
            var savedresp = {
                status: harResp.status,
                data: harResp.content.text,
                time: harEntry.time,
                size: harResp._transferSize,
                headers: {}
            };
            harResp.headers.forEach(function (header) {
                savedresp.headers[header.name] = header.value
            })

            req.savedResp.push(savedresp)
        } else {
            //request failed, so set an empty json schema with 200 status for the schema tab.
            req.respCodes.push({
                code: '200',
                data: { type: 'object' }
            })
        }
        return req;
    }

    static clone<T>(obj: T): T {
        return structuredClone(obj);
    }

    static getRegExpFlags(regExp) {
        if (typeof regExp.source.flags == 'string') {
            return regExp.source.flags;
        } else {
            var flags = [];
            regExp.global && flags.push('g');
            regExp.ignoreCase && flags.push('i');
            regExp.multiline && flags.push('m');
            regExp.sticky && flags.push('y');
            regExp.unicode && flags.push('u');
            return flags.join('');
        }
    }

    static parseUri(href): { source: string, protocol: string, authority: string, userInfo: string, user: string, password: string, host: string, port: string, relative: string, path: string, directory: string, file: string, query: string, anchor } {
        var o = {
            key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
            parser: { strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@\/]*):?([^:@\/]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/ }
        };
        var m = o.parser.strict.exec(href);
        var uri: any = {};
        var i = 14;
        while (i--) uri[o.key[i]] = m[i] || "";
        return uri;
    }

    static deepEquals(object1, object2) {
        const keys1 = Utils.objectKeys(object1);
        const keys2 = Utils.objectKeys(object2);
        if (keys1.length !== keys2.length) {
            return false;
        }
        for (const key of keys1) {
            const val1 = object1[key];
            const val2 = object2[key];
            const areObjects = Utils.isObject(val1) && Utils.isObject(val2);
            if (
                areObjects && !this.deepEquals(val1, val2) ||
                !areObjects && val1 !== val2
            ) {
                return false;
            }
        }
        return true;
    }

    static isObject(object) {
        return object != null && typeof object === 'object';
    }

}
