//@ts-check
import { Const } from './constants';
import apic from './apic'

//TODO: Move all these to Utils.service, use static wherever required
export default {
    initXMLHttpRequest,
    encodeUrl,
    getUrlEncodedBody,
    getFormDataBody,
    getUrlParts,
    processEnv,
    doesExist,
    checkForHTTP,
    prepareQueryParams,
    removeQueryParams,
    copyToClipboard,
    prepareScript,
    prepareHeadersObj,
    objToArray,
    arrayToObj,
    getTestsCountByType,
    getRandomStr,
    parseURL,
    removeHeader,
    addHeader,
    notify,
    isNewVersion,
    getReqV2,
    getReqBody,
    getGqlBody,
    updateInMemEnv,
    interpolate,
    deepCopy,
    isElectron,
    getAppType
}



function initXMLHttpRequest() {
    XMLHttpRequest.prototype.addHeadersFromObj = function (headers) {
        var _this = this;

        for (var key in headers) {
            if (key && headers.hasOwnProperty(key)) {
                var val = headers[key];
                var header = key.toUpperCase();
                if (Const.restrictedHeaders.indexOf(header) > -1) {
                    header = 'APIC-' + header;
                }
                try {
                    _this.setRequestHeader(header, val);
                } catch (e) {
                    var m = e.message;
                    console.warn(m.slice(m.indexOf(':') + 1).trim());
                }
            }
        }
        return _this;
    };
}

function encodeUrl(url) {
    return encodeURIComponent(url);
}

