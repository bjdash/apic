/* global chrome, Sway, SchemaDref, Stomp, SwaggerParser */

(function () {
    'use strict';

    angular
        .module('apic')
        .factory('Utils', Utils)
        .factory('HttpService', HttpService)
        .factory('iDB', IndexedDBServ)
        .factory('Tester', Tester)
        .factory('Reporter', Reporter)
        .factory('DocBuilder', DocBuilder)
        .factory('User', User)
        .factory('StompSocket', StompSocket)
        .factory('DataBuilder', DataBuilder)
        .factory('TestBuilder', TestBuilder)
        .factory('GraphQL', GraphQL)
        .factory('HistoryServ', HistoryServ);


    Utils.$inject = ['$q', '$rootScope', '$interpolate', 'Const'];
    function Utils($q, $rootScope, $interpolate, Const) {
        var service = {
            encodeUrl: encodeUrlParams,
            getUrlEncodedBody: getUrlEncodedBody,
            getFormDataBody: getFormDataBody,
            getUrlParts: getUrlParts,
            processEnv: processEnv,
            doesExist: doesExist,
            checkForHTTP: checkForHTTP,
            prepareQueryParams: prepareQueryParams,
            removeQueryParams: removeQueryParams,
            copyToClipboard: copyToClipboard,
            prepareScript: prepareScript,
            prepareHeadersObj: prepareHeadersObj,
            objToArray: objToArray,
            arrayToObj: arrayToObj,
            getTestsCountByType: getTestsCountByType,
            getRandomStr: getRandomStr,
            parseURL: parseURL,
            removeHeader: removeHeader,
            addHeader: addHeader,
            storage: {
                get: storageGet,
                set: storageSet,
                remove: storageRemove
            },
            notify: notify,
            isNewVersion: isNewVersion,
            getReqV2: getReqV2,
            getReqBody: getReqBody,
            getGqlBody: getGqlBody,
            updateInMemEnv: updateInMemEnv,
            assertBuilder: assertBuilder,
            interpolate: interpolate,
            harToApicReq: harToApicReq,
            urlToReqName: urlToReqName
        }


        function encodeUrlParams(url) {
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
                angular.forEach(params, function (param) {
                    if (param.key) {
                        queryString.push(encodeUrlParams(param.key) + '=' + encodeUrlParams(param.val));
                    }
                });
            } else { //params is an object
                var keys = Object.keys(params);
                for (var i = 0; i < keys.length; i++) {
                    queryString.push(encodeUrlParams(keys[i]) + '=' + encodeUrlParams(params[keys[i]]));
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
            if (!toBeRemoved || !toBeRemoved instanceof Array)
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
            input.style.opacity = 0;
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
            angular.forEach(obj, function (val, key) {
                var obj = {
                    key: key,
                    val: val
                };
                arr.push(obj);
            });
            if (autoInit) {
                arr.push({ key: '', val: '' });
            }
            return arr;
        }

        function arrayToObj(array) {
            var obj = {};
            for (var i = 0; i < array.length; i++) {
                if (array[i].key) {
                    if (array[i].hasOwnProperty('active')) {
                        if (array[i].active) obj[array[i].key] = array[i].val;
                    } else { //if active property missing assume active by defaule - older implementation
                        obj[array[i].key] = array[i].val;
                    }
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

        function storageGet(key) {
            var defer = $q.defer();
            if (localStorage) {
                var res = {};
                if (key instanceof Array) { //return multiple values
                    for (var i = 0; i < key.length; i++) {
                        res[key[i]] = localStorage.getItem(key[i]);
                    }
                } else {
                    res[key] = localStorage.getItem(key);
                }
                defer.resolve(res);
            } else if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(key, function (result) {
                    defer.resolve(result);
                });
            }

            return defer.promise;
        }
        function storageSet(key, val) {
            var defer = $q.defer();
            if (localStorage) {
                if (typeof key === 'string') {
                    localStorage.setItem(key, val);
                } else {
                    angular.forEach(key, function (value, prop) {
                        localStorage.setItem(prop, value);
                    });
                }
                defer.resolve(true);
            } else if (chrome && chrome.storage && chrome.storage.local) {
                var obj = {};
                if (typeof key === 'string') {
                    obj[key] = val;
                } else {
                    obj = key;
                }
                chrome.storage.local.set(obj, function () {
                    defer.resolve(true);
                });
            }

            return defer.promise;
        }
        function storageRemove(key) {
            var defer = $q.defer();
            if (localStorage) {
                if (key instanceof Array) {
                    var res = [];
                    for (var i = 0; i < key.length; i++) {
                        res.push(localStorage.removeItem(key[i]));
                    }
                    defer.resolve(res);
                } else {
                    defer.resolve(localStorage.removeItem(key));
                }
            } else if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove(key, function () {
                    defer.resolve(true);
                });
            }
            return defer.promise;
        }

        function notify(title, content, link, image) {
            if (!image)
                image = '/img/logo-tmp.png';
            if (typeof chrome !== "undefined" && chrome.notifications && chrome.notifications.create) {
                var optn = {
                    type: "basic",
                    title: title,
                    message: content,
                    iconUrl: image,
                    buttons: [{
                        title: "View"
                    }]
                };
                chrome.notifications.create(s8(), optn);
                chrome.notifications.onButtonClicked.addListener(function (notifId, btnIdx) {
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
                respCodes: req.respCodes,
                savedResp: req.savedResp
            };
        }

        function harToApicReq(harEntry) {
            var harReq = harEntry.request;
            var req = {
                _id: apic.s12(),
                disabled: undefined,
                method: harReq.method,
                url: harReq.url,
                name: urlToReqName(harReq.method, harReq.url),
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
                    type: 'raw',
                    selectedRaw: {}
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
                if (!Const.restrictedHeaders.includes(headerName) && !headerName.startsWith('SEC-') && !headerName.startsWith('PROXY-')) {
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
                        data: easyJsonSchema(jsonResp)
                    })
                } catch (e) {
                    console.log('response is not in json', harResp.content.text);
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

        function getReqBody(body, type) {
            if (!body) return {};
            try {
                switch (type) {
                    case 'form-data':
                        var bodyObj = {};
                        for (var pair of body.entries()) {
                            bodyObj[pair[0]] = pair[1];
                        }
                        return bodyObj;
                    case 'x-www-form-urlencoded':
                        var paramsList = body.split('&');
                        var bodyObj = {};
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

        function updateInMemEnv(newEnvs) {
            if (newEnvs) {
                if (!$rootScope.xtraEnv) {
                    $rootScope.xtraEnv = {};
                }
                $rootScope.xtraEnv = angular.merge($rootScope.xtraEnv, newEnvs);
            }
        }

        function assertBuilder(a, b, type, not) {
            //type = eql, gt, gte, lt, lte, a (to.be.a('string')),include
            var be = ['eql', 'gt', 'gte', 'lt', 'lte', 'a', 'an'];
            if (!type) type = 'eql';
            return 'expect(' + a + ')' + (not ? '.not' : '') + '.to' + (be.indexOf(type) > -1 ? '.be' : '') + '.' + type + '(' + b + ')';
        }

        function interpolate(data) {
            if (data) {
                if (typeof data === 'string') {
                    var mergedEnv = angular.copy($rootScope.getSelectedEnv().vals);
                    if ($rootScope.xtraEnv) {
                        mergedEnv = angular.merge({}, mergedEnv, $rootScope.xtraEnv);
                    }
                    return $interpolate(data)(mergedEnv);
                } else if (data instanceof Array) {
                    return data.map(function (item) {
                        return interpolate(item);
                    })
                } else if (typeof data === 'object') {
                    var keys = Object.keys(data);
                    var interpolated = {};
                    keys.forEach(function (key) {
                        interpolated[interpolate(key)] = interpolate(data[key]);
                    })
                    return interpolated;
                } else {
                    return data;
                }
            } else {
                return data;
            }
        }

        function urlToReqName(method, url) {
            var urlParts = getUrlParts(url);
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

        return service;
    }

    HttpService.$inject = ['$http'];
    function HttpService($http) {

        var service = {
            get: getItem,
            create: createItem,
            delete: deleteItem
        };

        return service;

        function getItem(url, params) {
            if (!params) {
                params = {};
            }
            var request = {
                method: 'GET',
                url: url,
                params: params
            };
            return $http(request).then(function (response) {
                return response.data;
            });
        }

        function createItem(url, data) {
            if (!data) {
                data = {};
            }
            var request = {
                method: 'POST',
                url: url,
                data: data
            };
            return $http(request).then(function (response) {
                return response.data;
            });
        }

        function deleteItem(params, url) {
            if (!params) {
                params = {};
            }
            var request = {
                method: 'DELETE',
                url: url,
                params: params
            };
            return $http(request).then(function (response) {
                return response.data;
            });
        }
    }

    IndexedDBServ.$inject = ['$indexedDB', '$q'];
    function IndexedDBServ($indexedDB, $q) {
        var service = {};
        service.insert = function (table, value) {
            return $indexedDB.openStore(table, function (store) {
                return store.insert(value).then(function (e) {
                    return e;
                });
            });
        };

        service.upsert = function (table, value) {
            return $indexedDB.openStore(table, function (store) {
                return store.upsert(value).then(function (e) {
                    return e;
                });
            });
        };
        service.read = function (table) {
            return $indexedDB.openStore(table, function (store) {
                return store.getAll().then(function (data) {
                    return data;
                });
            });
        };

        service.readSorted = function (table, field, order) {
            return $indexedDB.openStore(table, function (data) {
                var find = data.query();
                if (order === 'asc') {
                    find.$asc(field);
                } else {
                    find.$desc(field);
                }
                return data.eachWhere(find).then(function (data) {
                    return data;
                });
            });
        };

        service.delete = function (table, id) {
            return $indexedDB.openStore(table, function (store) {
                return store.delete(id).then(function (data) {
                    return data;
                });
            });
        };

        service.deleteMulti = function (table, ids) {
            var promises = [], dfr = $q.defer();
            for (var i = 0; i < ids.length; i++) {
                var p = $indexedDB.openStore(table, function (store) {
                    return store.delete(ids[i]).then(function (data) {
                        return data;
                    });
                });
                promises.push(p);
            }

            $q.all(promises).then(function () {
                dfr.resolve();
            }, function () {
                dfr.reject();
            });
            return dfr.promise;
        };

        service.findByKey = function (table, key, value) {
            return $indexedDB.openStore(table, function (store) {
                return store.findBy(key, value).then(function (data) {
                    return data;
                });
            });
        };

        service.getByIds = function (table, key, ids, extra) {
            var dfr = $q.defer(), promises = [], returnData = [];
            return $indexedDB.openStore(table, function (store) {
                for (var i = 0; i < ids.length; i++) {
                    var p = store.findBy(key, ids[i]).then(function (data) {
                        returnData.push(data);
                        return data;
                    });
                    promises.push(p);
                }
                $q.all(promises).then(function () {
                    dfr.resolve({ data: returnData, extra: extra });
                }, function () {
                    dfr.resolve({ data: returnData, extra: extra });
                });
                return dfr.promise;

            });
        };

        service.clear = function (table) {
            return $indexedDB.openStore(table, function (store) {
                return store.clear().then(function () {
                    return true;
                });
            });
        };

        return service;
    }

    Tester.$inject = [];
    function Tester() {
        var service = {};
        service.run = run;

        function run(script) {
            var sandBox = $('#tester')[0];
            if (sandBox && sandBox.contentWindow) {
                sandBox.contentWindow.postMessage(script, '*');
            } else {
                console.error('Script runner sandbox not loaded');
            }
        }

        return service;
    }

    Reporter.$inject = ['$http'];
    function Reporter($http) {
        var service = {};
        service.suitReport = suitReport;

        function suitReport(runRes, suitName) {
            return $http.get('modules/reports/suitReport.html').then(function (resp) {
                if (resp.data) {
                    var data = resp.data.replace('{{brand}}', suitName);
                    data = data.replace('{{title}}', suitName + '- apic test report');
                    data = data.replace('{{totalReqs}}', runRes.results.length);

                    var passed = 0, failed = 0, reqList = '', reqDetail = '';
                    var reqDetailTemp = '<div class="detail" id="detail-req{{id}}"><div class="title">{{name}}</div><div class="url"><span class="{{method}}">{{method}}</span> <span>{{url}}</span></div><div><span class="{{statusClass}} tag">{{status}}</span><span class="info tag">Time taken: {{time}}</span></div><table class="table"><tr><th>Test Case</th><th style="width:100px;">Status</th></tr>{{tests}}</table></div>';
                    for (var i = 0; i < runRes.results.length; i++) {
                        var request = runRes.results[i];
                        reqList += '<div class="req" id="req' + i + '" onclick="showDetail(this.id)">' + request.name + '</div>';
                        var detail = reqDetailTemp.replace('{{name}}', request.name);
                        detail = detail.replace('{{id}}', i);
                        detail = detail.replace('{{url}}', request.url);
                        detail = detail.replace(/{{method}}/g, request.method);

                        if (!request.disabled) {
                            passed += request.tests.passed;
                            failed += request.tests.failed;

                            detail = detail.replace('{{status}}', request.response.status + ' ' + request.response.statusText);
                            detail = detail.replace('{{time}}', request.response.timeTaken >= 1000 ? (request.response.timeTaken / 1000) + ' s' : request.response.timeTaken + ' ms');

                            var statusClass = '';
                            switch (request.response.status.toString().charAt(0)) {
                                case '1':
                                    statusClass = 'info';
                                    break;
                                case '2':
                                    statusClass = 'success';
                                    break;
                                case '3':
                                    statusClass = 'warning';
                                    break;
                                case '4':
                                case '5':
                                    statusClass = 'error';
                                    break;
                            }
                            detail = detail.replace('{{statusClass}}', statusClass);

                            var tests = '';
                            for (var j = 0; j < request.tests.cases.length; j++) {
                                var status = request.tests.cases[j].success ? 'Passed' : 'Failed';
                                tests += '<tr><td>' + request.tests.cases[j].name + (request.tests.cases[j].success ? '' : ('<div class="red">' + request.tests.cases[j].reason + '</div>')) + '</td><td><div class="' + status + '">' + status + '</div></td></tr>';
                            }
                            detail = detail.replace('{{tests}}', tests);
                        } else {
                            detail = detail.replace('{{status}}', 'Request disabled');
                            detail = detail.replace('{{time}}', 'NA');
                            detail = detail.replace('{{statusClass}}', 'disabled');
                            detail = detail.replace('{{tests}}', 'This request was disabled during run, hence the tests were not executed.');
                        }
                        reqDetail += detail;
                    }
                    data = data.replace('{{reqList}}', reqList);


                    data = data.replace('{{tests}}', passed + failed);
                    data = data.replace('{{passed}}', passed);
                    data = data.replace('{{failed}}', failed);
                    if (passed + failed > 0) {
                        data = data.replace('{{percent}}', (passed / (passed + failed) * 100).toFixed(2));
                    } else {
                        data = data.replace('{{percent}}', 0);
                    }

                    data = data.replace('{{details}}', reqDetail);

                    return data;
                }
                return '';
            }, function (err) {
                return err;
            });
        }

        return service;
    }

    DocBuilder.$inject = ['JsonSchema', '$q'];
    function DocBuilder(JsonSchema, $q) {
        var service = {};
        service.exportOAS = exportOAS;
        service.exportRAW = exportRAW;
        service.getResolvedSpec = getResolvedSpec;
        service.getParsedSpec = getParsedSpec;
        service.importOAS2 = importOAS2;

        function exportOAS(proj, type) {
            var obj = {};
            obj.swagger = '2.0';
            obj.info = {
                title: proj.title,
                description: proj.description,
                version: proj.version,
                termsOfService: proj.termsOfService
            };

            if (proj.contact) {
                obj.info.contact = {
                    name: proj.contact.name,
                    url: proj.contact.url,
                    email: proj.contact.email
                };
            }

            if (proj.license) {
                obj.info.license = {
                    name: proj.license.name,
                    url: proj.license.url
                };
            }

            if (proj.setting) {
                if (proj.setting.basePath) {
                    obj.basePath = proj.setting.basePath;
                }
                if (proj.setting.host) {
                    obj.host = proj.setting.host;
                }
                if (proj.setting.protocol) {
                    obj.schemes = [proj.setting.protocol];
                }
            }

            if (proj.securityDefinitions && proj.securityDefinitions.length > 0) {
                var secDefs = {};
                proj.securityDefinitions.forEach(function (def) {
                    var defObj = {
                        type: def.type,
                        description: def.description || ''
                    }
                    switch (def.type) {
                        case 'apiKey':
                            defObj.in = def.apiKey.in;
                            defObj.name = def.apiKey.name;
                            break;
                        case 'oauth2':
                            defObj.flow = def.oauth2.flow;
                            defObj.authorizationUrl = def.oauth2.authorizationUrl;
                            defObj.tokenUrl = def.oauth2.tokenUrl;
                            defObj.scopes = {};
                            if (def.oauth2.scopes.length > 0) {
                                def.oauth2.scopes.forEach(function (s) {
                                    defObj.scopes[s.key] = s.val;
                                })
                            }
                            break;
                    }
                    secDefs[def.name] = defObj;
                })
                obj.securityDefinitions = secDefs;
            }

            obj.definitions = {};
            //add definitions/models
            angular.forEach(proj.models, function (model) {
                // if(model.data.type instanceof Array && model.data.type.length === 1){
                //     model.data.type = model.data.type[0];
                // }
                model.data = JsonSchema.sanitizeModel(model.data);
                obj.definitions[model.nameSpace] = model.data;
            });

            obj.responses = {};
            obj.parameters = {};
            //adding responses and parameters from traits
            angular.forEach(proj.traits, function (trait) {
                var responses = trait.responses;
                var tName = trait.name.replace(/\s/g, ' ');

                for (var i = 0; i < responses.length; i++) {
                    //var schema = JsonSchema.obj2schema(responses[i].data, proj.models);
                    var schema = responses[i].data;
                    var name = 'trait:' + tName + ':' + responses[i].code;
                    obj.responses[name] = {
                        schema: schema,
                        description: responses[i].desc ? responses[i].desc : ''
                    };
                }

                if (trait.pathParams) {
                    angular.forEach(trait.pathParams.properties, function (schema, key) {
                        var param = {
                            name: key,
                            in: 'path',
                            description: schema.description ? schema.description : '',
                            required: trait.pathParams.required && trait.pathParams.required.indexOf(key) >= 0 ? true : false
                        };
                        //var paramExtra = getParam(schema);
                        angular.merge(param, param, schema);
                        var name = 'trait:' + tName + ':' + key;
                        obj.parameters[name] = param;
                    });
                }

                angular.forEach(trait.queryParams.properties, function (schema, key) {
                    var param = {
                        name: key,
                        in: 'query',
                        description: schema.description ? schema.description : '',
                        required: trait.queryParams.required && trait.queryParams.required.indexOf(key) >= 0 ? true : false
                    };
                    //var paramExtra = getParam(schema);
                    angular.merge(param, param, schema);
                    var name = 'trait:' + tName + ':' + key;
                    obj.parameters[name] = param;
                });

                angular.forEach(trait.headers.properties, function (schema, key) {
                    var param = {
                        name: key,
                        in: 'header',
                        description: schema.description ? schema.description : '',
                        required: trait.headers.required && trait.headers.required.indexOf(key) >= 0 ? true : false
                    };
                    angular.merge(param, param, schema);
                    var name = 'trait:' + tName + ':' + key;
                    obj.parameters[name] = param;
                });
            });




            obj.paths = {};
            //add paths
            angular.forEach(proj.endpoints, function (endp) {
                if (obj.paths[endp.path] === undefined) {
                    obj.paths[endp.path] = {};
                }
                if (obj.paths[endp.path][endp.method] === undefined) {
                    obj.paths[endp.path][endp.method] = {};
                }
                var reqObj = {
                    tags: endp.tags,
                    summary: endp.summary,
                    description: endp.description,
                    //operationId: endp.operationId,
                    consumes: endp.consumes,
                    produces: endp.produces,
                    schemes: [],
                };
                if (endp.security) {
                    reqObj.security = [];
                    endp.security.forEach(function (sec) {
                        var secObj = {};
                        secObj[sec.name] = [];
                        reqObj.security.push(secObj);
                    });
                }
                if (endp.operationId) {
                    reqObj.operationId = endp.operationId;
                }
                for (var i = 0; i < endp.schemes.length; i++) {
                    reqObj.schemes.push(endp.schemes[i].key);
                }
                reqObj.responses = {};
                for (var j = 0; j < endp.responses.length; j++) {
                    var code = endp.responses[j].code;
                    reqObj.responses[code] = {};
                    //var schema = JsonSchema.obj2schema(endp.responses[j].data, proj.models);
                    var schema = endp.responses[j].data;
                    reqObj.responses[code].schema = schema;
                    //TODO: Add description
                    reqObj.responses[code].description = endp.responses[j].desc ? endp.responses[j].desc : '';
                }

                reqObj.parameters = [];
                //add query parameters
                angular.forEach(endp.queryParams.properties, function (schema, key) {
                    var param = {
                        name: key,
                        in: 'query',
                        description: schema.description ? schema.description : '',
                        required: endp.queryParams.required && endp.queryParams.required.indexOf(key) >= 0 ? true : false
                    };
                    //var paramExtra = getParam(schema);
                    angular.merge(param, param, schema);
                    reqObj.parameters.push(param);
                });

                angular.forEach(endp.headers.properties, function (schema, key) {
                    var param = {
                        name: key,
                        in: 'header',
                        description: schema.description ? schema.description : '',
                        required: endp.headers.required && endp.headers.required.indexOf(key) >= 0 ? true : false
                    };
                    //var paramExtra = getParam(schema);
                    angular.merge(param, param, schema);
                    reqObj.parameters.push(param);
                });

                angular.forEach(endp.pathParams.properties, function (schema, key) {
                    var param = {
                        name: key,
                        in: 'path',
                        description: schema.description ? schema.description : '',
                        required: endp.pathParams.required && endp.pathParams.required.indexOf(key) >= 0 ? true : false
                    };
                    //var paramExtra = getParam(schema);
                    angular.merge(param, param, schema);
                    reqObj.parameters.push(param);
                });

                if (endp.body) { //if the trait has body add body params
                    switch (endp.body.type) {
                        case 'raw':
                            var param = {
                                name: 'body',
                                in: 'body',
                                schema: endp.body.data
                                //description: schema.description ? schema.description : '',
                                //required: endp.body.data[x].required ? true : false
                            };
                            reqObj.parameters.push(param);
                            break;
                        case 'form-data':
                        case 'x-www-form-urlencoded':
                            for (var x = 0; x < endp.body.data.length; x++) {
                                var param = {
                                    name: endp.body.data[x].key,
                                    in: 'formData',
                                    type: endp.body.data[x].type,
                                    description: endp.body.data[x].desc ? endp.body.data[x].desc : '',
                                    required: endp.body.data[x].required ? true : false
                                };
                                if (param.type === 'array') {
                                    param.items = {
                                        type: 'string'
                                    };
                                }
                                reqObj.parameters.push(param);
                            }
                            break;
                    }
                }

                //importing details from traits
                for (var j = 0; j < endp.traits.length; j++) {
                    var traitObj = proj.traits[endp.traits[j]._id];
                    var tName = traitObj.name;
                    //responses
                    for (var i = 0; i < traitObj.responses.length; i++) {
                        var xPath = 'trait:' + tName + ':' + traitObj.responses[i].code;
                        if (obj.responses[xPath] && !traitObj.responses[i].noneStatus) {
                            var schema = {
                                '$ref': '#/responses/' + xPath
                            };
                            reqObj.responses[traitObj.responses[i].code] = schema;
                        }
                    }

                    if (traitObj.pathParams) {
                        angular.forEach(traitObj.pathParams.properties, function (schema, key) {
                            var xPath = 'trait:' + tName + ':' + key;
                            if (obj.parameters[xPath]) {
                                reqObj.parameters.push({
                                    '$ref': '#/parameters/' + xPath
                                });
                            } else {
                                console.error('Used path "' + xPath + '" not found in responses (from traits).');
                            }
                        });
                    }

                    angular.forEach(traitObj.queryParams.properties, function (schema, key) {
                        var xPath = 'trait:' + tName + ':' + key;
                        if (obj.parameters[xPath]) {
                            reqObj.parameters.push({
                                '$ref': '#/parameters/' + xPath
                            });
                        } else {
                            console.error('Used path "' + xPath + '" not found in responses (from traits).');
                        }
                    });

                    //query params
                    angular.forEach(traitObj.headers.properties, function (schema, key) {
                        var xPath = 'trait:' + tName + ':' + key;
                        if (obj.parameters[xPath]) {
                            reqObj.parameters.push({
                                '$ref': '#/parameters/' + xPath
                            });
                        } else {
                            console.error('Used path "' + xPath + '" not found in responses (from traits).');
                        }
                    });

                    //header params
                }

                obj.paths[endp.path][endp.method] = reqObj;
            });

            if (type === 'string') {
                return JSON.stringify(obj, null, '    ');
            }
            return obj;
        }

        function exportRAW(proj, type) {
            delete proj.owner;
            delete proj.team;
            delete proj.simKey;
            var rawProj = {
                TYPE: 'APIC Api Project',
                value: proj
            };
            if (type === 'string') {
                try {
                    rawProj = JSON.stringify(rawProj, null, '    ');
                } catch (e) {
                    rawProj = 'Failed to export project';
                }
            }
            return rawProj;
        }

        function getResolvedSpec(proj) {
            var deffer = $q.defer();
            var spec = exportOAS(proj);
            SwaggerParser.dereference(spec, {
                dereference: {
                    circular: 'ignore'
                }
            })
                .then(function (resolvedSpec) {
                    deffer.resolve(resolvedSpec);
                }).catch(function (err) {
                    console.error(err);
                    deffer.reject(err);
                });
            return deffer.promise;
        }

        function getParsedSpec(proj) {
            var deffer = $q.defer();
            var spec = exportOAS(proj);
            SwaggerParser.parse(spec, {
                dereference: {
                    circular: 'ignore'
                }
            })
                .then(function (resolvedSpec) {
                    deffer.resolve(resolvedSpec);
                }).catch(function (err) {
                    console.error(err);
                    deffer.reject(err);
                });
            return deffer.promise;
        }

        function importOAS2(spec, optn) {
            if (!spec.swagger) {
                return;
            }
            if (!optn)
                optn = {};
            var proj = {
                title: '',
                description: '',
                version: '',
                termsOfService: ''
            };

            if (spec.info) {
                proj.title = spec.info.title ? spec.info.title : '';
                proj.description = spec.info.description ? spec.info.description : '';
                proj.version = spec.info.version ? spec.info.version : '';
                proj.termsOfService = spec.info.termsOfService ? spec.info.termsOfService : '';

                if (spec.info.contact) {
                    proj.contact = {};
                    proj.contact.name = spec.info.contact.name ? spec.info.contact.name : '';
                    proj.contact.url = spec.info.contact.url ? spec.info.contact.url : '';
                    proj.contact.email = spec.info.contact.email ? spec.info.contact.email : '';
                }

                if (spec.info.license) {
                    proj.license = {};
                    proj.license.name = spec.info.license.name ? spec.info.license.name : '';
                    proj.license.url = spec.info.license.url ? spec.info.license.url : '';
                }
            }

            //importing host, basePath etc and creating env from it
            proj.setting = {};
            proj.setting.basePath = spec.basePath ? spec.basePath : '';
            proj.setting.host = spec.host ? spec.host : '';
            proj.setting.protocol = spec.schemes && spec.schemes.length > 0 ? spec.schemes[0] : 'http';

            proj.models = {};
            proj.folders = {};
            proj.traits = {};
            proj.endpoints = {};

            //importing securityDefinitions
            proj.securityDefinitions = [];
            if (spec.securityDefinitions) {
                angular.forEach(spec.securityDefinitions, function (def, name) {
                    var secdef = {
                        name: name,
                        type: def.type,
                        description: def.description
                    }
                    switch (def.type) {
                        case 'apiKey':
                            secdef.apiKey = {
                                in: def.in,
                                name: def.name
                            }
                            break;
                        case 'oauth2':
                            secdef.oauth2 = {
                                flow: def.flow,
                                authorizationUrl: def.authorizationUrl,
                                tokenUrl: def.tokenUrl,
                                scopes: []
                            }
                            angular.forEach(def.scopes, function (desc, scope) {
                                secdef.oauth2.scopes.push({ key: scope, val: desc });
                            })
                            if (secdef.oauth2.scopes.length === 0) {
                                secdef.oauth2.scopes.push({ key: '', val: '' });
                            }
                            break;
                    }
                    proj.securityDefinitions.push(secdef);
                })
            }

            //Parsing Model
            if (spec.definitions) {
                //create a folder called models to hold models
                var modelFolder = {
                    _id: s12(),
                    name: 'Models',
                    desc: 'This folder will contain all the models.'
                };
                proj.folders[modelFolder._id] = modelFolder;

                angular.forEach(spec.definitions, function (model, name) {
                    var id = s12(), newModel = {};
                    newModel._id = id;
                    newModel.name = name;
                    newModel.nameSpace = name;
                    //add type if missing
                    if (!model.type) {
                        if (model.properties) model.type = 'object';
                        else if (model.items) model.type = 'array';
                        else if (model.$ref) delete model.type;
                        else model.type = 'string';
                    }
                    newModel.data = JsonSchema.sanitizeModel(model);
                    newModel.folder = modelFolder._id;

                    proj.models[newModel._id] = newModel;
                });
            }

            //reading parameters (add in trait)
            if (spec.parameters) {
                angular.forEach(spec.parameters, function (param, name) {
                    var traitName = '';
                    if (name.indexOf('trait') === 0 && (name.match(/:/g) || []).length === 2) {
                        traitName = name.split(':')[1];
                    } else {
                        traitName = name;
                    }
                    //check if trait is already there
                    var tmpTrait;
                    angular.forEach(proj.traits, function (trait) {
                        if (trait.name === traitName) {
                            tmpTrait = trait;
                        }
                    });

                    //if trait is not there create one
                    if (!tmpTrait) {
                        tmpTrait = {
                            _id: s12(),
                            name: traitName,
                            queryParams: {
                                type: ["object"],
                                properties: {},
                                required: []
                            },
                            headers: {
                                type: ["object"],
                                properties: {},
                                required: []
                            },
                            pathParams: {
                                type: ["object"],
                                properties: {},
                                required: []
                            },
                            responses: []
                        };
                        proj.traits[tmpTrait._id] = tmpTrait;
                    }

                    var type;
                    switch (param.in) {
                        case 'header':
                            type = 'headers';
                            break;
                        case 'query':
                            type = 'queryParams';
                            break;
                        case 'path':
                            type = 'pathParams';
                            break;
                        default:
                            console.error(param.in + ' is not yet supported in params (trait).');
                    }
                    if (['header', 'query', 'path'].indexOf(param.in) >= 0) {
                        tmpTrait[type].properties[param.name] = {
                            type: param.type,
                            default: param.default ? param.default : '',
                            description: param.description ? param.description : ''
                        };
                        if (param.items) {
                            tmpTrait[type].properties[param.name].items = param.items;
                        }
                        if (param.required) {
                            tmpTrait[type].required.push(param.name);
                        }
                    } else {
                        //TODO: Add support for other params
                        //console.error(param.in + ' is not yet supported');
                    }
                });
            }//if(spec.parameters)


            if (spec.responses) {
                angular.forEach(spec.responses, function (resp, name) {
                    var traitName = '', code = name, noneStatus;
                    if (name.indexOf('trait') === 0 && name.indexOf(':') > 0) {
                        traitName = name.split(':')[1];
                        code = name.split(':')[2];
                        if (parseInt(code) != code) {
                            noneStatus = true;
                        }
                    } else {
                        traitName = name;
                        noneStatus = true;
                    }
                    //check if trait is already there
                    var tmpTrait;
                    angular.forEach(proj.traits, function (trait) {
                        if (trait.name === traitName) {
                            tmpTrait = trait;
                        }
                    });

                    //if trait is not there create one
                    if (!tmpTrait) {
                        tmpTrait = {
                            _id: s12(),
                            name: traitName,
                            queryParams: {
                                type: ['object'],
                                properties: {},
                                required: []
                            },
                            headers: {
                                type: ['object'],
                                properties: {},
                                required: []
                            },
                            pathParams: {
                                type: ['object'],
                                properties: {},
                                required: []
                            },
                            responses: []
                        };
                        proj.traits[tmpTrait._id] = tmpTrait;
                    }

                    //resp ->description, schema
                    var tmpResp = {
                        code: code,
                        data: resp.schema,
                        desc: resp.description,
                        noneStatus: noneStatus
                    };
                    tmpTrait.responses.push(tmpResp);

                });
            }

            //parsing endpoints
            if (spec.paths) {
                var folders = {};
                angular.forEach(spec.paths, function (apis, pathName) {
                    var fname = '';
                    if (optn.groupby === 'path') {
                        fname = pathName.substring(1, pathName.length);
                        fname = fname.substring(0, fname.indexOf('/') > 0 ? fname.indexOf('/') : fname.length);
                    }
                    var folderId;
                    if (fname) {
                        if (!folders[fname]) {
                            var pathFolder = {
                                _id: s12(),
                                name: fname,
                                desc: 'This folder contains the requests for endpoint ' + pathName
                            };
                            proj.folders[pathFolder._id] = pathFolder;
                            folders[fname] = folderId = pathFolder._id;
                        } else {
                            folderId = folders[fname];
                        }
                    }

                    angular.forEach(apis, function (path, method) {
                        if (optn.groupby === 'tag') {
                            var fname = 'Untagged';
                            if (path.tags && path.tags[0]) {
                                var fname = path.tags[0];
                            }
                            if (!folders[fname]) {
                                var pathFolder = {
                                    _id: s12(),
                                    name: fname,
                                    desc: 'This folder contains the requests for endpoint ' + pathName
                                };
                                proj.folders[pathFolder._id] = pathFolder;
                                folders[fname] = folderId = pathFolder._id;
                            } else {
                                folderId = folders[fname];
                            }
                        }
                        if (['get', 'post', 'put', 'delete', 'options', 'head', 'patch'].indexOf(method) >= 0) {
                            var tmpEndP = {
                                _id: s12(),
                                headers: {
                                    type: ['object'],
                                    properties: {},
                                    required: []
                                },
                                queryParams: {
                                    type: ['object'],
                                    properties: {},
                                    required: []
                                },
                                pathParams: {
                                    type: ['object'],
                                    properties: {},
                                    required: []
                                },
                                body: {
                                    type: '',
                                    data: []
                                },
                                traits: [],
                                responses: [],
                                folder: folderId
                            };
                            tmpEndP.path = pathName;
                            tmpEndP.method = method;
                            tmpEndP.tags = path.tags || [];
                            tmpEndP.summary = path.summary || pathName;
                            tmpEndP.description = path.description || '';
                            tmpEndP.description = path.description || '';
                            tmpEndP.operationId = path.operationId || '';
                            tmpEndP.consumes = path.consumes || [];
                            tmpEndP.produces = path.produces || [];
                            tmpEndP.schemes = path.schemes ? path.schemes.map(function (s) {
                                return { key: s.toLowerCase(), val: s };
                            }) : [];

                            if (path.parameters) {
                                for (var i = 0; i < path.parameters.length; i++) {
                                    var param = path.parameters[i];
                                    var ptype = undefined;
                                    switch (param.in) {
                                        case 'header':
                                            ptype = 'headers';
                                            break;
                                        case 'query':
                                            ptype = 'queryParams';
                                            break;
                                        case 'path':
                                            var ptype = 'pathParams';
                                            break;
                                        case 'body':
                                            ptype = 'body';
                                            break;
                                        case 'formData':
                                            ptype = 'formData';
                                            break;
                                        default:
                                            if (!param.$ref) {
                                                console.error('not supported', param);
                                            }
                                    }
                                    if (['headers', 'queryParams', 'pathParams'].indexOf(ptype) >= 0) {
                                        tmpEndP[ptype].properties[param.name] = {
                                            type: param.type,
                                            default: param.default ? param.default : '',
                                            description: param.description ? param.description : ''
                                        };
                                        if (param.items) {
                                            tmpEndP[ptype].properties[param.name].items = param.items;
                                        }
                                        if (param.required) {
                                            tmpEndP[ptype].required.push(param.name);
                                        }
                                    } else if (ptype === 'body') {
                                        tmpEndP.body = {
                                            type: 'raw',
                                            data: angular.copy(param.schema)
                                        };
                                    } else if (ptype === 'formData') {
                                        tmpEndP.body.type = 'x-www-form-urlencoded';
                                        if (tmpEndP.body.data.length === undefined)
                                            tmpEndP.body.data = [];
                                        tmpEndP.body.data.push({
                                            key: param.name,
                                            type: param.type,
                                            desc: param.description,
                                            required: param.required
                                        });
                                        if (param.type === 'file') {
                                            tmpEndP.body.type = 'form-data';
                                        }
                                    } else if (param.$ref) {
                                        var ref = param.$ref;
                                        var traitName = ref.substring(ref.lastIndexOf('/') + 1, ref.length);
                                        if (traitName.indexOf('trait') === 0 && (traitName.match(/:/g) || []).length === 2) {
                                            traitName = ref.split(':')[1];
                                        }
                                        var trait = getTraitByName(proj, traitName);
                                        if (trait) {//if trait not added then push it
                                            var existing = false;
                                            for (var j = 0; j < tmpEndP.traits.length; j++) {
                                                if (tmpEndP.traits[j]._id === trait._id) {
                                                    existing = true;
                                                    break;
                                                }
                                            }
                                            if (!existing) {
                                                tmpEndP.traits.push(trait);
                                            }
                                        } else {
                                            console.error('unresolved $ref: ' + ref);
                                        }
                                    }
                                }
                            }

                            if (path.responses) {
                                angular.forEach(path.responses, function (resp, statusCode) {
                                    var moveRespToTrait = false, refName;
                                    if (resp.$ref) {
                                        var ref = resp.$ref;
                                        var traitName = ref.substring(ref.lastIndexOf('/') + 1, ref.length);
                                        refName = traitName;
                                        if (traitName.indexOf('trait') === 0 && (traitName.match(/:/g) || []).length === 2) {
                                            var refSplit = ref.split(':');
                                            traitName = refSplit[1];
                                            if (parseInt(refSplit[2]) == refSplit[2]) {
                                                moveRespToTrait = true;
                                            }
                                            refName = refSplit[2];
                                        }
                                        if (moveRespToTrait) {
                                            var trait = getTraitByName(proj, traitName);
                                            if (trait) {//if trait not added then push it
                                                var existing = false;
                                                for (var j = 0; j < tmpEndP.traits.length; j++) {
                                                    if (tmpEndP.traits[j]._id === trait._id) {
                                                        existing = true;
                                                        break;
                                                    }
                                                }
                                                if (!existing) {
                                                    tmpEndP.traits.push(trait);
                                                }
                                            } else {
                                                console.error('unresolved $ref: ' + ref);
                                            }
                                        }
                                    }
                                    if (!resp.$ref || !moveRespToTrait) {
                                        var tmpResp = {
                                            data: resp.$ref ? ({ $ref: resp.$ref.substring(0, resp.$ref.lastIndexOf('/') + 1) + refName }) : (resp.schema || { type: 'object' }),
                                            desc: resp.description,
                                            code: statusCode
                                        };
                                        tmpEndP.responses.push(tmpResp);
                                    }
                                });
                            }

                            if (path.security) {
                                tmpEndP.security = [];
                                path.security.forEach(function (sec) {
                                    tmpEndP.security.push({ name: Object.keys(sec)[0] });
                                })
                            }
                            proj.endpoints[tmpEndP._id] = tmpEndP;
                        }



                    });
                });
            }

            /*var endp = {
             _id: undefined,operationId: '',method: 'get',schemes: [],path: '',folder: '',tags: [],consumes: [],produces: [],
             traits: [],summary: '',description: '',pathParams: undefined,queryParams: undefined,headers: undefined,responses: [],
             prerun:'',postrun:'',resp: {code: undefined,data: undefined},
             body: {type: 'raw',data: ''}
             };*/
            return proj;
        }

        function getTraitByName(proj, tName) {
            if (!proj || !proj.traits) {
                return;
            }
            var match;
            angular.forEach(proj.traits, function (trait) {
                if (trait.name === tName) {
                    match = {
                        _id: trait._id,
                        name: trait.name
                    };
                }
            });
            return match;
        }

        function getParam(entity) {
            var param = {};
            switch (entity._type) {
                case 'String':
                    param.type = 'string';
                    if (entity._minLength >= 0) {
                        param.minLength = entity._minLength;
                    }
                    if (entity._maxLength >= 0) {
                        param.maxLength = entity._maxLength;
                    }
                    if (entity._pattern) {
                        param.pattern = entity._pattern;
                    }
                    if (entity._format) {
                        param.format = entity._format;
                    }
                    break;
                case 'Integer':
                case 'Number':
                    param.type = entity._type === 'Integer' ? 'integer' : 'number';
                    if (entity._minimum >= 0) {
                        param.minimum = entity._minimum;
                    }
                    if (entity._maximum >= 0) {
                        param.maximum = entity._maximum;
                    }
                    if (entity._exclusiveMinimum) {
                        param.exclusiveMinimum = entity._exclusiveMinimum;
                    }
                    if (entity._exclusiveMaximum) {
                        param.exclusiveMaximum = entity._exclusiveMaximum;
                    }
                    if (entity._multipleOf >= 0) {
                        param.multipleOf = entity._multipleOf;
                    }
                    if (entity._format) {
                        param.format = entity._format;
                    }
                    break;
                case 'Boolean':
                    param.type = 'boolean';
                    break;
                case 'Array':
                    param.type = 'array';
                    if (entity._uniqueItems) {
                        param.uniqueItems = entity._uniqueItems;
                    }
                    if (entity._minItems >= 0) {
                        param.minItems = entity._minItems;
                    }
                    if (entity._maxItems >= 0) {
                        param.maxItems = entity._maxItems;
                    }
                    if (entity._items && entity._items[0]) {
                        param.items = JsonSchema.obj2schema(entity._items[0], {});
                    }
                    break;
            }
            return param;
        }

        return service;
    }

    User.$inject = ['$http', 'apicURLS', 'iDB', 'DemoData', '$rootScope', '$q', 'Utils', '$timeout'];
    function User($http, apicURLS, iDB, DemoData, $rootScope, $q, Utils, $timeout) {
        this.userData = {};
        var _this = this;
        var service = {
            setData: setData,
            getData: getData,
            getUID: getUID,
            getAuthToken: getAuthToken,
            logout: logout,
            doFirstRun: doFirstRun
        };

        function setData(data) {
            _this.userData = angular.copy(data);
        }

        function getData() {
            return _this.userData;
        }

        function getUID() {
            return _this.userData ? _this.userData.UID : undefined;
        }

        function getAuthToken() {
            return _this.userData ? _this.userData.AuthToken : undefined;
        }

        function logout() {
            var getReq = {
                method: 'GET',
                url: apicURLS.logout
            };
            return $http(getReq).then(function (resp) {
                if (resp.data && resp.data.status === 'ok') {
                    delete $http.defaults.headers.common['Authorization'];
                }
                return resp.data;
            });
        }

        function doFirstRun() {
            var defer = $q.defer();
            //detect for first run of APIC
            Utils.storage.get('firstRun').then(function (data) {
                if (!data || !data.firstRun) { //first run
                    $rootScope.openIntroModal();
                    var promises = [];

                    var pr1 = iDB.upsert('ApiProjects', DemoData.demoDesignProj), //install Demo design project
                        pr2 = iDB.upsert('Environments', DemoData.demoEnv), //add the environment for the project
                        //pr3 = iDB.upsert('folders', DemoData.demoFolder), //add Requests folder
                        //pr4 = iDB.upsert('savedRequests', DemoData.demoReqs), //add Requests
                        pr5 = iDB.upsert('Projects', DemoData.demoTestProj), //create the test project
                        pr6 = iDB.upsert('TestSuits', DemoData.demoSuit); //add the test suit

                    promises.push(pr1);
                    promises.push(pr2);
                    // promises.push(pr3);
                    // promises.push(pr4);
                    promises.push(pr5);
                    promises.push(pr6);
                    $q.all(promises).then(function () {
                        //add the demo environment in rootScope
                        if (!$rootScope.ENVS) {
                            $rootScope.ENVS = [];
                        }
                        $rootScope.ENVS.push(DemoData.demoEnv);
                        //mark first run complete
                        //Utils.storage.set('firstRun', true);
                        defer.resolve();
                    });
                }
            }, function (e) {
                defer.resolve();
                console.error(e);
            });

            return defer.promise;
        }
        return service;
    }

    StompSocket.$inject = [];
    function StompSocket() {
        var StompSocket = function (url, options, on_connect, on_message, on_error) {
            var self = this;
            this.url = url;
            this.on_message = on_message;
            this.on_connect = on_connect;
            this.on_error = on_error;
            this.options = {};
            if (options) {
                this.options = {};
                if (options.id) {
                    this.options.login = options.id;
                }
                if (options.psd) {
                    this.options.passcode = options.psd;
                }
                if (options.headers && options.headers.length > 0) {
                    for (var i = 0; i < options.headers.length; i++) {
                        if (options.headers[i].key) {
                            this.options[options.headers[i].key] = options.headers[i].val;
                        }
                    }
                }
                if (options.vhost) {
                    this.options.host = options.vhost;
                }
                this.subscUrl = options.subscUrl ? options.subscUrl : '';
            }

            self.connect = function () {
                if (self.url.indexOf('ws://') === 0 || self.url.indexOf('ws://') === 0) {
                    self.client = Stomp.client(self.url);
                } else {
                    var ws = new SockJS(self.url);
                    self.client = Stomp.over(ws);
                }
                self.client.heartbeat.outgoing = 60000;
                self.client.heartbeat.incoming = 0;
                self.client.connect(self.options, on_connection, self.on_error);
            };

            self.disconnect = function () {
                if (self.client) {
                    self.client.disconnect();
                }
            };

            self.send = function (q, headers, body) {
                self.client.send(q, headers, body);
            };

            var on_connection = function (x) {
                self.on_connect();
                self.client.subscribe(self.subscUrl, self.on_message);
            };
        };

        return StompSocket;
    }

    DataBuilder.$inject = ['JsonSchema', '$rootScope', 'DesignerServ'];
    function DataBuilder(JsonSchema, $rootScope, DesignerServ) {
        var service = {
            endpointToReqTab: endpointToReqTab
        };

        function endpointToReqTab(endp, project, autoSave, modelRefs, responsesRefs) {
            if (!modelRefs) {
                modelRefs = JsonSchema.getModeldefinitions(project.models);
            }
            if (!responsesRefs) {
                responsesRefs = DesignerServ.getTraitNamedResponsesObj(project)
            }

            var runObj = {
                //url: endp.path,
                method: endp.method.toUpperCase(),
                _id: autoSave ? (project._id + '-' + endp._id) : (new Date().getTime() + 'newtab'),
                description: endp.description,
                env: {
                    id: undefined
                },
                name: endp.summary + (autoSave ? '' : ':Endpoint'),
                postscript: endp.postrun ? endp.postrun : '',
                prescript: endp.prerun ? endp.prerun : '',
                respCodes: [],
                Req: {
                    headers: [],
                    url_params: []
                },
                Body: {}
            };

            //select an environment if we have settings(host, basePath) saved for the project
            if (project.setting) {
                // var url = project.setting.protocol + '://{{host}}';
                var url = '{{scheme}}{{host}}';
                var basePath = '';

                if (project.setting.basePath) {
                    basePath = '{{basePath}}';
                    if (project.setting.basePath.indexOf('/') !== 0) {
                        basePath = '/' + basePath;
                    }
                }
                var endpUrl = endp.path;
                var params = [], rxp = /{([^}]+)}/g, curMatch;

                while (curMatch = rxp.exec(endpUrl)) {
                    var match = curMatch[1];
                    endpUrl = endpUrl.replace('{' + match + '}', '{{' + match + '}}');
                }
                runObj.url = url + basePath + endpUrl;

                //select the environment for this project which is auto created while saving settings.
                if (project.setting.envId) {
                    for (var i = 0; i < $rootScope.ENVS.length; i++) {
                        if ($rootScope.ENVS[i]._id === project.setting.envId) {
                            runObj.env._id = project.setting.envId;
                            runObj.env.name = $rootScope.ENVS[i].name;
                            break;
                        }
                    }
                }
            } else {
                runObj.url = 'http://{{host}}' + endp.path;
            }

            //copy response codes and their respective schema
            if (endp.responses && endp.responses.length > 0) {
                for (var j = 0; j < endp.responses.length; j++) {
                    var tmpSchema = endp.responses[j].data.__ID__ ? JsonSchema.obj2schema(endp.responses[j].data, project.models) : endp.responses[j].data;
                    tmpSchema.definitions = angular.copy(modelRefs);
                    tmpSchema.responses = angular.copy(responsesRefs);
                    try {
                        runObj.respCodes.push({
                            code: endp.responses[j].code,
                            data: SchemaDref.parse(tmpSchema)
                        });
                    } catch (e) {
                        console.log('Circular JSON schema reference encountered.')
                    }
                }
            }

            //copy headers
            var headers = JsonSchema.obj2schema(endp.headers, project.models);
            if (headers && headers.properties) {
                angular.forEach(headers.properties, function (val, key) {
                    var h = { key: key, val: val.default ? val.default : '' };
                    runObj.Req.headers.push(h);
                });
            } else {
                runObj.Req.headers.push({ key: '', val: '' });
            }

            //copy query params
            var queryParams = JsonSchema.obj2schema(endp.queryParams, project.models);
            if (queryParams && queryParams.properties) {
                angular.forEach(queryParams.properties, function (val, key) {
                    runObj.Req.url_params.push({ key: key, val: val.default ? val.default : '' });
                });
            } else {
                runObj.Req.url_params.push({ key: '', val: '' });
            }

            //add auth details based on selected seccurity values
            if (endp.security && endp.security.length > 0 && project.securityDefinitions) {
                endp.security.forEach(function (selectedSec) {
                    var security = project.securityDefinitions.find(function (s) {
                        return s.name === selectedSec.name;
                    })
                    switch (security.type) {
                        case 'apiKey':
                            //TODO: check for in header/query
                            runObj.Req[security.apiKey.in === 'header' ? 'headers' : 'url_params'].unshift({ key: security.apiKey.name, val: '{{apiKey}}' });
                            break;
                        case 'basic':
                            runObj.Req.headers.unshift({ key: 'Authorization', val: '{{apic.basicAuth(basicAuthUser, basicAuthPassword)}}' });
                            break;
                    }
                })
            }

            //prepare body
            if (endp.body) {
                runObj.Body.type = endp.body.type;
                switch (runObj.Body.type) {
                    case 'raw':
                        runObj.Body.selectedRaw = { name: 'JSON', val: 'application/json' };
                        var schema = endp.body.data;
                        if (schema) {
                            schema.definitions = modelRefs;
                            var sampleData = {};
                            try {
                                sampleData = jsf(schema);
                            } catch (e) {
                                console.log('Failed to generate sample data');
                            }
                            runObj.Body.rawData = JSON.stringify(sampleData, null, '\t');
                        }
                        break;
                    case 'form-data':
                        runObj.Body.formData = [];
                        for (var x = 0; x < endp.body.data.length; x++) {
                            runObj.Body.formData.push({ key: endp.body.data[x].key, val: '' });
                        }
                        break;
                    case 'x-www-form-urlencoded':
                        runObj.Body.xForms = [];
                        for (var x = 0; x < endp.body.data.length; x++) {
                            runObj.Body.xForms.push({ key: endp.body.data[x].key, val: '' });
                        }
                        break;
                }
            }
            return runObj;
        }

        return service;
    }

    TestBuilder.$inject = [];
    function TestBuilder() {
        var service = {
            options: {
                statusCode: {
                    value: 'Status Code',
                    type: 'number',
                    text: 'Status Code',
                    code: '$response.status'
                },
                statusText: {
                    value: 'Status Text',
                    type: 'text',
                    text: 'Status Text',
                    code: '$response.statusText'
                },
                time: {
                    value: 'Time taken to complete (ms)',
                    type: 'number',
                    text: 'Response time',
                    code: '$response.timeTaken'
                },
                header: {
                    value: 'Header',
                    input: 'Response header name',
                    type: 'text',
                    text: 'Response header (%inp)',
                    code: ' $response.headers.getValue("%inp")'
                },
                respRaw: {
                    value: 'Response (Raw string)',
                    type: 'text',
                    text: 'Response raw body',
                    code: '$response.body'
                },
                respJson: {
                    value: 'Response (JSON)',
                    type: 'json',
                    input: 'Enter property path, eg users[0].address.city',
                    text: 'Response JSON body should have property %inp with value ',
                    code: '$response.data.%inp'
                },
                respSize: {
                    value: 'Response length',
                    type: 'number',
                    text: 'Response length',
                    code: '$response.body.length'
                }
            },
            ops: {
                '=': {
                    key: '=',
                    val: 'Equals',
                    actn: 'should be equal to',
                    op: '.to.be.eq(%val)'
                },
                '!=': {
                    key: '!=',
                    val: 'Does not equal',
                    actn: 'should not be equal to',
                    op: '.not.to.be.eq(%val)'
                },
                '<': {
                    key: '<',
                    val: 'Less than',
                    actn: 'is less than',
                    op: '.to.be.lt(%val)'
                },
                '<=': {
                    key: '<=',
                    val: 'Less than or equals',
                    actn: 'is less than or equals to',
                    op: '.to.be.lte(%val)'
                },
                '>': {
                    key: '>',
                    val: 'Greater than',
                    actn: 'is greater than',
                    op: '.to.be.gt(%val)'
                },
                '>=': {
                    key: '>=',
                    val: 'Greater than or equals',
                    actn: 'is greater than or equals to',
                    op: '.to.be.gte(%val)'
                },
                'cont': {
                    key: 'cont',
                    val: 'Contains',
                    actn: 'contains',
                    op: '.to.include(%val)'
                },
                'notcont': {
                    key: 'notcont',
                    val: 'Does not contain',
                    actn: 'does not contain',
                    op: 'not.to.include(%val)'
                }, 'exists': {
                    key: 'exists',
                    val: 'Exists',
                    actn: 'exists',
                    op: '.to.exist'
                }, 'notexist': {
                    key: 'notexist',
                    val: 'Does not exist',
                    actn: 'does not exist',
                    op: '.not.to.exist'
                }
            },
            actn: {
                number: ['=', '!=', '<', '<=', '>', '>='],
                text: ['=', '!=', 'exists', 'notexist', 'cont', 'notcont'],
                json: ['=', '!=', '<', '<=', '>', '>=', 'exists', 'notexist', 'cont', 'notcont']
            },
            hideval: ['exists', 'notexist'],
            build: build
        };

        function build(tests) {
            var string = '\n';
            for (var i = 0; i < tests.length; i++) {
                var str = 'apic.test("%key %actn %vStr", function(){\n    expect(%code)%op;\n})\n';
                var test = tests[i];
                var key = '', actn = '', val = '', vStr = '', code = '', op = '';
                val = vStr = test.val;
                //if val is string add quotes 
                if (val !== undefined && val !== null) {
                    if (val.indexOf('.') >= 0) { //floating number
                        if (parseFloat(val) != val) {
                            val = '"' + val + '"';
                        }
                    } else {
                        if (parseInt(val) != val) {
                            val = '"' + val + '"';
                        }
                    }
                }


                //prepare the string
                switch (test.key) {
                    case 'respJson':
                        if (test.inp && test.inp.charAt(0) === '.') {
                            test.inp = test.inp.substring(1, test.inp.length);
                        }
                        break;
                }
                key = service.options[test.key].text.replace('%inp', test.inp);
                code = service.options[test.key].code.replace('%inp', test.inp);

                //prepare operation
                actn = service.ops[test.actn].actn;
                op = service.ops[test.actn].op.replace('%val', val);

                switch (test.actn) {
                    case 'exists':
                        val = 'undefined';
                        vStr = '';
                        break;
                    case 'notexist':
                        val = 'undefined';
                        vStr = '';
                        break;
                }

                str = str.replace('%key', key).replace('%actn', actn).replace(/%val/g, val).replace('%code', code).replace('%op', op).replace(/%vStr/g, vStr);

                console.log(str);
                string += str;
            }
            return string;
        }

        return service;
    }

    GraphQL.$inject = ['toastr', '$http'];
    function GraphQL(toastr, $http) {
        var service = {
            loadSchema: loadSchema
        }
        function isMainType(name) {
            return ['Query', 'Subscription', 'Mutation'].indexOf(name) >= 0;
        }
        function loadSchema(url, method) {
            var req = {
                method: method || 'POST',
                url: url,
                data: { "query": "\n    query IntrospectionQuery {\n      __schema {\n        queryType { name }\n        mutationType { name }\n        subscriptionType { name }\n        types {\n          ...FullType\n        }\n        directives {\n          name\n          description\n          locations\n          args {\n            ...InputValue\n          }\n        }\n      }\n    }\n\n    fragment FullType on __Type {\n      kind\n      name\n      description\n      fields(includeDeprecated: true) {\n        name\n        description\n        args {\n          ...InputValue\n        }\n        type {\n          ...TypeRef\n        }\n        isDeprecated\n        deprecationReason\n      }\n      inputFields {\n        ...InputValue\n      }\n      interfaces {\n        ...TypeRef\n      }\n      enumValues(includeDeprecated: true) {\n        name\n        description\n        isDeprecated\n        deprecationReason\n      }\n      possibleTypes {\n        ...TypeRef\n      }\n    }\n\n    fragment InputValue on __InputValue {\n      name\n      description\n      type { ...TypeRef }\n      defaultValue\n    }\n\n    fragment TypeRef on __Type {\n      kind\n      name\n      ofType {\n        kind\n        name\n        ofType {\n          kind\n          name\n          ofType {\n            kind\n            name\n            ofType {\n              kind\n              name\n              ofType {\n                kind\n                name\n                ofType {\n                  kind\n                  name\n                  ofType {\n                    kind\n                    name\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  ", "operationName": "IntrospectionQuery" }
            }
            return $http(req).then(function (res) {
                console.log(res.data);
                var typeObjs = {};
                var schema = res.data.data.__schema;
                schema.types.forEach(function (type) {
                    typeObjs[type.name] = type;
                });
                typeObjs.Root = {
                    name: 'Root',
                    kind: 'APIC',
                    fields: []
                }
                if (schema.queryType) {
                    typeObjs.Root.fields.push({ name: 'query', type: { kind: 'OBJECT', name: schema.queryType.name } })
                }
                if (schema.mutationType) {
                    typeObjs.Root.fields.push({ name: 'mutation', type: { kind: 'OBJECT', name: schema.mutationType.name } })
                }
                if (schema.subscriptionType) {
                    typeObjs.Root.fields.push({ name: 'subscription', type: { kind: 'OBJECT', name: schema.subscriptionType.name } })
                }
                var suggests = [];
                Object.keys(typeObjs).forEach(function (name) {
                    var type = typeObjs[name];
                    // if(isMainType(name)) name = name.toLowerCase() + '{}';
                    if (!name.startsWith('__')) {
                        suggests.push({
                            caption: name,
                            value: name,
                            meta: 'Type'
                        })
                        if (type.fields) {
                            type.fields.forEach(function (f) {
                                suggests.push({
                                    caption: f.name,
                                    value: f.name + (isMainType(name) ? ' {}' : ''),
                                    meta: 'field'
                                })
                            })
                        }
                    }
                });
                typeObjs.suggests = suggests;
                return typeObjs
            }, function (err) {
                toastr.error('Failed to load Graphql schema.');
            });
        }
        return service;
    }

    HistoryServ.$inject = ['iDB', '$indexedDB'];
    function HistoryServ(iDB, $indexedDB) {
        var Months = ['January', 'February', 'Mararch', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var service = {};
        service.formatDate = formatDate;
        service.formatRequestForSave = formatRequestForSave;
        service.formatRequestForPartialUpdate = formatRequestForPartialUpdate;
        service.saveReq = saveReq;

        function saveReq(saveData, action) {
            var ts = new Date().getTime();
            saveData._time = ts;
            if (action === 'add') {
                saveData._id = ts + '-' + Math.random().toString(16).substring(2);
            }

            return iDB.upsert('history', saveData).then(function (e) {
                return saveData;
            }, function (e) {
                console.log('err', e);
                return e;
            });
        };

        service.getAll = function (format) {
            return $indexedDB.openStore('history', function (data) {
                var find = data.query();
                find.$desc('_id');
                return data.eachWhere(find).then(function (data) {
                    //if format is dated then convert array to date based object
                    var datedHistory = {};
                    if (format === 'dated') {
                        for (var i = 0; i < data.length; i++) {
                            var entry = data[i];
                            var date = formatDate(entry._time);
                            if (datedHistory[date]) {
                                datedHistory[date].push(entry);
                            } else {
                                datedHistory[date] = [entry];
                            }
                        }
                        return datedHistory;
                    }
                    return data;
                });
            });
        };

        service.clear = function () {
            return $indexedDB.openStore('history', function (store) {
                return store.clear().then(function () {
                    return true;
                });
            });
        };

        service.deleteItem = function (id, date) {
            return $indexedDB.openStore('history', function (store) {
                return store.delete(id).then(function () {
                    return { date: date, id: id };
                });
            });
        };

        service.checkHistoryStack = function () {
            return $indexedDB.openStore('history', function (store) {
                return store.count().then(function (count) {
                    if (count > 2000) {
                        var find = store.query();
                        find.$asc(true);
                        find.$index("_time");
                        find.$limit(1);
                        return store.eachWhere(find).then(function (x) {
                            if (x[0]) {
                                service.deleteItem(x[0]['_id'], '').then(function (q) {
                                    console.log('deleted', q);
                                });
                            }
                            return count
                        });
                    }
                });
            });
        }

        function formatDate(ts) {
            var date = new Date(ts);
            var formatedDate = Months[date.getMonth()] + ' ' + date.getDate() + ' ' + date.getFullYear();
            return formatedDate;
        }

        function formatRequestForSave(saveData, update) {
            var ts = new Date().getTime();
            var toSave = {};
            if (!update) {
                toSave._id = ts + '-' + Math.random().toString(16).substring(2);
                toSave._time = ts; //_time is _created here;
            }
            if (!saveData._modified) {
                toSave._modified = ts;
            } else {
                toSave._modified = saveData._modified;
            }
            toSave.url = saveData.url;
            if (saveData.env && saveData.env._id) {
                toSave.env = {
                    _id: saveData.env._id,
                    name: saveData.env.name
                };
            }
            if (saveData.name) toSave.name = saveData.name;
            toSave.description = saveData.description
            toSave.method = saveData.method;
            toSave.Req = saveData.Req;
            toSave.prescript = saveData.prescript;
            toSave.postscript = saveData.postscript;
            toSave.savedResp = saveData.savedResp;
            //toSave.respSchema = saveData.respSchema;
            toSave.respCodes = saveData.respCodes;
            if (saveData.Body) {
                toSave.Body = {
                    type: saveData.Body.type
                };
                switch (saveData.Body.type) {
                    case 'form-data':
                        toSave.Body.formData = angular.copy(saveData.Body.formData);
                        if (toSave.Body.formData && toSave.Body.formData.length > 0) {
                            toSave.Body.formData.forEach(function (kv) {
                                if (kv.type === 'File') delete kv.file;
                            })
                        }
                        break;
                    case 'x-www-form-urlencoded':
                        toSave.Body.xForms = saveData.Body.xForms;
                        break;
                    case 'raw':
                        toSave.Body.selectedRaw = saveData.Body.selectedRaw;
                        toSave.Body.rawData = saveData.data;
                        break;
                    case 'graphql':
                        toSave.Body.selectedRaw = saveData.Body.selectedRaw;
                        toSave.Body.rawData = saveData.data;
                        toSave.Body.gqlVars = saveData.Body.gqlVars;
                        break;
                }
            }
            return toSave;
        };

        function formatRequestForPartialUpdate(saveData) {
            var ts = new Date().getTime();
            saveData._modified = ts;

            return saveData;
        }

        return service;
    }

})();
