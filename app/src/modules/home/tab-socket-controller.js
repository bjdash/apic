(function () {
    'use strict';
    angular.module('app.home')
        .controller('SocketTabCtrl', SocketTabCtrl);

    SocketTabCtrl.$inject = ['$scope', 'StompSocket', '$rootScope', '$timeout', 'toastr', 'Utils'];
    function SocketTabCtrl($scope, StompSocket, $rootScope, $timeout, toastr, Utils) {
        var vm = this;
        vm.TAB = $scope.$parent.tab;
        vm.URL = '';
        vm.client = null;
        vm.connected = false;
        vm.connection = {
            id: '',
            psd: '',
            vhost: '',
            subscUrl: '',
            headers: [{ key: '', val: '' }]
        };
        vm.destQ = '';
        vm.newListener = '';
        vm.flags = {
            useCred: false,
            showPsd: false,
            sent: false,
            sendOptn: {
                mode: 'json'
            },
            conn: false,
            send: false,
            msg: false
        };
        vm.METHOD = 'Websocket';
        vm.messages = [];
        vm.sendText = '';
        vm.curEnv = {
            name: 'No Environment'
        };
        vm.socketio = sioReset();
        vm.sse = sseReset();
        var sseListenerFns = {};

        vm.addRow = addRow;
        vm.connect = connect;
        vm.disconnect = disconnect;
        vm.send = send;
        vm.initReqSave = initReqSave;
        vm.sioAddArg = sioAddArg;
        vm.sioSaveCurrentArg = sioSaveCurrentArg;
        vm.sioLoadArgVal = sioLoadArgVal;
        vm.sioRemoveArg = sioRemoveArg;

        vm.wsAddListener = wsAddListener;
        vm.wsRemoveListener = wsRemoveListener;
        vm.wsToggleListener = wsToggleListener;

        init($rootScope.loadRequest);

        function init(tab) {
            if (tab) {
                //var tab = $rootScope.loadRequest;
                vm.URL = tab.url;
                vm.METHOD = tab.method;

                if (tab._modified) {
                    vm._modified = tab._modified;
                }
                switch (vm.METHOD) {
                    case 'Stomp':
                        if (tab.connection) {
                            vm.connection = tab.connection;
                        }
                        vm.destQ = tab.destQ ? tab.destQ : '';
                        break;
                    case 'Socketio':
                        vm.socketio = tab.socketio;
                        if (tab.socketio && tab.socketio.args.length > 0) {
                            sioLoadArgVal(0);
                        }
                        break;
                    case 'SSE': {
                        vm.sse = tab.sse;
                        break;
                    }
                }

                //if loaded from a saved request
                if (tab.hasOwnProperty('name')) {
                    vm.TAB.id = tab._id;
                    vm.TAB.title = tab.name;
                }
                $rootScope.loadRequest = null;
            }
            vm.reload = false;
            $timeout(function () {
                $rootScope.focus('.tab-pane.active .URL');
            });
        }

        function addRow(list, index) {
            if (list.length - 1 === index) {
                list.push({ key: '', val: '' });
            }
        }

        function connect() {
            var url = Utils.interpolate(vm.URL);
            if (!url) {
                toastr.error('Please specify a valid URL to connect to.');
                return;
            }
            vm.progress = true;
            try {
                if (vm.METHOD === 'Stomp') {
                    vm.client = new StompSocket(url, Utils.interpolate(vm.connection), on_connect, on_stomp_mesage, on_error);
                    vm.client.connect();
                } else if (vm.METHOD === 'Socketio') {
                    var path = Utils.interpolate(vm.socketio.path) || '/socket.io';
                    var option = {
                        path: path,
                        reconnection: false
                    }
                    if (vm.socketio.query.length > 0) {
                        var query = Utils.arrayToObj(Utils.interpolate(vm.socketio.query));
                        if (Object.keys(query).length > 0) {
                            option.query = query;
                        }
                    }
                    var transport = [];
                    if (vm.socketio.transport[0]) transport.push('polling');
                    if (vm.socketio.transport[1]) transport.push('websocket');
                    if (transport.length > 0) {
                        option.transports = transport;
                    }
                    if (transport.indexOf('pooling') >= 0 && vm.socketio.headers.length > 0) {
                        var headers = Utils.arrayToObj(Utils.interpolate(vm.socketio.headers));
                        if (Object.keys(headers).length > 0) {
                            option.transportOptions = {
                                extraHeaders: headers
                            }
                        }
                    }
                    vm.client = io(url, option);
                    vm.client.on('connect', on_connect);
                    vm.client.on('error', on_error);
                    vm.client.on('disconnect', on_disconnect);
                } else if (vm.METHOD === 'SSE') {
                    vm.client = new EventSource(url);
                    vm.client.onmessage = function (event) {
                        console.log(event);
                    }

                    vm.client.addEventListener('open', function (e) {
                        on_connect();
                    }, false);

                    vm.client.addEventListener('error', function (e) {
                        if (e.readyState == EventSource.CLOSED) {
                            on_disconnect();
                        } else {
                            on_error(e);
                        }
                    }, false);
                } else {
                    if (!url || (url.indexOf('ws://') !== 0 && url.indexOf('wss://') !== 0)) {
                        toastr.error('The specified URL is not a valid Websocket URL');
                        vm.progress = false;
                        return;
                    }

                    vm.client = new WebSocket(url);
                    vm.client.onopen = function (evt) {
                        on_connect();
                    };
                    vm.client.onclose = on_disconnect;
                    vm.client.onmessage = on_socket_message;//function(evt) { onMessage(evt) };
                    vm.client.onerror = on_error;
                }
            } catch (e) {
                toastr.error('Failed to connect. ' + e.message);
                vm.progress = false;
            }
        }

        function on_connect() {
            vm.progress = false;
            vm.connected = true;
            vm.messages = [{
                type: 'a',
                body: vm.METHOD + ' connected.',
                time: Date.now()
            }];
            if (vm.METHOD === 'Socketio') {
                vm.socketio.listeners.forEach(function (listener) {
                    if (listener.active) wsListen(listener.name, 'socketio');
                })
            }
            if (vm.METHOD === 'SSE') {
                vm.sse.listeners.forEach(function (listener) {
                    if (listener.active) wsListen(listener.name, 'sse');
                })
            }
            $scope.$apply();
        }

        function disconnect() {
            if (vm.client) {
                if (vm.METHOD === 'Stomp') {
                    vm.client.disconnect();
                    //TODO: Handle disconnect via event
                    on_disconnect();
                } else if (vm.METHOD === 'Socketio') {
                    vm.client.disconnect();
                } else if (vm.METHOD === 'SSE') {
                    vm.client.close();
                    sseListenerFns = {};
                    on_disconnect();
                } else {
                    vm.client.close();
                }
                // vm.client = null; done vai on_disconnect for all
            } else {
                vm.connected = false;
            }
        }

        function on_disconnect() {
            vm.connected = false;
            vm.client = null;
            vm.messages.push({
                type: 'a',
                body: 'Socket disconnected.',
                time: Date.now()
            })
            try {
                $rootScope.safeApply();
            } catch (e) { }
        }

        function on_error(e) {
            vm.connected = false;
            vm.client = null;
            var msg = {
                headers: e.headers
            };
            try {
                msg.body = JSON.parse(e.body || e.message);
            } catch (err) {
                msg.body = e.body || e.message;
            }
            msg.type = 'error';
            vm.messages.push(msg);
            $scope.$apply();
        }

        function send() {
            if (!vm.client) {
                toastr.error('It looks like you are not connected.');
                return;
            }
            var sendData = Utils.interpolate(vm.sendText);
            if (vm.METHOD === 'Stomp') {
                vm.client.send(Utils.interpolate(vm.destQ), {}, sendData);
                sent(sendData);
            } else if (vm.METHOD === 'Socketio') {
                sioSaveCurrentArg();
                var argsToSend = vm.socketio.args.map(function (text, index) {
                    var iText = Utils.interpolate(text);
                    return vm.socketio.argTypes[index] === 'json' ? JSON.parse(iText) : iText;
                });
                var emitName = Utils.interpolate(vm.socketio.emitName);
                vm.client.emit.apply(vm.client, [emitName].concat(argsToSend));
                if (argsToSend.length === 1) {
                    sent(argsToSend[0], emitName)
                } else {
                    sent(argsToSend, emitName + ' [' + argsToSend.length + ' arguments]');
                }
            } else {
                try {
                    vm.client.send(sendData);
                    sent(sendData);
                } catch (e) {
                    toastr.error(e.message);
                }
            }
        }

        function sent(msg, head) {
            vm.messages.push({
                head: head,
                body: msg,
                type: 'o',
                time: Date.now()
            })
            vm.flags.sent = true;
            $timeout(function () {
                vm.flags.sent = false;
            }, 2000);
        }

        function on_stomp_mesage(message) {
            var msg = {
                headers: message.headers,
                type: 'i',
                time: Date.now()
            };
            try {
                msg.body = JSON.parse(message.body);
            } catch (e) {
                msg.body = message.body;
            }
            vm.messages.push(msg);
            $scope.$apply();
        }

        function on_socket_message(e) {
            var msg = {
                type: 'i',
                time: Date.now()
            }
            try {
                msg.body = JSON.parse(e.data);
            } catch (err) {
                msg.body = e.data;
            }
            vm.messages.push(msg);
            $scope.$apply();
        }

        function on_sio_message(message, listener) {
            var msg = {
                head: listener,
                type: 'i',
                time: Date.now()
            }
            if (typeof message === 'object') {
                msg.body = message
            } else {
                try {
                    msg.body = JSON.parse(message);
                } catch (err) {
                    msg.body = message;
                }
            }
            vm.messages.push(msg);
            $scope.$apply();
        }

        function on_sse_message(e, listener) {
            var msg = {
                head: listener,
                type: 'i',
                time: Date.now()
            }
            try {
                msg.body = JSON.parse(e.data);
            } catch (err) {
                msg.body = e.data;
            }
            vm.messages.push(msg);
            $scope.$apply();
        }

        function initReqSave(saveAs) {
            var saveData = getSaveData();

            vm._modified = new Date().getTime();
            saveData._modified = vm._modified;
            saveData.type = 'ws';

            if (saveAs) {
                saveData.saveAs = true;
            }
            $rootScope.sendSaveRequest(saveData);
        }

        function getSaveData(saveAs) {
            switch (vm.METHOD) {
                case 'Stomp':
                    return {
                        url: vm.URL,
                        method: vm.METHOD,
                        connection: vm.connection,
                        destQ: vm.destQ,
                        tabId: vm.TAB.id
                    };
                case 'Websocket':
                    return {
                        url: vm.URL,
                        method: vm.METHOD,
                        tabId: vm.TAB.id,
                        message: vm.sendText
                    }
                case 'Socketio':
                    sioSaveCurrentArg();
                    return {
                        url: vm.URL,
                        method: vm.METHOD,
                        tabId: vm.TAB.id,
                        socketio: vm.socketio
                    }
                case 'SSE':
                    return {
                        url: vm.URL,
                        method: vm.METHOD,
                        tabId: vm.TAB.id,
                        sse: vm.sse
                    }
            }

        }

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
            }
        });

        var reqUpdatedListener = $rootScope.$on('reqUpdated', function (e, req) {
            if (vm.TAB.id === req._id && vm._modified < req._modified) {
                vm.reload = true;
                vm.updatedReq = req;
            }
        });

        var envUpdatedListener = $rootScope.$on('envUpdated', function () {
            if (vm.curEnv && vm.curEnv._id && $rootScope.ENVS) {
                for (var i = 0; i < $rootScope.ENVS.length; i++) {
                    if ($rootScope.ENVS[i]._id === vm.curEnv._id) {
                        vm.curEnv.vals = Utils.processEnv($rootScope.ENVS[i].vals);
                        break;
                    }
                }
            }
        });

        function sioReset() {
            return {
                path: '',
                transport: [true, true],
                query: [{ key: '', val: '' }],
                headers: [{ key: '', val: '' }],
                emitName: '',
                args: [''],
                argTypes: ['json'],
                curArg: 0,
                listeners: []
            }
        }

        function sioAddArg() {
            sioSaveCurrentArg();
            vm.socketio.args.push('');
            vm.socketio.argTypes.push('json');
            vm.socketio.curArg = vm.socketio.args.length - 1;
            sioLoadArgVal(vm.socketio.curArg);
        }

        function sioSaveCurrentArg() {
            vm.socketio.args[vm.socketio.curArg] = vm.sendText;
            vm.socketio.argTypes[vm.socketio.curArg] = vm.flags.sendOptn.mode;
        }

        function sioLoadArgVal(index) {
            vm.sendText = vm.socketio.args[index];
            vm.flags.sendOptn.mode = vm.socketio.argTypes[index];
            vm.socketio.curArg = index;
        }

        function sioRemoveArg(index, eve) {
            eve.stopPropagation();
            vm.socketio.args.splice(index, 1);
            vm.socketio.argTypes.splice(index, 1);
            if (index === vm.socketio.curArg) {
                sioLoadArgVal(0);
                return;
            }
            if (index < vm.socketio.curArg) {
                vm.socketio.curArg--;
            }
        }

        function wsAddListener(newListener, type) {
            var listener = Utils.interpolate(newListener);
            if (vm[type].listeners.find(function (l) {
                return l.name === listener;
            })) {
                toastr.error('Alreading listening for ' + listener);
                return;
            }
            vm[type].listeners.push({
                name: listener,
                active: true
            });
            wsListen(listener, type);
        }

        function wsListen(listener, type) {
            if (vm.client) {
                switch (type) {
                    case 'socketio':
                        vm.client.on(listener, function (message) {
                            on_sio_message(message, listener);
                        })
                        break;
                    case 'sse':
                        sseListenerFns[listener] = function (e) {
                            on_sse_message(e, listener);
                        };
                        vm.client.addEventListener(listener, sseListenerFns[listener], false);
                        break;
                }
                vm.messages.push({
                    type: 'a',
                    body: 'Started listening for ' + listener + ' events.',
                    time: Date.now()
                })
            }
        }

        function wsRemoveListener(index, type) {
            wsStopListening(vm[type].listeners[index].name, type);
            vm[type].listeners.splice(index, 1);
        }

        function wsStopListening(listener, type) {
            if (vm.client) {
                switch (type) {
                    case 'socketio':
                        vm.client.off(listener);
                        break;
                    case 'sse':
                        vm.client.removeEventListener(listener, sseListenerFns[listener]);
                        break;
                }
                vm.messages.push({
                    type: 'a',
                    body: 'Stopped listening for all ' + listener + ' events.',
                    time: Date.now()
                })
            }
        }

        function wsToggleListener(name, isActive, type) {
            if (isActive) wsListen(name, type);
            else wsStopListening(name, type);
        }

        function sseReset() {
            return {
                withCred: false,
                listeners: [{
                    name: 'message',
                    active: true,
                    readonly: true
                }]
            }
        }

        $scope.$on('$destroy', function () {
            tabSavedListener();
            reqDeletedListener();
            envUpdatedListener();
            reqUpdatedListener();
            disconnect();
        });
    }
})();