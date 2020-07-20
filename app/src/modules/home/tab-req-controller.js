/* global angular, vkbeautify, CryptoJS, OAuth, hawk */

(function () {
    'use strict';
    angular.module('app.home')
        .controller('TabController', TabController);

    TabController.$inject = ['$scope', '$timeout', 'Utils', '$rootScope', 'HTTP_HEADERS', 'toastr', 'TestBuilder', 'Const', 'Runner', 'JsonSchema', 'DesignerServ', 'GraphQL', 'HistoryServ'];
    function TabController($scope, $timeout, Utils, $rootScope, HTTP_HEADERS, toastr, TestBuilder, Const, Runner, JsonSchema, DesignerServ, GraphQL, HistoryServ) {
        var runner = new Runner();
        var vm = this;
        vm.testTab = $scope.$parent.testTab;

        vm.TAB = $scope.$parent.tab;
        vm.runCount = vm.runCountCopy = 1;
        vm.URL = '';
        vm.METHOD = Const.default_method;
        vm._modified;
        vm.ctrls = {
            showErrMsg: false,
            req_opened_box: 'Scripts',
            resp_opened_box: 'Body',
            resp_body_type: 'pretty',
            showPrerun: true,
            showPostrun: true,
            showReq: true,
            showRes: true,
            gqlTab: 'schema'
        };
        vm.REQ = {
            url_params: [{ key: '', val: '', active: true }],
            headers: [{ key: '', val: '', active: true }]
        };
        vm.RESP = {
            show: false,
            headers: [],
            json: ''
        };
        vm.Test = {
            selected: 'All',
            filter: {
                success: ''
            }
        };
        vm.tbHelper = {
            show: false,
            save: saveBuilderTests,
            req: null
        }
        vm.BasicAuth = {
            PsdType: 'password',
            showPsd: false
        };
        vm.BearerAuth = {
            token: ''
        };
        vm.DigestAuth = {
            userName: '',
            password: '',
            realm: '',
            algorithm: 'MD5',
            nonce: '',
            nonceCount: '',
            clientNonce: '',
            qop: '',
            opaque: '',
            PsdType: 'password',
            showPsd: false
        };
        vm.OAuth1 = {
            consumer_key: '',
            consumer_secret: '',
            token: '',
            token_secret: '',
            timestamp: '',
            nonce: '',
            relm: '',
            version: '1.0',
            signature: 'HMAC-SHA1',
            add_to_header: false,
            encode: false
        };
        vm.HawkAuth = {
            id: '',
            key: '',
            algorithm: 'sha1',
            nonce: '',
            ext: '',
            app: '',
            dlg: '',
            timestamp: '',
            payload: ''
        };
        vm.Body = {
            type: 'raw',
            xForms: [{ key: '', val: '', active: true }],
            formData: [{ key: '', val: '', active: true, type: 'Text' }],
            //rawTypes: Const.rawTypes,
            selectedRaw: { name: 'JSON', val: 'application/json' }
        };
        vm.schema;
        vm.respCodes = [
            { code: '200' }
        ];
        vm.selectedResp = vm.respCodes[0];

        vm.Headers = HTTP_HEADERS;
        vm.scriptType = 'PostRun';
        vm.Editor = {
            modes: [],
            Req: {
                object: null,
                model: '',
                options: {
                    onLoad: editorLoadedReq,
                    require: ['ace/ext/language_tools'],
                    mode: 'json',
                    advanced: {
                        enableBasicAutocompletion: true,
                        enableLiveAutocompletion: true
                    }
                }
            },
            Resp: {
                object: null,
                model: '',
                options: {
                    onLoad: editorLoadedResp,
                    mode: 'xml'
                }
            },
            Prerun: {
                model: '',
                options: {
                    mode: 'javascript'
                }
            },
            Postrun: {
                model: '',
                options: {
                    mode: 'javascript'
                }
            },
            Scripts: '',
            GqlVars: {
                object: null,
                model: '',
                options: {
                    mode: 'json'
                }
            }
        };
        vm.newReqRespCode;
        vm.loopRunResult = [];
        vm.GQLSuggests = [];
        vm.GQLTypes = '';
        vm.GQLpath = ['Root'];

        //Test builder
        vm.tBuilder = {
            options: TestBuilder.options,
            actn: TestBuilder.actn,
            ops: TestBuilder.ops,
            hideval: TestBuilder.hideval,
            //tests:[{"key":"statusCode","actn":"=","val":"200"},{"key":"statusText","actn":"=","val":"ok"},{"key":"time","actn":"<","val":"200","inp":"content-type"},{"key":"respSize","actn":">","val":"50"},{"key":"respRaw","actn":"cont","val":"userId"},{"key":"respRaw","actn":"exists","val":null}]
            tests: [{ key: 'statusCode', actn: '=', val: '200' }, { key: 'respJson', actn: '=', val: '1', inp: 'userId' }]
        };

        vm.savedResp = [];

        //vm functions
        vm.sendRequest = sendRequest;
        vm.doSingleRun = doSingleRun;
        vm.startLoopRun = startLoopRun;
        vm.selectDropdown = selectDropdown;
        vm.addRow = addRow;
        vm.togglePassword = togglePassword;
        vm.updateAuthHeader = updateAuthHeader;
        vm.removeAuthHeader = removeAuthHeader;
        vm.cancelReq = cancelReq;
        // vm.selectEnv = selectEnv;
        vm.getObjectsLength = getObjectsLength;
        vm.changeTestFilter = changeTestFilter;
        vm.showAuthPane = showAuthPane;
        vm.initReqSave = initReqSave;
        vm.addReqResp = addReqResp;
        vm.removeRespCode = removeRespCode;
        vm.selectRespCode = selectRespCode;
        vm.addCodeSnip = addCodeSnip;
        vm.addReqBodySnip = addReqBodySnip;
        vm.reloadReq = reloadReq;
        vm.resetBuildTest = resetBuildTest;
        vm.buildTests = buildTests;
        vm.selectTab = selectTab;
        vm.initGQL = initGQL;
        vm.initRaw = initRaw;
        vm.saveResponse = saveResponse;
        vm.loadResponse = loadResponse;
        //vm.changeEditorMode = changeEditorMode;
        //vm.editorLoaded = editorLoaded;

        init($rootScope.loadRequest || $scope.$parent.vm.selectedReq);

        function init(tab) {
            if (tab) {
                //var tab = $rootScope.loadRequest;
                vm.URL = tab.url;
                vm.name = tab.name || '';
                vm.METHOD = tab.method;
                if (tab.respCodes) {
                    vm.respCodes = [];
                    for (var i = 0; i < tab.respCodes.length; i++) {
                        var resp = {
                            code: tab.respCodes[i].code,
                            data: JsonSchema.schema2obj(tab.respCodes[i].data, undefined, undefined, true)
                        };
                        vm.respCodes.push(resp);
                    }
                }
                selectRespCode(0);

                //load saved response
                if (tab.savedResp && tab.savedResp.length > 0) {
                    vm.savedResp = tab.savedResp;
                } else {
                    vm.savedResp = []
                }
                if (vm.RESP.show) {
                    loadResponse()
                }

                vm.REQ.headers = angular.copy(tab.Req.headers);
                vm.REQ.url_params = angular.copy(tab.Req.url_params);
                if (tab.Body) {
                    vm.Body.type = tab.Body.type;
                    switch (vm.Body.type) {
                        case 'form-data':
                            vm.Body.formData = tab.Body.formData;
                            break;
                        case 'x-www-form-urlencoded':
                            vm.Body.xForms = tab.Body.xForms;
                            break;
                        case 'raw':
                            vm.Body.selectedRaw = tab.Body.selectedRaw;
                            vm.Editor.Req.model = tab.Body.rawData || tab.data;
                            if (tab.Body.selectedRaw.name) {
                                $timeout(function () {
                                    changeEditorMode(tab.Body.selectedRaw.name, 'Req');
                                });
                            }
                            break;
                        case 'graphql':
                            vm.Body.selectedRaw = tab.Body.selectedRaw;
                            vm.Editor.Req.model = tab.Body.rawData || tab.data;
                            vm.Editor.GqlVars.model = tab.Body.gqlVars;
                            $timeout(function () {
                                changeEditorMode(tab.Body.selectedRaw.name, 'Req');
                                vm.initGQL();
                            });
                    }
                }
                vm.Editor.Prerun.model = tab.prescript ? tab.prescript : '';

                if (tab.postscript) {
                    vm.Editor.Postrun.model = tab.postscript;
                    vm.Editor.Scripts = tab.postscript;
                } else {
                    vm.Editor.Postrun.model = '';
                    vm.Editor.Scripts = '';
                }
                if (tab._modified) {
                    vm._modified = tab._modified;
                }

                //if loaded from a saved request
                if (tab.hasOwnProperty('name') && tab.name !== undefined && !vm.testTab) {
                    vm.TAB.id = tab._id;
                    vm.TAB.title = tab.name;
                }

                $rootScope.loadRequest = null;
            }
            vm.reload = false;
            $timeout(function () {
                $rootScope.focus('.tab-pane.active .URL .apic-editor');
            });

            if (tab && tab.fromProject) {
                vm.TAB.fromProject = tab.fromProject;
            }

            //load default req, res tabs
            Utils.storage.get(['req_opened_box', 'resp_body_type']).then(function (data) {
                if (data.req_opened_box) {
                    if (data.req_opened_box === 'Body' && vm.METHOD == 'GET') {
                        vm.ctrls.req_opened_box = 'Scripts';
                    } else {
                        vm.ctrls.req_opened_box = data.req_opened_box;
                    }
                }
                if (data.resp_body_type) {
                    vm.ctrls.resp_body_type = data.resp_body_type;
                }
            });
        }

        function sendRequest(runningInLoop) {
            if (!vm.URL || vm.URL === 'http://' || vm.URL === 'https://') {
                toastr.error('Type in a URL to hit');
                return;
            }
            if (!runningInLoop) {
                if (vm.progress) {
                    return;
                }
                vm.progress = true;
                vm.RESP.show = false;
                vm.ctrls.showErrMsg = false;
                vm.loopRunResult = [];
            }

            switch (vm.scriptType) {
                case 'PreRun':
                    vm.Editor.Prerun.model = vm.Editor.Scripts;
                    break;
                case 'PostRun':
                    vm.Editor.Postrun.model = vm.Editor.Scripts;
                    break;
            }

            var reqObj = {
                request: {
                    url: vm.URL,
                    method: vm.METHOD,
                    headers: Utils.arrayToObj(vm.REQ.headers),
                    query: Utils.arrayToObj(vm.REQ.url_params),
                    bodyMeta: angular.copy(vm.Body) //tries to copy the file ref in form-data type body, TODO: Dont try to handle file obj directly
                },
                env: angular.copy($rootScope.getSelectedEnv()),
                prescript: vm.Editor.Prerun.model,
                postscript: vm.Editor.Postrun.model,
                respCodes: []
            };
            reqObj.request.bodyMeta.rawData = angular.copy(vm.Editor.Req.model);
            reqObj.request.bodyMeta.formData = vm.Body.formData;
            if (vm.Body.type === 'graphql') {
                reqObj.request.bodyMeta.gqlVars = vm.Editor.GqlVars.model;
            }

            for (var i = 0; i < vm.respCodes.length; i++) {
                if (vm.respCodes[i].data) {
                    var resp = {
                        code: vm.respCodes[i].code,
                        data: JsonSchema.obj2schema(vm.respCodes[i].data)
                    };
                    reqObj.respCodes.push(resp);
                }
            }
            if (Const.with_body.indexOf(vm.METHOD) < 0) {
                reqObj.Body = null;
                // reqObj.data = null;
            }
            if (!reqObj.env.vals)
                reqObj.env.vals = {};
            reqObj.env.vals = angular.merge(reqObj.env.vals, $rootScope.xtraEnv);

            runner.run(reqObj).then(processResponse);
        }

        /**
         * functoin to process request response.
         * @function
         * @param {object} reqObj - request object with all reqiured information.
         * @return {undefined} returns nothing
         * fields{
         *    ........
         *    response:{
         *        body: response of the request,
         *        headers: obj of response headers,
         *        readyState: State value of the response,
         *        status: status of the request,
         *        statusText: status text of the request,
         *        timeTaken: time taken for the request,
         *        tests: test cases
         *    }
         *    .......
         * }
         */
        function processResponse(reqObj) {
            vm.tbHelper.req = reqObj;
            //return contentType.match(new RegExp('^image/.*'));
            Utils.updateInMemEnv(reqObj.xtraEnv);


            var resp = reqObj.response;
            vm.logs = reqObj.logs || 'Logs can be added in PreRun/PostRun scripts with "log()" function. Eg: log($response)';
            if (resp.readyState === 4) {
                if (vm.runCount === 1) { //single run
                    vm.progress = false;
                    if (resp.status === 0) {
                        if (vm.aborted) {
                            vm.aborted = false;
                            return;
                        }
                        vm.ctrls.showErrMsg = true;
                        //Scroll error message to view
                        $timeout(function () {
                            var topOffset = $('#reqTabs .tab-pane.active .error-cont').position().top;
                            if (topOffset - 150 > 0) {
                                $('#reqTabs .tab-pane.active').animate({
                                    scrollTop: topOffset + $('#reqTabs .tab-pane.active').scrollTop() - 50
                                })
                            }
                        });
                        return;
                    }

                    /******** calculating time ***********/
                    vm.RESP.time = resp.timeTaken >= 1000 ? (resp.timeTaken / 1000) + ' s' : resp.timeTaken + ' ms';

                    /********* calculating response size ************/
                    vm.RESP.size = getResponseSize(reqObj);

                    vm.RESP.show = true;
                    vm.ctrls.showRes = true;
                    vm.RESP.data = resp.body;

                    //preparing test report
                    vm.RESP.tests = {
                        cases: reqObj.tests,
                        passed: Utils.getTestsCountByType(reqObj.tests, true),
                        failed: Utils.getTestsCountByType(reqObj.tests, false)
                    };
                    vm.RESP.tests.total = vm.RESP.tests.passed + vm.RESP.tests.failed;
                    vm.RESP.testError = reqObj.testError;

                    //formatting response for pretty print
                    formatResponsePretty(resp.headers['Content-Type'], resp.body)

                    //******* calculating headers ***************//
                    vm.RESP.headers = resp.headers;
                    //getRespHeaders(resp.getAllResponseHeaders().split('\n'));

                    //******* calculating status ***************//
                    vm.RESP.status = resp.status.toString();
                    vm.RESP.statusText = resp.statusText;

                    //setting up the preview tab
                    if (!vm.testTab) {
                        setPreviewFrame(vm.RESP.data);
                    }

                    /***** Save in history ******/
                    saveReqInHistory(runner.req);

                    scrollRespIntoView()
                } else { //looped run
                    var runRes = {
                        data: resp.body,
                        status: resp.status.toString(),
                        statusText: resp.statusText,
                        time: resp.timeTaken >= 1000 ? (resp.timeTaken / 1000) + ' s' : resp.timeTaken + ' ms',
                        size: getResponseSize(reqObj)
                    };
                    if (resp.status === 0) {
                        runRes.data = 'Can\'t establish a connection to the specified server.';
                    }
                    vm.loopRunResult.push(runRes);

                    vm.runCountCopy--;
                    if (vm.runCountCopy >= 1) {
                        sendRequest(true);
                    } else {
                        vm.progress = false;

                        /***** Save in history ******/
                        saveReqInHistory(runner.req);
                    }
                }
            }
        }

        function formatResponsePretty(contentType, body) {
            //formatting response for pretty print
            try {
                var res = JSON.parse(body);
                $timeout(function () {
                    vm.RESP.json = res;
                    vm.Editor.Resp.model = JSON.stringify(res, null, '\t');
                    changeEditorMode('json', 'Resp');
                    vm.Editor.Resp.options.mode = 'json';
                });
            } catch (err) {
                vm.RESP.json = '';
                if (vm.ctrls.resp_body_type === 'test') {
                    vm.ctrls.resp_body_type = 'pretty';
                }
                switch (contentType) {
                    case 'application/xml':
                    case 'application/xml-dtd':
                    case 'text/html':
                    case 'text/xml':
                    case 'text/html; charset=UTF-8':
                    case 'text/html;charset=utf-8':
                    case 'text/html; charset=utf-8':
                        vm.Editor.Resp.model = vkbeautify.xml(body);
                        changeEditorMode('xml', 'Resp');
                        vm.Editor.Resp.options.mode = 'xml';
                        break;
                    case 'text/javascript':
                    case 'application/javascript':
                        vm.Editor.Resp.model = body;
                        changeEditorMode('javascript', 'Resp');
                        vm.Editor.Resp.options.mode = 'javascript';
                        break;
                    default:
                        vm.Editor.Resp.model = body;
                        changeEditorMode('text', 'Resp');
                        vm.Editor.Resp.options.mode = 'text';
                }
            }
        }

        function getResponseSize(resp) {
            var size = resp.response.headers['lontent-length'];
            if (size === undefined) {
                if (resp.response.body) {
                    size = resp.response.body.length;
                }
            }
            return size === undefined ? 'Unknown' : size >= 1024 ? size >= 1048576 ? (size / 1048576).toFixed(1) + ' MB' : (size / 1024).toFixed(1) + ' KB' : size + ' B';
        }

        function scrollRespIntoView() {
            //Scroll response panel to view
            $timeout(function () {
                var topOffset = $('#reqTabs .tab-pane.active .tabResponsePanel').position().top;
                if (topOffset - 150 > 0) {
                    $('#reqTabs .tab-pane.active').animate({
                        scrollTop: topOffset + $('#reqTabs .tab-pane.active').scrollTop() - 50
                    })
                }
            });
        }

        function startLoopRun() {
            if (vm.runCount === undefined) {
                toastr.error('Please enter a valid number.');
                return;
            }
            if (vm.runCount <= 0) {
                toastr.error('Please enter a count greater than zero.');
                return;
            }
            if (vm.runCount > 1000) {
                toastr.error('Currently apic supports running a maximum of 1000 iterations.');
                return;
            }
            vm.runCountCopy = vm.runCount;
            vm.loopRunResult = [];
            sendRequest();
        }

        function doSingleRun() {
            vm.runCountCopy = vm.runCount = 1;
            sendRequest();
        }

        function setPreviewFrame(data) {
            $timeout(function () {
                angular.element('#iframe_' + vm.TAB.id)[0].src = 'data:text/html;charset=utf-8,' + escape(data);
            });
        }

        function saveReqInHistory(req) {
            var toSave = {
                Body: req.request.bodyMeta,
                Req: {
                    headers: Utils.objToArray(req.request.headers, true),
                    url_params: Utils.objToArray(req.request.query, true)
                },
                url: req.request.url,
                // data: req.request.bodyMeta.rawData,
                method: req.request.method,
                prescript: req.prescript,
                postscript: req.postscript,
                respCodes: req.respCodes
            };
            if (req.env) {
                toSave.env = {
                    _id: req.env._id,
                    name: req.env.name
                };
            }
            $rootScope.$broadcast('SaveInHistory', toSave);
        }

        function selectDropdown(e, type, val) {
            e.preventDefault();
            switch (type) {
                case 'Method':
                    vm.METHOD = val;
                    break;
                case 'RawType':
                    vm.Body.selectedRaw = val;
                    changeEditorMode(val.name, 'Req');
                    break;
            }

        }

        function addRow(type, index) {
            var newRow = { key: '', val: '', active: true };
            switch (type) {
                case 'params':
                    if (vm.REQ.url_params.length - 1 === index) {
                        vm.REQ.url_params.push(newRow);
                    }
                    break;
                case 'headers':
                    if (vm.REQ.headers.length - 1 === index) {
                        vm.REQ.headers.push(newRow);
                    }
                    break;
                case 'x-form':
                    if (vm.Body.xForms.length - 1 === index) {
                        vm.Body.xForms.push(newRow);
                    }
                    break;
                case 'form-data':
                    if (vm.Body.formData.length - 1 === index) {
                        newRow.type = 'Text';
                        vm.Body.formData.push(newRow);
                    }
                    break;
            }
        }

        function togglePassword(type) {
            switch (type) {
                case 'Basic':
                    if (vm.BasicAuth.showPsd) {
                        vm.BasicAuth.PsdType = 'text';
                    } else {
                        vm.BasicAuth.PsdType = 'password';
                    }
                    break;
                case 'Digest':
                    if (vm.DigestAuth.showPsd) {
                        vm.DigestAuth.PsdType = 'text';
                    } else {
                        vm.DigestAuth.PsdType = 'password';
                    }
                    break;
            }

        }

        function updateAuthHeader(type) {
            switch (type) {
                case 'Basic':
                    var authdata = 'Basic ' + window.btoa(interpolate(vm.BasicAuth.uname) + ':' + interpolate(vm.BasicAuth.psd));
                    //find if Authorization already exists and delete it. Utils.addHeader will take care of it
                    Utils.addHeader('Authorization', authdata, vm.REQ.headers, true, false); //name, value, headerList, begining, addDuplicate
                    toastr.info('Authorization header updated.');

                    if (!$rootScope.lastUsed)
                        $rootScope.lastUsed = {};
                    $rootScope.lastUsed.basicAuth = {
                        uname: vm.BasicAuth.uname,
                        psd: vm.BasicAuth.psd
                    };
                    break;
                case 'Bearer':
                    var authData = 'Bearer ' + vm.BearerAuth.token;
                    Utils.addHeader('Authorization', authData, vm.REQ.headers, true, false); //name, value, headerList, begining, addDuplicate
                    toastr.info('Authorization header updated.');
                    break;
                case 'Digest':
                    var algorithm = vm.DigestAuth.algorithm || 'MD5',
                        username = vm.DigestAuth.userName || '',
                        realm = vm.DigestAuth.realm || '',
                        password = vm.DigestAuth.password || '',
                        method = vm.METHOD,
                        nonce = vm.DigestAuth.nonce || '',
                        nonceCount = vm.DigestAuth.nonceCount || '',
                        clientNonce = vm.DigestAuth.clientNonce || '',
                        opaque = vm.DigestAuth.opaque || '',
                        qop = vm.DigestAuth.qop || '',
                        uri = '';

                    if (vm.URL) {
                        var parsedURL = Utils.parseURL(vm.URL);
                        if (parsedURL) {
                            uri = parsedURL.pathname + parsedURL.search;
                        } else {
                            uri = vm.URL.substring(vm.URL.indexOf('/'), vm.URL.length);
                        }
                    } else {
                        toastr.error('Please enter a url.');
                        return;
                    }

                    var A0, A1, A2, hashA1, hashA2, reqDigest, headerParams;

                    if (algorithm === 'MD5-sess') {
                        A0 = CryptoJS.MD5(username + ':' + realm + ':' + password).toString();
                        A1 = A0 + ':' + nonce + ':' + clientNonce;
                    } else {
                        A1 = username + ':' + realm + ':' + password;
                    }

                    if (qop === 'auth-int') {
                        // Cannot be implemented here.
                        toastr.error('Digest Auth with "qop": "auth-int" is not supported.');
                    } else {
                        A2 = method + ':' + uri;
                    }

                    hashA1 = CryptoJS.MD5(A1).toString();
                    hashA2 = CryptoJS.MD5(A2).toString();

                    if (qop === 'auth' || qop === 'auth-int') {
                        reqDigest = CryptoJS.MD5([hashA1, nonce, nonceCount, clientNonce, qop, hashA2].join(':')).toString();
                    } else {
                        reqDigest = CryptoJS.MD5([hashA1, nonce, hashA2].join(':')).toString();
                    }

                    headerParams = ['username="' + username + '"',
                    'realm="' + realm + '"',
                    'nonce="' + nonce + '"',
                    'uri="' + uri + '"'
                    ];

                    if (qop === 'auth' || qop === 'auth-int') {
                        headerParams.push('qop=' + qop);
                    }

                    if (qop === 'auth' || qop === 'auth-int' || algorithm === 'MD5-sess') {
                        headerParams.push('nc=' + nonceCount);
                        headerParams.push('cnonce="' + clientNonce + '"');
                    }

                    headerParams.push('response="' + reqDigest + '"');
                    headerParams.push('opaque="' + opaque + '"');

                    Utils.addHeader('Authorization', 'Digest ' + headerParams.join(', '), vm.REQ.headers, true);
                    toastr.info('Authorization header updated.');
                    console.log('Digest ' + headerParams.join(', '));

                    break;
                case 'OAuth1':
                    //if there are body params use them aswell, only for form-date and x-www-form-urlencoded
                    var consumerSecret = vm.OAuth1.consumer_secret,
                        tokenSecret = vm.OAuth1.token_secret,
                        url = vm.URL ? Utils.checkForHTTP(vm.URL.split('?')[1]) : '',
                        method = vm.METHOD,
                        oauth_consumer_key = vm.OAuth1.consumer_key,
                        oauth_token = vm.OAuth1.token,
                        oauth_signature_method = vm.OAuth1.signature,
                        oauth_timestamp = vm.OAuth1.timestamp,
                        oauth_nonce = vm.OAuth1.nonce,
                        oauth_version = vm.OAuth1.version;
                    var secrets = {
                        consumerSecret: consumerSecret,
                        tokenSecret: tokenSecret
                    };

                    var message = {
                        action: url,
                        method: method,
                        parameters: [
                            ['oauth_consumer_key', oauth_consumer_key],
                            ['oauth_token', oauth_token],
                            ['oauth_signature_method', oauth_signature_method],
                            ['oauth_timestamp', oauth_timestamp],
                            ['oauth_nonce', oauth_nonce],
                            ['oauth_version', oauth_version]
                        ]
                    };

                    var oAuthProps = ['oauth_consumer_key', 'oauth_token', 'oauth_signature_method', 'oauth_timestamp', 'oauth_nonce', 'oauth_version', 'oauth_signature'];

                    //check if methode can have body
                    if (Const.with_body.indexOf(vm.METHOD) >= 0) {
                        if (vm.Body.type === 'form-data') {
                            //formData: [{key: '', val: '', type: 'Text/File'}]
                            for (var j = 0; j < vm.Body.formData.length; j++) {
                                var key = vm.Body.formData[j].key,
                                    val = '',
                                    type = vm.Body.formData.type;
                                if (type === 'Text') {
                                    val = vm.Body.formData[j].val;
                                } else {
                                    var file = vm.Body.formData[j].file;
                                    if (file) {
                                        val = file.name;
                                    }
                                }
                                if (key && key.trim() !== '' && val && val.trim() !== '') {
                                    message.parameters.push([key, val]);
                                }
                            }
                        } else if (vm.Body.type === 'x-www-form-urlencoded') {
                            //xForms: [{key: '', val: ''}]
                            for (var j = 0; j < vm.Body.xForms.length; j++) {
                                var key = vm.Body.xForms[j].key,
                                    val = vm.Body.xForms[j].val;
                                if (key && key.trim() !== '' && val && val.trim() !== '') {
                                    message.parameters.push([key, val]);
                                }
                            }
                        }
                    }

                    var signature = OAuth.SignatureMethod.sign(message, secrets);
                    if (signature === null) {
                        toastr.error('Failed to generate auth signature');
                        return;
                    }
                    if (vm.OAuth1.encode) {
                        signature = encodeURIComponent(signature);
                    }

                    if (vm.OAuth1.add_to_header) {//add token as header
                        var realm = vm.OAuth1.relm;
                        var header = 'OAuth ';

                        if (realm && realm.trim() !== '') {
                            header += 'realm="' + encodeURIComponent(realm) + '",';
                        }

                        for (var i = 0; i < message.parameters.length; i++) {
                            var value = message.parameters[i][1];
                            if (value == null || value.trim() == '') {
                                continue;
                            }
                            if (message.parameters[i][0] === 'oauth_signature') {
                                value = signature; //use the encoded signature
                            }
                            header += encodeURIComponent(message.parameters[i][0]) + '="' + encodeURIComponent(value) + '",';
                        }

                        header = header.substring(0, header.length - 1);
                        Utils.addHeader('Authorization', header, vm.REQ.headers, true);
                        toastr.info('Authorization header updated.');
                    } else {//add to query parameter or body based on http method type
                        if (Const.with_body.indexOf(vm.METHOD) >= 0 && vm.Body.type === 'form-data') {
                            //add auth params as form-data
                            //add auth params as x-www-form
                            var lastEle = vm.Body.formData.pop();
                            for (var k = 0; k < message.parameters.length; k++) {
                                var key = message.parameters[k][0],
                                    val = message.parameters[k][1];
                                //if its a auth related property then only add it to body
                                if (oAuthProps.indexOf(key) >= 0) {
                                    var found = false;
                                    for (var l = 0; l < vm.Body.formData.length; l++) {
                                        if (vm.Body.formData[l].key === key) {
                                            vm.Body.formData[l].val = val;
                                            vm.Body.formData[l].type = 'Text';
                                            found = true;
                                        }
                                    }
                                    if (!found) {
                                        vm.Body.formData.push({ key: key, val: val, type: 'Text' });
                                    }

                                }
                            }
                            vm.Body.formData.push(lastEle);
                            toastr.info('Auth params added to body(as form-data).');
                        } else if (Const.with_body.indexOf(vm.METHOD) >= 0 && vm.Body.type === 'x-www-form-urlencoded') {
                            //add auth params as x-www-form
                            var lastEle = vm.Body.xForms.pop();
                            for (var k = 0; k < message.parameters.length; k++) {
                                var key = message.parameters[k][0],
                                    val = message.parameters[k][1];
                                //if its a auth related property then only add it to body
                                if (oAuthProps.indexOf(key) >= 0) {
                                    var found = false;
                                    for (var l = 0; l < vm.Body.xForms.length; l++) {
                                        if (vm.Body.xForms[l].key === key) {
                                            vm.Body.xForms[l].val = val;
                                            found = true;
                                        }
                                    }
                                    if (!found) {
                                        vm.Body.xForms.push({ key: key, val: val });
                                    }

                                }
                            }
                            vm.Body.xForms.push(lastEle);
                            toastr.info('Auth params added to body(as x-www-form).');
                        } else {
                            //add auth data as query params
                            var paramsObj = {};
                            for (var k = 0; k < message.parameters.length; k++) {
                                paramsObj[message.parameters[k][0]] = message.parameters[k][1];
                            }
                            var url = Utils.removeQueryParams(vm.URL, Object.keys(paramsObj));
                            url = Utils.prepareQueryParams(url, paramsObj);
                            vm.URL = url;
                            toastr.info('Auth string added to url');
                        }
                    }
                    break;
                case 'HawkAuth':
                    var url = vm.URL,
                        method = vm.METHOD,
                        id = vm.HawkAuth.id,
                        key = vm.HawkAuth.key,
                        algorithm = vm.HawkAuth.algorithm,
                        nonce = vm.HawkAuth.nonce,
                        timestamp = vm.HawkAuth.timestamp,
                        ext = vm.HawkAuth.ext,
                        app = vm.HawkAuth.app,
                        dlg = vm.HawkAuth.dlg;

                    var credentials = {
                        id: id,
                        key: key,
                        algorithm: algorithm
                    };

                    var options = {
                        credentials: credentials,
                        nonce: nonce,
                        timestamp: timestamp,
                        ext: ext,
                        app: app,
                        dlg: dlg
                    };

                    var res = hawk.client.header(url, method, options);

                    if (res.err) {
                        toastr.error('Failed to generate Hawk auth header: ' + res.err);
                        return;
                    }
                    Utils.addHeader('Authorization', res.field, vm.REQ.headers, true);
                    toastr.info('Authorization header updated.');
                    break;
            }
        }

        function removeAuthHeader() {
            Utils.removeHeader('Authorization', vm.REQ.headers);
            toastr.info('Authorization header removed.');
        }

        function cancelReq() {
            vm.aborted = true;
            vm.progress = false;
            vm.runCountCopy = 0;
            runner.abort();
        }

        function getObjectsLength(obj) {
            return Object.keys(obj).length;
        }

        function changeTestFilter(type) {
            switch (type) {
                case 'all':
                    vm.Test.selected = 'All';
                    vm.Test.filter.success = '';
                    break;
                case 'passed':
                    vm.Test.selected = 'Passed';
                    vm.Test.filter.success = true;
                    break;
                case 'failed':
                    vm.Test.selected = 'Failed';
                    vm.Test.filter.success = false;
                    break;
            }
        }

        function initReqSave(saveAs) {
            switch (vm.scriptType) {
                case 'PreRun':
                    vm.Editor.Prerun.model = vm.Editor.Scripts;
                    break;
                case 'PostRun':
                    vm.Editor.Postrun.model = vm.Editor.Scripts;
                    break;
            }
            if (vm.TAB.fromProject) {
                var delta = {
                    prerun: vm.Editor.Prerun.model,
                    postrun: vm.Editor.Postrun.model
                };
                DesignerServ.updateEndp(vm.TAB.fromProject.projId, vm.TAB.fromProject.endpId, delta).then(function () {
                    toastr.success('Endpoint update.');
                    var leftMenuDelta = {
                        prescript: vm.Editor.Prerun.model,
                        postscript: vm.Editor.Postrun.model
                    }
                    $rootScope.$emit('updateEndpoint', { projId: vm.TAB.fromProject.projId, tabId: vm.TAB.id, delta: leftMenuDelta });
                }, function () {
                    toastr.error('Failed to update Endpoint.');
                });
                return
            }

            var saveData = {
                url: vm.URL,
                method: vm.METHOD,
                Req: angular.copy(vm.REQ),
                Body: angular.copy(vm.Body),
                data: vm.Editor.Req.model,
                withBody: Const.with_body.indexOf(vm.METHOD),
                tabId: vm.TAB.id,
                //respSchema: JsonSchema.obj2schema(vm.schema),
                respCodes: [],
                prescript: vm.Editor.Prerun.model,
                postscript: vm.Editor.Postrun.model,
                name: vm.name,
                savedResp: vm.savedResp
            };
            if (vm.Body.type === 'graphql' && vm.Editor.GqlVars.model) {
                saveData.Body.gqlVars = angular.copy(vm.Editor.GqlVars.model);
            }
            for (var i = 0; i < vm.respCodes.length; i++) {
                if (vm.respCodes[i].data) {
                    var resp = {
                        code: vm.respCodes[i].code,
                        data: JsonSchema.obj2schema(vm.respCodes[i].data)
                    };
                    saveData.respCodes.push(resp);
                }
            }
            vm._modified = new Date().getTime();
            saveData._modified = vm._modified;

            if (!vm.testTab) {
                if (saveAs) {
                    saveData.saveAs = true;
                }

                $rootScope.sendSaveRequest(saveData);
            } else {
                $scope.$parent.vm.saveSuitReq(HistoryServ.formatRequestForSave(saveData));
            }
        }

        function showAuthPane(type) {
            switch (type) {
                case 'basic':
                    selectTab('req_opened_box', 'Auth-Basic');
                    $rootScope.focus('.tab-pane.active #basic-auth-uname');
                    var authData;
                    for (var i = 0; i < vm.REQ.headers.length; i++) {
                        if (vm.REQ.headers[i].key === 'Authorization') {
                            authData = vm.REQ.headers[i].val;
                        }
                    }
                    if (authData && (authData.indexOf('Basic') === 0 || authData.indexOf('basic') === 0)) {
                        authData = authData.substring(5, authData.length).trim();
                        authData = window.atob(authData).split(':');
                        vm.BasicAuth.uname = authData[0];
                        vm.BasicAuth.psd = authData[1];
                    } else if ($rootScope.lastUsed && $rootScope.lastUsed.basicAuth) {
                        vm.BasicAuth.uname = $rootScope.lastUsed.basicAuth.uname;
                        vm.BasicAuth.psd = $rootScope.lastUsed.basicAuth.psd;
                    }
                    break;
                case 'bearer':
                    selectTab('req_opened_box', 'Auth-Bearer');
                    $rootScope.focus('.tab-pane.active #bearer-auth-token');
                    break;

            }
        }

        function addReqResp(code) {
            if (vm.newReqRespCode === '' && code === undefined) {
                toastr.error('Please enter a status code');
                return;
            } else if (vm.newReqRespCode === '') {
                vm.newTraitResp = code;
            }
            if (parseInt(vm.newReqRespCode) != vm.newReqRespCode) {
                toastr.error('The status code should be a number');
                return;
            }
            for (var i = 0; i < vm.respCodes.length; i++) {
                var resp = vm.respCodes[i];
                if (resp.code == vm.newReqRespCode) {
                    toastr.error('Status code already exists.');
                    return;
                }
            }
            var code = vm.newReqRespCode;
            var resp = {
                data: undefined,
                code: code
            };
            vm.respCodes.push(resp);
            selectRespCode(vm.respCodes.length - 1);
            vm.newReqRespCode = '';
        }

        function removeRespCode(index) {
            vm.respCodes.splice(index, 1);
        }

        function selectRespCode(index) {
            vm.selectedResp = vm.respCodes[index];
        }

        function addCodeSnip(snip) {
            vm.Editor.Scripts += (vm.Editor.Scripts ? '\n' : '');
            if (snip.hasOwnProperty('params')) {
                vm.Editor.Scripts += snip.code.replace('<<assert>>', Utils.assertBuilder.apply(null, snip.params));
            } else {
                vm.Editor.Scripts += snip.code;
            }
        }

        function addReqBodySnip(code) {
            var cursor = vm.Editor.Req.object.selection.getCursor();
            vm.Editor.Req.object.session.insert(cursor, code);
            vm.Editor.Req.model = vm.Editor.Req.object.getValue();
            $timeout(function () {
                vm.Editor.Req.object.focus();
            });

        }

        function reloadReq() {
            init(vm.updatedReq);
            delete vm.updatedReq;
        }

        function resetBuildTest() {
            vm.tBuilder.tests = [{ key: 'statusCode', actn: '=', val: '200' }];
        }

        function buildTests() {
            var testString = TestBuilder.build(vm.tBuilder.tests);
            vm.Editor.Scripts += testString;
            vm.ctrls.tBuilder = false;

        }

        function selectTab(type, name) {
            vm.ctrls[type] = name;
            Utils.storage.set(type, name);
        }

        function initRaw() {
            vm.Editor.Req.object.completers = [];
            changeEditorMode(vm.Body.selectedRaw.name, 'Req');
        }
        function initGQL() {
            vm.Editor.Req.object.completers = [{
                getCompletions: function (editor, session, pos, prefix, callback) {
                    callback(null, vm.GQLSuggests);
                }
            }]
            changeEditorMode('graphql', 'Req');
            GraphQL.loadSchema(vm.URL, vm.METHOD).then(function (types) {
                console.log(types);
                vm.GQLTypes = types;
                vm.GQLSuggests = types.suggests;
                delete types.suggests;
            }, function (e) {
                vm.GQLTypes = null;
            })
        }

        function saveBuilderTests(tests, save) {
            vm.scriptType = 'PostRun';
            $timeout(function () {
                vm.Editor.Scripts += '\n' + tests;
                if (save) {
                    initReqSave();
                } else {
                    toastr.info('Test added to postrun scripts.')
                }
            });
        }

        function saveResponse() {
            var saveData = {
                tabId: vm.TAB.id,
                savedResp: [{
                    status: vm.RESP.status,
                    data: vm.RESP.data,
                    time: vm.RESP.time,
                    size: vm.RESP.size,
                    headers: vm.RESP.headers
                }]
            };

            if (!vm.testTab) {
                $rootScope.sendSaveRequest(saveData, true);
            } else {
                $scope.$parent.vm.saveSuitReq(saveData, true);
            }
            vm.savedResp = saveData.savedResp;
        }

        function loadResponse(scroll) {
            vm.RESP = angular.merge(vm.RESP, vm.savedResp[0], { show: true, statusText: '' });
            formatResponsePretty(vm.RESP.headers['Content-Type'], vm.RESP.data);
            if (scroll)
                scrollRespIntoView()
        }

        function interpolate(string) {
            return $rootScope.interpolate(string, $rootScope.getSelectedEnv()['vals']);
        }

        function editorLoadedReq(_editor) {
            vm.Editor.Req.object = _editor;
            //vm.Editor.Req.object.getSession().setUseWrapMode(true);
        }
        function editorLoadedResp(_editor) {
            vm.Editor.Resp.object = _editor;
            vm.Editor.Resp.object.getSession().setMode('ace/mode/' + vm.Editor.Resp.options.mode);
        }

        function changeEditorMode(mode, type) {
            if (vm.Editor[type].object) {
                vm.Editor[type].object.getSession().setMode('ace/mode/' + mode.toLowerCase());
            }
        }

        $scope.$watch('vm.REQ.url_params', function () {
            var count = 0;
            for (var i = 0; i < vm.REQ.url_params.length; i++) {
                if (vm.REQ.url_params[i].key)
                    count++;
            }
            vm.urlparam_count = count;
        }, true);

        $scope.$watch('vm.REQ.headers', function () {
            var count = 0;
            for (var i = 0; i < vm.REQ.headers.length; i++) {
                if (vm.REQ.headers[i].key)
                    count++;
            }
            vm.headers_count = count;
        }, true);

        var tabSavedListener = $rootScope.$on('tabSaved', function (e, args) {
            if (vm.TAB.id === args.tabId) {
                vm.TAB.id = args.newId;
                vm.TAB.title = args.name;
                $rootScope.selectedTab = args.newId;
            }
        });

        var reqDeletedListener = $rootScope.$on('reqDeleted', function (e, args) {
            if (vm.TAB.id === args.tabId) {
                vm.TAB.title = 'Unsaved tab';
                vm.TAB.id = new Date().getTime() + 'newtab';
                delete vm.TAB.fromProject
            }
        });

        var reqUpdatedListener = $rootScope.$on('reqUpdated', function (e, req) {
            if (vm.TAB.id === req._id && vm._modified < req._modified) {
                vm.reload = true;
                vm.updatedReq = req;
            }
        });

        $scope.$on('RefreshRequest', function () {
            init($rootScope.loadRequest || $scope.$parent.vm.selectedReq);
        })

        $scope.$watch('vm.scriptType', function (newValue, oldValue) {
            switch (oldValue) {
                case 'PreRun':
                    vm.Editor.Prerun.model = vm.Editor.Scripts;
                    break;
                case 'PostRun':
                    vm.Editor.Postrun.model = vm.Editor.Scripts;
                    break;
            }

            switch (newValue) {
                case 'PreRun':
                    vm.Editor.Scripts = vm.Editor.Prerun.model;
                    break;
                case 'PostRun':
                    vm.Editor.Scripts = vm.Editor.Postrun.model;
                    break;
            }
        });

        $scope.$on('$destroy', function () {
            tabSavedListener();
            reqDeletedListener();
            reqUpdatedListener();
        });
    }
})();
