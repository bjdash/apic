//@ts-check
/* global apic */

(function () {
    'use strict';

    angular
        .module('apic')
        .factory('Runner', Runner);

    Runner.$inject = ['$q', 'Const', 'Utils', '$interpolate', '$rootScope', 'Tester'];
    function Runner($q, Const, Utils, $interpolate, $rootScope, Tester) {
        var Runner = function () {
            this.xhr = undefined;
            this.req = undefined;
            this.execute = execute;
            this.postRunCB = postRunCB;
            this.defer = '';
            this.test = Math.random();
        };

        Runner.prototype.run = run;
        Runner.prototype.abort = abort;
        Runner.prototype.listenForMessage = listenForMessage;

        //METHOD, URL, Const.REQ.headers, Const.Body, Const.with_body
        /**
         * functoin to run a request.
         * @function
         * @param {object} req - Angular scope object.
         * @return {undefined} returns nothing
         * fields{
         *    request:{
         *        url: url to be run,
         *        method: request method,
         *        headers: object of headers to be sent {accept:'application/json'},
         *        query: object of query params to be sent {accept:'application/json'},
         *        bodyMeta: {
         *            type: request content type x-www-form-urlencoded/form-data/raw
         *            xForms: x-www-form-urlencoded form data,
         *            selectedRaw: content type to be specified if type is raw,
         *            rawData: data to be sent for raw request type,
         *        }
         *    },
         *    env: selected environment value,
         *    prescript: script to be executed before run,
         *    postscript: script to be executed after run,
         *    respCodes: array of json schemas
         * }
         */
        function run(req) {
            // console.log(req);
            this.defer = $q.defer();

            //Execute preRun Scripts
            if (req.prescript) {
                var script = {
                    type: 'prescript',
                    req: req
                };
                this.listenForMessage(this.execute);
                Tester.run(script);
            } else {
                this.execute(req);
            }

            return this.defer.promise;
        }

        function execute(req) {
            var _this = this;
            //load envs if anything set in pre sript of this request
            if (!req.env.vals) req.env.vals = {};
            if (req.xtraEnv && !$rootScope.xtraEnv) {
                $rootScope.xtraEnv = {};
            }
            req.env.vals = angular.merge(req.env.vals, req.xtraEnv);

            //Preprocessing before sending request
            var originalUrl = req.request.url;

            /*** Interpolating URL, raw body, headers, form data, x-form etc **/
            if (!req.env)
                req.env = {};
            if (!req.env.vals)
                req.env.vals = {};
            //req.env.vals = angular.merge(req.env.vals, $rootScope.xtraEnv);
            req.env.vals.apic = apic;

            //interpolating URL
            var URL = req.request.url;
            req.request.url = $interpolate(URL)(req.env.vals);
            req.request.url = Utils.checkForHTTP(req.request.url);

            // interpolating raw body data
            if (req.request.bodyMeta && req.request.bodyMeta.rawData) {
                req.request.bodyMeta.rawData = $interpolate(req.request.bodyMeta.rawData)(req.env.vals);
            }

            //interpolate query params
            Object.keys(req.request.query).forEach(function (key) {
                var ikey = $interpolate(key)(req.env.vals);
                var ival = $interpolate(req.request.query[key])(req.env.vals);
                delete req.request.query[key];
                req.request.query[ikey] = ival
            })
            req.request.url = Utils.prepareQueryParams(req.request.url, req.request.query);

            //interpolating header key and values
            Object.keys(req.request.headers).forEach(function (key) {
                var ikey = $interpolate(key)(req.env.vals);
                var ival = $interpolate(req.request.headers[key])(req.env.vals);
                delete req.request.headers[key];
                req.request.headers[ikey] = ival

            })

            //interpolating x-www-form-urlencoded form data (key and values)
            if (req.request.bodyMeta && req.request.bodyMeta.xForms) {
                var xForms = req.request.bodyMeta.xForms;
                req.request.bodyMeta.xForms = [];
                for (var i = 0; i < xForms.length; i++) {
                    if (xForms[i].key && ((xForms[i].hasOwnProperty('active') && xForms[i].active) || !xForms[i].hasOwnProperty('active'))) {
                        var xdata = { active: true };
                        xdata.key = $interpolate(xForms[i].key)(req.env.vals);
                        xdata.val = $interpolate(xForms[i].val)(req.env.vals);
                        req.request.bodyMeta.xForms.push(xdata);
                    }
                }
            }

            if (req.request.bodyMeta && req.request.bodyMeta.formData) {
                var formData = req.request.bodyMeta.formData;
                req.request.bodyMeta.formData = [];
                for (var i = 0; i < formData.length; i++) {
                    if (formData[i].key && ((formData[i].hasOwnProperty('active') && formData[i].active) || !formData[i].hasOwnProperty('active'))) {
                        var data = { active: true, type: formData[i].type }
                        data.key = $interpolate(formData[i].key)(req.env.vals);
                        if (formData[i].type === 'Text') {
                            data.val = $interpolate(formData[i].val)(req.env.vals);
                        } else {
                            data.val = formData[i].val;
                            data.file = formData[i].file;
                        }
                        req.request.bodyMeta.formData.push(data);
                    }
                }
            }

            delete req.env.vals.apic;
            /******** Finished interpolation **//////

            _this.xhr = new XMLHttpRequest();
            _this.xhr.open(req.request.method, req.request.url, true);

            var headers = angular.copy(req.request.headers);
            //add apic token
            headers['X-APIC-REQ-ID'] = s8() + '-' + s8();

            var sentTime;
            var BODY = null;

            //Prepare body to be sent with the request
            if (Const.with_body.indexOf(req.request.method) >= 0) {
                switch (req.request.bodyMeta.type) {
                    case 'x-www-form-urlencoded':
                        BODY = Utils.getUrlEncodedBody(req.request.bodyMeta.xForms);
                        if (BODY) {
                            headers['Content-Type'] = 'application/x-www-form-urlencoded';
                        }
                        break;
                    case 'raw':
                        BODY = req.request.bodyMeta.rawData;
                        if (BODY) {
                            headers['Content-Type'] = req.request.bodyMeta.selectedRaw.val;
                        }
                        break;
                    case 'graphql':
                        req.request.bodyMeta.type = 'raw';
                        BODY = Utils.getGqlBody(req.request.bodyMeta.rawData, req.request.bodyMeta.gqlVars);
                        headers['Content-Type'] = 'application/json';
                        break;
                    case 'form-data':
                        BODY = Utils.getFormDataBody(req.request.bodyMeta.formData);
                        break;
                }
            }
            _this.xhr.addHeadersFromObj(headers);
            _this.xhr.responseType = 'text';

            _this.xhr.onreadystatechange = function (event) {
                if (event.target.readyState === 4) {
                    //calculating time taken
                    var respTime = new Date().getTime();
                    var timeDiff = respTime - sentTime;
                    var target = event.target;
                    var headerStr = target.getAllResponseHeaders();
                    var respObj = {
                        headersStr: headerStr, // not available in apic-cli
                        headers: Utils.prepareHeadersObj(headerStr),
                        status: target.status,
                        statusText: target.statusText,
                        readyState: target.readyState,
                        body: target.response,
                        timeTaken: timeDiff
                    };
                    //convert response to json object
                    var jsonResp = undefined;
                    try {
                        jsonResp = JSON.parse(respObj.body);
                    } catch (e) {
                        console.info('The response cant be converted to JSON');
                    }
                    if (jsonResp) {
                        respObj.data = jsonResp;
                    }

                    _this.req.response = respObj;
                    if (_this.req.postscript) {
                        var script = {
                            type: 'postscript',
                            req: _this.req
                        };
                        _this.listenForMessage(_this.postRunCB);
                        Tester.run(script);
                    } else {
                        _this.req.tests = [];
                        _this.defer.resolve(_this.req);
                    }

                }
            };

            sentTime = new Date().getTime();
            if (BODY) {
                req.request.body = Utils.getReqBody(BODY, req.request.bodyMeta.type);
                _this.xhr.send(BODY);
            } else {
                req.request.body = {};
                _this.xhr.send();
            }

            _this.req = req;
        }

        function abort() {
            this.xhr.abort();
        }

        function listenForMessage(callback) {
            var _this = this;
            var listener = $rootScope.$on('messageReceived', function (event, args) {
                listener();
                if (typeof callback === 'function') {
                    callback.call(_this, args.data);
                }
            });
        }

        function postRunCB(reqObj) {
            var _this = this;
            _this.req = reqObj;
            _this.defer.resolve(_this.req);
        }

        return Runner;
    }
})();