function getUrlEncodedBody(xForms) {
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

function getFormDataBody(formData) {
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

function getUrlParts(url) {
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

function processEnv(vals) {
    if (vals.length >= 0) {
        var obj = {};
        for (var i = 0; i < vals.length; i++) {
            if (vals[i].key) {
                obj[vals[i].key] = vals[i].val;
            }
        }
        return obj;
    }
    return undefined;
}

function doesExist(list, value, field) {
    for (var i = 0; i < list.length; i++) {
        if (list[i][field] === value) {
            return true;
        }
    }
    return false;
}

function checkForHTTP(url) {
    if (url.indexOf('http') !== 0) {
        url = 'http://' + url;
    }
    return url;
}

//add query string to URL, params can be in 2 format
//[{key:'k1', val:'v1' }, {....}]
//or
//{k1:v1}
function prepareQueryParams(url, params) {
    var queryString = [];
    if (params instanceof Array) {//if params is an array of key value pair
        params.forEach(function (param) {
            if (param.key) {
                queryString.push(encodeUrl(param.key) + '=' + encodeUrl(param.val));
            }
        });
    } else { //params is an object
        var keys = Object.keys(params);
        for (var i = 0; i < keys.length; i++) {
            queryString.push(encodeUrl(keys[i]) + '=' + encodeUrl(params[keys[i]]));
        }
    }
    if (queryString.length > 0) {
        //check if URL already has querystrings
        if (url.indexOf('?') > 0) {
            return url + '&' + queryString.join('&');
        }
        return url + '?' + queryString.join('&');
    }
    return url;
}

function removeQueryParams(url, toBeRemoved) {
    //if which params to be removed are not specified, remove all
    if (!toBeRemoved || !(toBeRemoved instanceof Array))
        return url.split('?')[0];

    var urlParts = url.split('?');
    var querystring = urlParts[1], baseUrl = urlParts[0];
    if (!querystring)
        return url;

    var params = {};
    querystring.split('&').forEach(function (part) {
        var pair = part.split('=');
        params[pair[0]] = pair[1];
    });
    for (var i = 0; i < toBeRemoved.length; i++) {
        delete params[toBeRemoved[i]];
    }

    return prepareQueryParams(baseUrl, params);
}

function copyToClipboard(text) {
    var input = document.createElement('textarea');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('Copy');
    document.body.removeChild(input);
}

function prepareScript(code) {
    if (!code)
        return false;
    return '(function (){' + code + '})()';
}

function prepareHeadersObj(headerStr) {
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

function objToArray(obj, autoInit) {
    var arr = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            var val = obj[key];
            var arrObj = {
                key: key,
                val: val
            };
            arr.push(arrObj);
        }
    }
    if (autoInit) {
        arr.push({ key: '', val: '' });
    }
    return arr;
}

function arrayToObj(array) {
    var obj = {};
    for (var i = 0; i < array.length; i++) {
        if (array[i].key) {
            obj[array[i].key] = array[i].val;
        }
    }
    return obj;
}

function getTestsCountByType(list, type) {
    if (type === undefined) {
        return list.length;
    }
    return list.filter(function (item) {
        return item.success === type
    }).length;
}

function getRandomStr(length) {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    var str = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    if (length) {
        return str.substring(0, length);
    }
    return str;
}

function parseURL(href) {
    var match = href.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/);
    return match && {
        protocol: match[1],
        host: match[2],
        hostname: match[3],
        port: match[4],
        pathname: match[5],
        search: match[6],
        hash: match[7]
    };
}

function removeHeader(headerName, headerList) {
    if (!headerList)
        return;
    for (var i = 0; i < headerList.length; i++) {
        if (headerList[i].key === headerName) {
            headerList.splice(i, 1);
            --i;
        }
    }
    return headerList;
}

function addHeader(name, value, headerList, begining, addDuplicate) {
    if (!headerList)
        return;
    if (!addDuplicate) {
        removeHeader(name, headerList);
    }
    if (begining) {
        headerList.unshift({ key: name, val: value });
    } else {
        headerList.push({ key: name, val: value });
    }
    return headerList;
}

function notify(title, content, link, image) {
    if (!image)
        image = '/img/logo-tmp.png';
    if (typeof window.chrome !== "undefined" && window.chrome.notifications && window.chrome.notifications.create) {
        var optn = {
            type: "basic",
            title: title,
            message: content,
            iconUrl: image,
            buttons: [{
                title: "View"
            }]
        };
        window.chrome.notifications.create(apic.s8(), optn);
        window.chrome.notifications.onButtonClicked.addListener(function (notifId, btnIdx) {
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

function isNewVersion(newVersion, oldVersion) {
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

function getReqV2(req) {
    return {
        request: {
            url: req.url,
            method: req.method,
            headers: arrayToObj(req.Req.headers),
            query: arrayToObj(req.Req.url_params),
            bodyMeta: req.Body
        },
        // data:req.data, //sometimes this is req.Body.rawData
        env: req.env,
        prescript: req.prescript,
        postscript: req.postscript,
        respCodes: req.respCodes
    };
}

function getReqBody(body, type) {
    if (!body) return {};
    let bodyObj = {};
    try {
        switch (type) {
            case 'form-data':
                for (var pair of body.entries()) {
                    bodyObj[pair[0]] = pair[1];
                }
                return bodyObj;
            case 'x-www-form-urlencoded':
                var paramsList = body.split('&');
                paramsList.forEach(function (paramStr) {
                    var param = paramStr.split('=');
                    param[0] = decodeURIComponent(param[0].replace(/\+/g, '%20'))
                    param[1] = decodeURIComponent(param[1].replace(/\+/g, '%20'))
                    bodyObj[param[0]] = param[1]
                })
                return bodyObj;
            case 'raw':
            case 'graphql':
            default:
                return JSON.parse(body);

        }
    } catch (e) {
        return body || {}
    }
}

function getGqlBody(query, vars) {
    var variables = null;
    if (vars) variables = JSON.parse(vars.trim());
    var q = {
        query: query
    };
    if (variables) q.variables = variables;
    return JSON.stringify(q);
}

//TODO: update in mem env - replace rootscope
function updateInMemEnv(newEnvs) {
    if (newEnvs) {
        // if (!$rootScope.xtraEnv) {
        //     $rootScope.xtraEnv = {};
        // }
        // $rootScope.xtraEnv = angular.merge($rootScope.xtraEnv, newEnvs);
    }
}

//TODO: replace rootscope
function interpolate(data) {
    if (data) {
        // if (typeof data === 'string') {
        //     var mergedEnv = angular.copy($rootScope.getSelectedEnv().vals);
        //     if ($rootScope.xtraEnv) {
        //         mergedEnv = angular.merge({}, mergedEnv, $rootScope.xtraEnv);
        //     }
        //     return $interpolate(data)(mergedEnv);
        // } else if (data instanceof Array) {
        //     return data.map(function (item) {
        //         return interpolate(item);
        //     })
        // } else if (typeof data === 'object') {
        //     var keys = Object.keys(data);
        //     var interpolated = {};
        //     keys.forEach(function (key) {
        //         interpolated[interpolate(key)] = interpolate(data[key]);
        //     })
        //     return interpolated;
        // } else {
        //     return data;
        // }
    } else {
        return data;
    }
}

function deepCopy(inObject) {
    let outObject, value, key

    if (typeof inObject !== "object" || inObject === null) {
        return inObject // Return the value if inObject is not an object
    }

    // Create an array or object to hold the values
    outObject = Array.isArray(inObject) ? [] : {}

    for (key in inObject) {
        value = inObject[key]

        // Recursively (deep) copy for nested objects, including arrays
        outObject[key] = deepCopy(value)
    }
    return outObject
}

function isElectron() {
    return window.navigator.userAgent.toLowerCase().indexOf('electron') >= 0 ? true : false;
}

function getAppType() {
    if (isElectron()) {
        return 'ELECTRON';
    } else if (window.location && window.location.protocol === 'chrome-extension:') {
        return 'CHROME';
    } else {
        return 'WEB';
    }
}