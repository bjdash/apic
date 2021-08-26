//@ts-check
import { Const } from './constants';
import apic from './apic'

//TODO: Move all these to Utils.service, use static wherever required
export default {
    encodeUrl,
    getUrlParts,
    processEnv,
    doesExist,
    prepareQueryParams,
    removeQueryParams,
    copyToClipboard,
    prepareScript,
    objToArray,
    arrayToObj,
    getTestsCountByType,
    getRandomStr,
    removeHeader,
    addHeader,
    getReqV2,
    getReqBody,
    updateInMemEnv,
    interpolate
}


function encodeUrl(url) {
    return encodeURIComponent(url);
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

