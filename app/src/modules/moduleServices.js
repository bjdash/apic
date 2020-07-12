/* global Stomp, apic */

(function () {
    'use strict';

    angular.module('apic')
        .factory('SyncIt', SyncIt)
        .factory('DataService', DataService)
        .factory('ngSockJs', ngSockJs)
        .factory('lMenuService', leftMenu)
        .factory('DesignerServ', DesignerServ)
        .factory('EnvService', EnvService)
        .factory('TeamService', TeamService)
        .factory('ShareIt', ShareIt);

    SyncIt.$inject = ['ngSockJs', 'iDB'];
    function SyncIt(ngSockJs, iDB) {
        var service = {
            fetch: fetch,
            execute: execute,
            syncUnsynced: syncUnsynced,
            prepareAndSync: prepareAndSync
        };

        function fetch(command, time, data) {
            var allIds = {};
            if (data) {
                if (data.apiProjects) {
                    allIds.apiProjects = [];
                    for (var i = 0; i < data.apiProjects.length; i++) {
                        if (data.apiProjects[i]._id.indexOf('-demo') < 0) {
                            allIds.apiProjects.push({ _id: data.apiProjects[i]._id, _modified: data.apiProjects[i]._modified });
                        }
                    }
                }
                if (data.envs) {
                    allIds.envs = [];
                    for (var i = 0; i < data.envs.length; i++) {
                        if (data.envs[i]._id.indexOf('-demo') < 0) {
                            allIds.envs.push({ _id: data.envs[i]._id, _modified: data.envs[i]._modified });
                        }
                    }
                }
                if (data.folders) {
                    allIds.folders = [];
                    for (var i = 0; i < data.folders.length; i++) {
                        if (data.folders[i]._id.indexOf('-demo') < 0) {
                            allIds.folders.push({ _id: data.folders[i]._id, _modified: data.folders[i]._modified });
                        }
                    }
                }
                if (data.apiRequests) {
                    allIds.apiRequests = [];
                    for (var i = 0; i < data.apiRequests.length; i++) {
                        if (data.apiRequests[i]._id.indexOf('-demo') < 0) {
                            allIds.apiRequests.push({ _id: data.apiRequests[i]._id, _modified: data.apiRequests[i]._modified });
                        }
                    }
                }
                if (data.testCaseProjects) {
                    allIds.testCaseProjects = [];
                    for (var i = 0; i < data.testCaseProjects.length; i++) {
                        if (data.testCaseProjects[i]._id.indexOf('-demo') < 0) {
                            allIds.testCaseProjects.push({ _id: data.testCaseProjects[i]._id, _modified: data.testCaseProjects[i]._modified });
                        }
                    }
                }
                if (data.testSuits) {
                    allIds.testSuits = [];
                    for (var i = 0; i < data.testSuits.length; i++) {
                        if (data.testSuits[i]._id.indexOf('-demo') < 0) {
                            allIds.testSuits.push({ _id: data.testSuits[i]._id, _modified: data.testSuits[i]._modified });
                        }
                    }
                }
            }
            var opId = s12();
            ngSockJs.opIds[opId] = command;
            var toSend = {
                command: command,
                since: time ? time : 0,
                opId: opId
            };
            toSend = angular.extend(toSend, allIds);
            ngSockJs.send(toSend);
            if (command === 'fetchAll') {
                angular.element('#avatar').removeClass('online offline').addClass('syncing');
            }
        }

        function execute(command, data, opId) {
            if (!opId) {
                opId = s12();
            }
            ngSockJs.opIds[opId] = command;
            data.command = command;
            data.opId = opId;
            ngSockJs.send(data);
        }

        function syncUnsynced() {
            iDB.readSorted('unsynced', 'time', 'desc').then(function (data) {
                if (!data) {
                    return;
                }
                data.sort(function (a, b) {
                    return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0);
                });

                for (var i = 0; i < data.length; i++) {
                    var entry = data[i].data;
                    execute(entry.command, entry, data[i]._id);
                }
            });
        }

        function prepareAndSync(action, data, unSyncId) {
            var outData;
            switch (action) {
                case 'addEnv':
                case 'updateEnv':
                    outData = {
                        envs: data instanceof Array ? data : [data]
                    };
                    execute(action, outData, unSyncId);
                    break;
                case 'addAPIProject':
                case 'updateAPIProject':
                    outData = {
                        apiProjects: data instanceof Array ? data : [data]
                    };
                    execute(action, outData, unSyncId);
                    break;
                case 'addFolder':
                case 'updateFolder':
                    outData = {
                        folders: data instanceof Array ? data : [data]
                    };
                    execute(action, outData, unSyncId);
                    break;
                case 'addAPIReq':
                case 'updateAPIReq':
                    outData = {
                        apiRequests: data instanceof Array ? data : [data]
                    };
                    execute(action, outData, unSyncId);
                    break;
                case 'addTestProj':
                    outData = {
                        testCaseProjects: data instanceof Array ? data : [data]
                    };
                    execute(action, outData, unSyncId);
                    break;
                case 'addTestSuit':
                case 'updateTestSuit':
                    outData = {
                        testSuits: data instanceof Array ? data : [data]
                    };
                    execute(action, outData, unSyncId);
                    break;
                case 'deleteEnv':
                case 'deleteAPIProject':
                case 'deleteFolder':
                case 'deleteAPIReq':
                case 'deleteTestProj':
                case 'deleteTestSuit':
                    outData = {
                        idList: data instanceof Array ? data : [data]
                    };
                    execute(action, outData, unSyncId);
                    break;
            }
        }
        return service;
    }

    DataService.$inject = ['EnvService', 'DesignerServ', 'lMenuService', '$q', '$rootScope', 'iDB', 'toastr'];
    function DataService(EnvService, DesignerServ, lMenuService, $q, $rootScope, iDB, toastr) {
        var service = {
            getAllData: getAllData,
            executeIncoming: executeIncoming,
            clearAllData: clearAllData,
            authExpired: authExpired
        };

        function getAllData(excludeDemo) {
            var dfr = $q.defer(), promises = [];
            var data = {};

            //get All environments
            promises.push(EnvService.getAllEnvs().then(function (envs) {
                if (excludeDemo) {
                    data.envs = apic.removeDemoItems(envs);
                } else {
                    data.envs = envs;
                }
            }));

            //get all api projects
            promises.push(DesignerServ.getApiProjs().then(function (projects) {
                if (excludeDemo) {
                    data.apiProjects = apic.removeDemoItems(projects);
                } else {
                    data.apiProjects = projects;
                }
            }));

            //get all folders
            promises.push(lMenuService.getAllFolders().then(function (folders) {
                if (excludeDemo) {
                    data.folders = apic.removeDemoItems(folders);
                } else {
                    data.folders = folders;
                }
            }));

            //get all requests
            promises.push(lMenuService.getSavedReqs().then(function (reqs) {
                if (excludeDemo) {
                    data.apiRequests = apic.removeDemoItems(reqs);
                } else {
                    data.apiRequests = reqs;
                }
            }));

            //get all TestCaseProjects
            promises.push(lMenuService.getAllProj().then(function (testProjs) {
                if (excludeDemo) {
                    data.testCaseProjects = apic.removeDemoItems(testProjs);
                } else {
                    data.testCaseProjects = testProjs;
                }
            }));

            //get all test suits
            promises.push(lMenuService.getAllSuits().then(function (suits) {
                if (excludeDemo) {
                    data.testSuits = apic.removeDemoItems(suits);
                } else {
                    data.testSuits = suits;
                }
            }));


            $q.all(promises).then(function () {
                dfr.resolve(data);
            }, function () {
                dfr.resolve(data);
            });
            return dfr.promise;
        }

        function executeIncoming(data) {
            //TODO: my unsynced data got saved, so remove from unsynced, never executed, need to delete
            if (data.opId.indexOf('unsynced-') >= 0 && data.own) {
                console.log('remove unsynced ', data.opId);
            }
            switch (data.type) {
                case 'Environments':
                    caseEnvironments(data);
                    break;
                case 'APIProjects':
                    caseAPIProjects(data);
                    break;
                case 'Folders':
                    caseFolders(data);
                    break;
                case 'APIRequests':
                    caseAPIReqs(data);
                    break;
                case 'TestCaseProjects':
                    caseTestCaseProjects(data);
                    break;
                case 'TestSuits':
                    caseTestSuits(data);
                    break;
                case 'Team':
                    caseTeam();
                    break;
                case 'All':
                    caseEnvironments(data);
                    caseAPIProjects(data);
                    caseFolders(data);
                    caseAPIReqs(data);
                    caseTestCaseProjects(data);
                    caseTestSuits(data);
                    if (data.nonExistant) {
                        caseNonExistant(data.nonExistant);
                    }
                    break;
                case 'Account':
                    if (data.msg === 'logout') {
                        $rootScope.reconnect();
                    }
                    break;
                case 'Error':
                    toastr.error(data.msg);

            }
        }

        function caseEnvironments(data) {
            if ((data.envs && data.envs.length > 0) || (data.idList && data.idList.length > 0)) {
                if (data.action === 'update' || data.action === 'add') {
                    EnvService.updateEnv(data.envs, true);
                } else if (data.action === 'delete') {
                    for (var i = 0; i < data.idList.length; i++) {
                        console.log('deleting', data.idList[i]);
                        EnvService.deleteEnv(data.idList[i], true);
                    }
                }
                EnvService.getAllEnvs().then(function (data) {
                    $rootScope.$emit('envUpdated');
                });
            }
        }

        function caseAPIProjects(data) {
            if ((data.apiProjects && data.apiProjects.length > 0) || (data.idList && data.idList.length > 0)) {
                if (data.action === 'update' || data.action === 'add') {
                    DesignerServ.updateAPIProjects(data.apiProjects, true).then(function () {
                        $rootScope.$emit('ApiProjChanged', data.opId);
                    });
                } else if (data.action === 'delete') {
                    var promises = [];
                    for (var i = 0; i < data.idList.length; i++) {
                        console.log('deleting', data.idList[i]);
                        var p = DesignerServ.deleteAPIProject(data.idList[i], true);
                        promises.push(p);
                    }
                    $q.all(promises).then(function () {
                        $rootScope.$emit('ApiProjRemoved', data.idList);
                    });
                }
            }
        }

        function caseFolders(data) {
            if ((data.folders && data.folders.length > 0) || (data.idList && data.idList.length > 0)) {
                if (data.action === 'update' || data.action === 'add') {
                    lMenuService.updateFolder(data.folders, true).then(function () {
                        $rootScope.$emit('FoldersChanged');
                    });
                } else if (data.action === 'delete') {
                    var promises = [];
                    for (var i = 0; i < data.idList.length; i++) {
                        var p = lMenuService.deleteFolder(data.idList[i], true);
                        promises.push(p);
                    }
                    $q.all(promises).then(function () {
                        $rootScope.$emit('FoldersChanged');
                    });
                }
            }
        }

        function caseAPIReqs(data) {
            if ((data.apiRequests && data.apiRequests.length > 0) || (data.idList && data.idList.length > 0)) {
                if (data.action === 'update' || data.action === 'add') {
                    lMenuService.upsertReq(data.apiRequests, true).then(function () {
                        $rootScope.$emit('FoldersChanged', {
                            reqs: data.apiRequests,
                            type: 'reqUpdated'
                        });
                    });
                } else if (data.action === 'delete') {
                    var promises = [];
                    for (var i = 0; i < data.idList.length; i++) {
                        var p = lMenuService.deleteReq(data.idList[i], true);
                        //TODO: may need to call $rootScope.$broadcast('reqDeleted', {tabId: reqId});on then of above
                        promises.push(p);
                        $q.all(promises).then(function () {
                            $rootScope.$emit('FoldersChanged', {
                                reqsIds: data.idList,
                                type: 'reqDeleted'
                            });
                        });
                    }
                }
            }
        }

        function caseTestCaseProjects(data) {
            if ((data.testCaseProjects && data.testCaseProjects.length > 0) || (data.idList && data.idList.length > 0)) {
                if (data.action === 'update' || data.action === 'add') {
                    lMenuService.updateProj(data.testCaseProjects, true).then(function () {
                        $rootScope.$emit('TestProjCreated', data.testCaseProjects);
                    });
                } else if (data.action === 'delete') {
                    for (var i = 0; i < data.idList.length; i++) {
                        var promises = [];
                        var p = lMenuService.deleteProj(data.idList[i], true);
                        promises.push(p);
                        $q.all(promises).then(function () {
                            $rootScope.$emit('TestProjDeleted', data.idList);
                        });
                    }
                }
            }
        }

        function caseTestSuits(data) {
            if ((data.testSuits && data.testSuits.length > 0) || (data.idList && data.idList.length > 0)) {
                if (data.action === 'update' || data.action === 'add') {
                    lMenuService.updateSuit(data.testSuits, true).then(function () {
                        $rootScope.$emit('TestSuitUpdated', data.testSuits);
                    });
                } else if (data.action === 'delete') {
                    for (var i = 0; i < data.idList.length; i++) {
                        var promises = [];
                        var p = lMenuService.deleteSuit(data.idList[i], true);
                        promises.push(p);
                        $q.all(promises).then(function () {
                            $rootScope.$emit('TestSuitDeleted', data.idList);
                        });
                    }
                }
            }
        }

        function caseNonExistant(data) {
            if (data.apiProjects && data.apiProjects.length > 0) {
                var promisesProjs = [];
                for (var i = 0; i < data.apiProjects.length; i++) {
                    var p = DesignerServ.deleteAPIProject(data.apiProjects[i], true);
                    promisesProjs.push(p);
                }
                $q.all(promisesProjs).then(function () {
                    $rootScope.$emit('ApiProjChanged');
                });
            }
            if (data.envs && data.envs.length > 0) {
                var promisesEnvs = [];
                for (var i = 0; i < data.envs.length; i++) {
                    var p = EnvService.deleteEnv(data.envs[i], true);
                    promisesEnvs.push(p);
                }
                $q.all(promisesEnvs).then(function () {
                    EnvService.getAllEnvs().then(function (data) {
                        $rootScope.ENVS = data;
                        $rootScope.$emit('envUpdated');
                    });
                });
            }
            if (data.folders && data.folders.length > 0) {
                var promisesFolders = [];
                for (var i = 0; i < data.folders.length; i++) {
                    var p = lMenuService.deleteFolder(data.folders[i], true);
                    promisesFolders.push(p);
                }
                $q.all(promisesFolders).then(function () {
                    $rootScope.$emit('FoldersChanged');
                });
            }
            if (data.apiRequests && data.apiRequests.length > 0) {
                var promisesReqs = [];
                for (var i = 0; i < data.apiRequests.length; i++) {
                    var p = lMenuService.deleteReq(data.apiRequests[i], true);
                    promisesReqs.push(p);
                }
                $q.all(promisesReqs).then(function () {
                    $rootScope.$emit('FoldersChanged');
                });
            }
            if (data.testCaseProjects && data.testCaseProjects.length > 0) {
                var promisesTProj = [];
                for (var i = 0; i < data.testCaseProjects.length; i++) {
                    var p = lMenuService.deleteProj(data.testCaseProjects[i], true);
                    promisesTProj.push(p);
                }
                $q.all(promisesTProj).then(function () {
                    $rootScope.$emit('TestProjDeleted', data.testCaseProjects);
                });
            }
            if (data.testSuits && data.testSuits.length > 0) {
                var promisesSuit = [];
                for (var i = 0; i < data.testSuits.length; i++) {
                    var p = lMenuService.deleteSuit(data.testSuits[i], true);
                    promisesSuit.push(p);
                }
                $q.all(promisesSuit).then(function () {
                    $rootScope.$emit('TestSuitDeleted', data.testSuits);
                });
            }
        }

        function caseTeam() {
            $rootScope.hardSync();
        }

        function clearAllData() {
            EnvService.clear();
            DesignerServ.clear();
            lMenuService.clear();
            iDB.clear('unsynced');
        }

        function authExpired() {

        }
        return service;
    }

    ngSockJs.$inject = ['$q', '$timeout', '$rootScope', 'iDB', 'apicURLS'];
    function ngSockJs($q, $timeout, $rootScope, iDB, apicURLS) {
        var self = this;
        self.opIds = {};
        self.status = 'DISCONNECTED';
        self.q = [];
        self.current;
        self.reqTimeout;
        this.connect = function (headers) {
            if (headers) {
                self.headers = headers;
            }
            $timeout.cancel(self.reconnectTimer);
            var def = $q.defer();
            delete self.stomp;
            var socket = new SockJS(apicURLS.base + 'gs-guide-websocket');
            //var socket = new SockJS('http://localhost:8080/api/gs-guide-websocket');
            self.stomp = Stomp.over(socket);
            self.stomp.debug = null;
            self.stomp.connect(self.headers, function (frame) {
                self.stomp.subscribe('/user/queue/reply', function (data) {
                    onMessage(data);
                });
                self.status = 'CONNECTED';
                angular.element('#avatar').removeClass('offline syncing').addClass('online');
                angular.element('#offline-db.offline-db').hide();
                angular.element('#signedOut').hide();
                $timeout.cancel(self.reconnectTimer);
                $rootScope.onSocketConnected();
                def.resolve(frame);
            }, function (err) {
                self.status = 'DISCONNECTED';
                angular.element('#avatar').removeClass('online syncing').addClass('offline');
                onError(err);
                def.resolve(err);
            });
            return def.promise;
        };

        this.send = function (data) {
            if (self.status === 'CONNECTED' && self.stomp) {
                if (!self.current) {
                    self.current = data.opId;
                    console.log('sending' + data.opId, data.command);
                    var strData = JSON.stringify(data);
                    //key starting with $ not supported
                    strData = strData.replace(new RegExp('"\\$ref":', 'g'), '"###ref###":').replace(new RegExp('"\\$', 'g'), '"###dlr###');
                    self.stomp.send('/app/execute', {}, strData);
                    $timeout.cancel(self.reqTimeout);
                    self.reqTimeout = $timeout(function () {
                        delete self.current;
                        if (self.q.length > 0) {
                            self.send(self.q[0]);
                            self.q.splice(0, 1);
                        }
                    }, 5000);
                } else {
                    self.q.push(data);
                }

            } else if ($rootScope.userData) {//user is logged in but not connected
                //save in unsynced db if not already saved
                if (data.opId.indexOf('unsynced-') < 0) {
                    var unsynced = formatUnsynced(data);
                    if (unsynced) {
                        iDB.insert('unsynced', unsynced);
                    }
                }
            }
        };
        this.disconnect = function () {
            var dfd = $q.defer();
            if (self.stomp !== null) {
                self.stomp.disconnect(dfd.resolve);
            }
            self.status = 'DISCONNECTED';
            angular.element('#avatar').removeClass('online syncing').removeClass('offline');
            angular.element('#signedOut').hide();
            $timeout.cancel(self.reconnectTimer);
            return dfd.promise;
        };
        this.reconnect = function (headers) {
            try {
                self.disconnect().then(function () {
                    self.connect(headers || self.headers);
                })
            } catch (e) {
                self.connect(headers || self.headers);
            }
        }

        var onMessage = function (data) {
            var body = data.body;
            body = body.replace(new RegExp('"###ref###":', 'g'), '"$ref":').replace(new RegExp('"###dlr###', 'g'), '"$');
            try {
                body = JSON.parse(body);
                if (self.current === body.opId) {
                    $timeout.cancel(self.reqTimeout);
                    delete self.current;
                }
                if (self.q.length > 0) {
                    self.send(self.q[0]);
                    self.q.splice(0, 1);
                }

                if (!self.opIds[body.opId] /*&& !body.own*/) {//request not made by me, so execute as own is not set to true
                    $rootScope.onSocketInbound(body);
                } else {//request was made by me, 
                    if (body.own) {//check if its for own
                        $rootScope.onSocketInbound(body);
                        var operation = self.opIds[body.opId];
                        if (operation === 'fetchAll') {
                            if (angular.element('#avatar').hasClass('syncing')) {
                                angular.element('#avatar').removeClass('syncing').addClass('online');
                            }
                            if (body.since) { //if operation was fetch all, update last synced time
                                console.log('setting last synced', new Date(body.since).toLocaleString());
                                iDB.upsert('setting', {
                                    _id: 'lastSynced',
                                    time: body.since
                                });
                            }
                        }
                        delete self.opIds[body.opId];
                    } else if (!body.intrim) {//check if its an intrim result, if intrim-> ignore (meant for others as own is false), if not->clear opId
                        delete self.opIds[body.opId];
                    }
                    //check if its a reply for unsynced, then delete it from unsynced table
                    if (body.opId.indexOf('unsynced-') >= 0) {
                        iDB.delete('unsynced', body.opId);
                        console.log('removing unsynced', body.opId);
                    }
                }
            } catch (e) {
                console.log(e);
            }
        };

        var onError = function (error) {
            if (error.body === 'Access denied') {
                angular.element('#signedOut').show();
                return;
            }
            angular.element('#offline-db.offline-db').show();
            $timeout.cancel(self.reconnectTimer);
            self.reconnectTimer = $timeout(function () {
                console.log('Trying to connect');
                self.connect();
            }, 5000);
        };

        function formatUnsynced(data) {
            var commandsToSave = ['addEnv', 'updateEnv', 'deleteEnv', 'addAPIProject', 'updateAPIProject', 'deleteAPIProject', 'deleteAPIReq', 'updateAPIReq', 'addAPIReq', 'addFolder', 'updateFolder', 'deleteFolder', 'deleteTestProj', 'updateTestProj', 'addTestProj', 'addTestSuit', 'updateTestSuit', 'deleteTestSuit'];
            if (commandsToSave.indexOf(data.command) >= 0) {
                var entry = {
                    _id: 'unsynced-' + s12() + '-' + s12(),
                    data: data,
                    time: new Date().getTime()
                };
                return entry;
            }
        }
        return this;
    }

    leftMenu.$inject = ['iDB', '$indexedDB', '$q', 'SyncIt', '$rootScope'];
    function leftMenu(iDB, $indexedDB, $q, SyncIt, $rootScope) {
        var service = {
            validateAndCreateFolder: validateAndCreateFolder,
            getFolderTree: getFolderTree,
            getAllFolders: getAllFolders,
            upsertFolders: upsertFolders,
            getSavedReqs: getSavedReqs,
            createFolders: createFolders,
            updateFolder: updateFolder,
            deleteFolder: deleteFolder,
            upsertReq: upsertReq,
            deleteReq: deleteReq,
            getAllProj: getAllProj,
            createProj: createProj,
            updateProj: updateProj,
            deleteProj: deleteProj,
            getAllSuits: getAllSuits,
            createSuit: createSuit,
            updateSuit: updateSuit,
            deleteSuit: deleteSuit,
            clear: clear
        };


        //folder.name, folder.desc, folder.parentId
        function validateAndCreateFolder(folder) {
            var defer = $q.defer();
            var allow = true;
            $indexedDB.openStore('folders', function (folders) {
                var find = folders.query();
                find = find.$eq(folder.name);
                find = find.$index('name');

                folders.eachWhere(find).then(function (exists) {
                    for (var i = 0; i < exists.length; i++) {
                        if (exists[i].parentId === folder.parentId) {
                            allow = false;
                            break;
                        }
                    }
                    if (allow) {
                        /*var time = new Date().getTime();
                         var newFolder = {
                         _id: folder._id ? folder._id : time + '-' + s12(),
                         _created: folder._created ? folder._created : time,
                         _modified: folder._modified ? folder._modified : time,
                         name: folder.name,
                         desc: folder.desc,
                         parentId: folder.parentId
                         };
                         if (folder.projId) {
                         newFolder.projId = folder.projId;
                         }*/


                        createFolders([folder]).then(function (createdFolders) {
                            defer.resolve(createdFolders[0]);
                        }, function (err) {
                            defer.reject(err);
                        });
                    } else {
                        defer.reject('Folder already exists.');
                    }
                });
            });
            return defer.promise;
        }

        //folder.name, folder.desc, folder.parentId
        function createFolders(folders, fromSync) {
            var time = new Date().getTime();
            for (var i = 0; i < folders.length; i++) {
                var folder = folders[i];
                if ($rootScope.userData && $rootScope.userData.UID) {
                    folder.owner = $rootScope.userData.UID;
                } else {
                    delete folder.owner;
                }
                folder._id = folder._id ? folder._id : time + '-' + s12();
                folder._created = folder._created ? folder._created : time;
                folder._modified = folder._modified ? folder._modified : time;
            }
            return iDB.insert('folders', folders).then(function (data) {
                if (data[0] && $rootScope.userData && !fromSync) {//added successfully
                    SyncIt.prepareAndSync('addFolder', folders);
                }
                return folders;
            }, function () {
                return 'Failed to create folder.';
            });
        }

        function upsertFolders(folders, fromSync) {
            return iDB.upsert('folders', folders).then(function (data) {
                if (data[0] && $rootScope.userData && !fromSync) {//added successfully
                    SyncIt.prepareAndSync('updateFolder', folders);
                }
                return data;
            });
        }

        function updateFolder(folder, fromSync) {
            delete folder.edit;
            return iDB.upsert('folders', folder).then(function (data) {
                if (data[0] && $rootScope.userData && !fromSync) {//added successfully
                    var foldersToSync = apic.removeDemoItems(folder);
                    if (foldersToSync.length > 0) {
                        SyncIt.prepareAndSync('updateFolder', foldersToSync);
                    }
                }
                return data;
            });
        }

        function deleteFolder(folderId, fromSync) {
            return iDB.delete('folders', folderId).then(function (data) {
                if (!fromSync) {
                    SyncIt.prepareAndSync('deleteFolder', folderId);
                }
                return data;
            });
        }

        function getFolderTree() {
            var reqMap = {}, // map of requests based on the parent id
                AllReqs = {}, defer = $q.defer();
            getSavedReqs().then(function (savedReqs) {
                for (var i = 0; i < savedReqs.length; i++) {
                    var req = savedReqs[i];
                    AllReqs[req._id] = req;
                    if (req._parent) {
                        if (reqMap[req._parent]) {
                            reqMap[req._parent].push(req);
                        } else {
                            reqMap[req._parent] = [req];
                        }
                    }
                }
                //read folders
                getAllFolders().then(function (data) {
                    var folderTree = [];
                    var folderMap = {};
                    for (var i = 0; i < data.length; i++) {
                        data[i].children = [];
                        folderMap[data[i]._id] = data[i];
                    }
                    angular.forEach(data, function (folder) {
                        folder.requests = reqMap[folder._id];
                        //folderMap[folder._id] = folder;
                        if (!folder.parentId) {
                            folderTree.push(folder);
                        } else {
                            var parentNode = folderMap[folder.parentId];
                            parentNode.children.push(folder);
                        }
                    });
                    defer.resolve({ tree: folderTree, reqs: AllReqs });
                }, function () {
                    defer.reject('Failed to read folders.');
                });

            });
            return defer.promise;
        }

        function getAllFolders() {
            return iDB.readSorted('folders', '_created', 'asc');
        }

        function getSavedReqs() {
            return iDB.readSorted('savedRequests', '_time', 'desc');
        }

        function upsertReq(reqs, fromSync, update) {
            return iDB.upsert('savedRequests', reqs).then(function (data) {
                if (data[0] && $rootScope.userData && !fromSync) {//added successfully
                    var reqToSync = apic.removeDemoItems(reqs);
                    if (update) {
                        SyncIt.prepareAndSync('updateAPIReq', reqToSync);
                    } else {
                        SyncIt.prepareAndSync('addAPIReq', reqToSync);
                    }
                }
                return data;
            });
        }

        function deleteReq(reqId, fromSync) {
            return iDB.delete('savedRequests', reqId).then(function (data) {
                if (!fromSync) {
                    SyncIt.prepareAndSync('deleteAPIReq', reqId);
                }
                return data;
            });
        }

        function getAllProj() {
            return iDB.read('Projects');
        }

        function createProj(project, fromSync) {
            var time = new Date().getTime();
            if (!project._id) {
                project._id = time + '-' + s12();
            }
            if (!project._created) {
                project._created = time;
            }
            if (!project._modified) {
                project._modified = time;
            }
            if ($rootScope.userData && $rootScope.userData.UID) {
                project.owner = $rootScope.userData.UID;
            } else {
                delete project.owner;
            }

            return iDB.insert('Projects', project).then(function (data) {
                if (data && $rootScope.userData && !fromSync) {//added successfully
                    SyncIt.prepareAndSync('addTestProj', project);
                }
                return data;
            });
        }

        function updateProj(project, fromSync) {
            return iDB.upsert('Projects', project).then(function (data) {
                if (data[0] && $rootScope.userData && !fromSync) {//added successfully
                    var projsToSync = apic.removeDemoItems(project);
                    if (projsToSync.length > 0) {
                        SyncIt.prepareAndSync('updateTestProj', projsToSync);
                    }
                }
                return data;
            });
        }

        function deleteProj(projId, fromSync) {
            return iDB.delete('Projects', projId).then(function (data) {
                if (!fromSync) {
                    SyncIt.prepareAndSync('deleteTestProj', projId);
                }
                return data;
            });
        }

        function getAllSuits() {
            return iDB.read('TestSuits');
        }

        function createSuit(suit, fromSync) {
            var time = new Date().getTime();
            if (!suit._id) {
                suit._id = time + '-' + s12();
            }
            if (!suit._created) {
                suit._created = time;
            }
            if (!suit._modified) {
                suit._modified = time;
            }
            if (!suit.reqs) {
                suit.reqs = [];
            }
            if ($rootScope.userData && $rootScope.userData.UID) {
                suit.owner = $rootScope.userData.UID;
            } else {
                delete suit.owner;
            }
            return iDB.insert('TestSuits', suit).then(function (data) {
                if (data && $rootScope.userData && !fromSync) {//added successfully
                    SyncIt.prepareAndSync('addTestSuit', suit);
                }
                return data;
            });
        }

        function updateSuit(suit, fromSync) {
            return iDB.upsert('TestSuits', suit).then(function (data) {
                if (data[0] && $rootScope.userData && !fromSync) {//added successfully
                    var suitsToSync = apic.removeDemoItems(suit);
                    if (suitsToSync.length > 0) {
                        SyncIt.prepareAndSync('updateTestSuit', suitsToSync);
                    }
                }
                return data;
            });
        }

        function deleteSuit(suitId, fromSync) {
            return iDB.delete('TestSuits', suitId).then(function (data) {
                if (!fromSync) {
                    SyncIt.prepareAndSync('deleteTestSuit', suitId);
                }
                return data;
            });
        }

        function clear() {
            iDB.clear('TestSuits');
            iDB.clear('Projects');
            iDB.clear('savedRequests');
            iDB.clear('folders');
            iDB.clear('folders');
            iDB.clear('history');

        }

        return service;
    }

    EnvService.$inject = ['iDB', '$rootScope', 'SyncIt'];
    function EnvService(iDB, $rootScope, SyncIt) {
        var service = {
            addEnv: addEnv,
            updateEnv: updateEnv,
            getAllEnvs: getAllEnvs,
            deleteEnv: deleteEnv,
            clear: clear,
            canDelete: canDelete
        };

        function addEnv(newEnv, fromSync) {
            return iDB.insert('Environments', newEnv).then(function (data) {
                if (data[0] && $rootScope.userData && !fromSync) {//added successfully
                    SyncIt.prepareAndSync('addEnv', newEnv);
                }
                if (!$rootScope.ENVS) $rootScope.ENVS = [];
                $rootScope.ENVS.push(newEnv);
                return data;
            });
        }

        function updateEnv(env, fromSync) {
            if (!(env instanceof Array)) env = [env]
            return iDB.upsert('Environments', env).then(function (data) {
                if (data && data.length > 0 && !fromSync) {
                    var envsToSync = apic.removeDemoItems(env);
                    if (envsToSync.length > 0) {
                        SyncIt.prepareAndSync('updateEnv', envsToSync);
                    }
                }
                for (var j = 0; j < env.length; j++) {
                    var e = env[j];
                    for (var i = 0; i < $rootScope.ENVS.length; i++) {
                        if ($rootScope.ENVS[i]._id === e._id) {
                            $rootScope.ENVS[i] = e;
                            break;
                        }
                    }
                }

                $rootScope.$emit('envUpdated');
                return data;
            });
        }

        function deleteEnv(envId, fromSync) {
            return iDB.delete('Environments', envId).then(function (data) {
                if (!fromSync) {
                    SyncIt.prepareAndSync('deleteEnv', envId);
                }
                if ($rootScope.ENVS) {
                    for (var i = 0; i < $rootScope.ENVS.length; i++) {
                        if ($rootScope.ENVS[i]._id === envId) {
                            $rootScope.ENVS.splice(i, 1);
                        }
                    }
                }
                return data;
            });
        }

        function clear() {
            return iDB.clear('Environments').then(function () {
                $rootScope.ENVS = [];
            });
        }

        function getAllEnvs() {
            return iDB.readSorted('Environments', 'name', 'asc').then(function (envs) {
                $rootScope.ENVS = envs;
                return envs;
            });
        }

        function canDelete(envId) {
            return iDB.findByKey('Environments', '_id', envId).then(function (env) {
                if (!env) return false;
                if (env.proj) {
                    return iDB.findByKey('ApiProjects', '_id', env.proj.id).then(function (data) {
                        if (data) return false;
                        return true;
                    });
                }
                return true;
            })
        }

        return service;
    }

    DesignerServ.$inject = ['SyncIt', 'iDB', 'apicURLS', '$http', 'JsonSchema', '$rootScope', '$q'];
    function DesignerServ(SyncIt, iDB, apicURLS, $http, JsonSchema, $rootScope, $q) {
        var service = {
            addProject: addProject,
            getApiProjs: getApiProjs,
            updateAPIProjects: updateAPIProjects,
            deleteAPIProject: deleteAPIProject,
            getAPIProjectById: getAPIProjectById,
            clear: clear,
            enableMock: enableMock,
            disableMock: disableMock,
            formatEndpForRun: formatEndpForRun,
            importTraitData: importTraitData,
            updateEndp: updateEndp,
            getTraitNamedResponses: getTraitNamedResponses,
            getTraitNamedResponsesObj: getTraitNamedResponsesObj
        };

        function addProject(proj, fromSync) {
            var ts = new Date().getTime();
            if (!proj._id) {
                proj._id = ts + '-' + s12();
            }
            if (!proj._created) {
                proj._created = ts;
            }
            if (!proj._modified) {
                proj._modified = ts;
            }
            if ($rootScope.userData && $rootScope.userData.UID) {
                proj.owner = $rootScope.userData.UID;
            } else {
                delete proj.owner;
            }
            return iDB.insert('ApiProjects', proj).then(function (data) {
                if (!fromSync) {
                    SyncIt.prepareAndSync('addAPIProject', proj);
                }
                $rootScope.$emit('refreshProjectReqs', { type: 'add', projId: proj._id });
                return data;
            });
        }

        function getApiProjs() {
            return iDB.read('ApiProjects').then(function (data) {
                return data;
            });
        }

        function updateAPIProjects(projects, fromSync, preventLeftmenuUpdate) {
            return iDB.upsert('ApiProjects', projects).then(function (data) {
                if (data && data.length > 0 && !fromSync) {
                    var projsToSync = apic.removeDemoItems(projects);
                    if (projsToSync.length > 0) {
                        SyncIt.prepareAndSync('updateAPIProject', projsToSync);
                    }
                }
                if (!preventLeftmenuUpdate) {
                    if (projects._id) {
                        $rootScope.$emit('refreshProjectReqs', { type: 'update', projId: projects._id });
                    } else {
                        $rootScope.$emit('refreshProjectReqs');
                    }
                } else {
                    $rootScope.$emit('ApiProjChanged');
                }
                return data;
            });
        }

        function deleteAPIProject(id, fromSync) {
            return iDB.delete('ApiProjects', id).then(function (data) {
                if (!fromSync) {
                    SyncIt.prepareAndSync('deleteAPIProject', id);
                }
                $rootScope.$emit('refreshProjectReqs', { type: 'delete', projId: id });
                return data;
            });
        }

        function getAPIProjectById(id) {
            return iDB.findByKey('ApiProjects', '_id', id).then(function (data) {
                return data;
            });
        }

        function clear() {
            return iDB.clear('ApiProjects');
        }

        function enableMock(projId) {
            var getReq = {
                method: 'GET',
                url: apicURLS.enableMock + projId
            };

            return $http(getReq).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function disableMock(projId) {
            var getReq = {
                method: 'GET',
                url: apicURLS.disableMock + projId
            };

            return $http(getReq).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function formatEndpForRun(rawEndp, project) {
            var endp = angular.copy(rawEndp);
            var endpBody = {
                type: 'raw',
                rawData: '',
                formData: [{ key: '', type: 'string' }],
                xformData: [{ key: '', type: 'string' }]
            };

            endp.headers = JsonSchema.schema2obj(endp.headers, undefined, undefined, true, project.models);
            endp.queryParams = JsonSchema.schema2obj(endp.queryParams, undefined, undefined, true, project.models);
            endp.pathParams = JsonSchema.schema2obj(endp.pathParams, undefined, undefined, true, project.models);

            for (var i = 0; i < endp.responses.length; i++) {
                endp.responses[i].data = JsonSchema.schema2obj(endp.responses[i].data, undefined, undefined, true, project.models);
            }

            //load body params
            if (endp.body) {
                endpBody.type = endp.body.type;
                switch (endp.body.type) {
                    case 'raw':
                        endpBody.rawData = JsonSchema.schema2obj(endp.body.data, undefined, undefined, true, project.models);
                        break;
                    case 'form-data':
                        endpBody.formData = angular.copy(endp.body.data);
                        break;
                    case 'x-www-form-urlencoded':
                        endpBody.xformData = angular.copy(endp.body.data);
                        break;
                }
            }

            if (endp.traits) {
                for (var i = 0; i < rawEndp.traits.length; i++) {
                    importTraitData(rawEndp.traits[i]._id, rawEndp.traits[i].name, endp, project);
                }
            }
            return endp;
        }

        function importTraitData(traitId, name, endp, project) {
            var traitData = {
                responses: [],
            };
            if (!traitId)
                return;
            var trait = project.traits[traitId];

            //add responses from trait
            for (var i = 0; i < trait.responses.length; i++) {
                var resp = angular.copy(trait.responses[i]);
                if (!resp.noneStatus) {
                    resp.data = JsonSchema.schema2obj(resp.data, undefined, undefined, true, project.models);
                    resp.fromTrait = true;
                    resp.traitId = traitId;
                    resp.traitName = name;
                    endp.responses.push(resp);
                }
            }

            //add query params from trait
            var traitPparams = JsonSchema.schema2obj(trait.pathParams, undefined, undefined, undefined, project.models);
            for (var i = 0; i < traitPparams._properties.length; i++) {
                var qProp = traitPparams._properties[i];
                qProp.disabled = true;
                endp.pathParams._properties.push(qProp);
            }

            //add query params from trait
            var traitQparams = JsonSchema.schema2obj(trait.queryParams, undefined, undefined, undefined, project.models);
            for (var i = 0; i < traitQparams._properties.length; i++) {
                var qProp = traitQparams._properties[i];
                qProp.disabled = true;
                endp.queryParams._properties.push(qProp);
            }

            //add headers from trait
            var traitHeaders = JsonSchema.schema2obj(trait.headers, undefined, undefined, undefined, project.models);
            for (var i = 0; i < traitHeaders._properties.length; i++) {
                var hProp = traitHeaders._properties[i];
                hProp.disabled = true;
                endp.headers._properties.push(hProp);
            }
        }

        function updateEndp(projId, endpId, delta) {
            var dfr = $q.defer();
            getAPIProjectById(projId).then(function (project) {
                if (project && project.endpoints) {
                    var endp = project.endpoints[endpId];
                    if (endp) {
                        endp = angular.extend(endp, delta);
                        project.endpoints[endpId] = endp;
                        project._modified = Date.now();
                        updateAPIProjects(project, null, true).then(function () {
                            dfr.resolve();
                        });
                    } else {
                        console.error('Endpoint doesn\'t exist');
                        dfr.reject();
                    }
                } else {
                    console.error('Project doesn\'t exist');
                    dfr.reject();
                }
            });
            return dfr.promise;
        }

        function getTraitNamedResponses(proj) {
            var traitsModel = [];
            if (proj.traits) {
                angular.forEach(proj.traits, function (trait) {
                    trait.responses && trait.responses.forEach(function (resp) {
                        if (resp.noneStatus) {
                            traitsModel.push({
                                name: resp.code,
                                data: resp.data
                            })
                        }
                    });
                })
            }
            return traitsModel;
        }

        function getTraitNamedResponsesObj(proj) {
            var traitsModel = getTraitNamedResponses(proj);
            var obj = {};
            traitsModel.forEach(function (resp) {
                obj[resp.name] = resp.data;
            });
            return obj
        }

        function responseCB(resp) {
            if (resp && resp.data) {
                return resp.data;
            } else {
                return undefined;
            }
        }
        return service;
    }

    TeamService.$inject = ['$http', 'apicURLS'];
    function TeamService($http, apicURLS) {
        var service = {
            create: createTeam,
            update: updateTeam,
            getList: getTeamsList,
            delete: deleteTeam,
            addMember: addTeamMember,
            getMembers: getTeamMembers,
            deleteMember: deleteMember,
            getMembersOf: getMembersOf,
            exit: exitTeam,
            invite: invite
        };

        function createTeam(teamName) {
            var postReq = {
                method: 'POST',
                url: apicURLS.team,
                data: {
                    name: teamName
                }
            };
            return $http(postReq).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function updateTeam(team) {
            var putReq = {
                method: 'PUT',
                url: apicURLS.team + '/' + team.id,
                data: {
                    id: team.id,
                    name: team.name,
                    modified: new Date().getTime()
                }
            };
            return $http(putReq).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function getTeamsList(summary) {
            var getReq = {
                method: 'GET',
                url: apicURLS.team
            };
            if (summary === true) {
                getReq.params = {
                    summary: true
                };
            }
            return $http(getReq).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function deleteTeam(teamId) {
            return $http.delete(apicURLS.team + '/' + teamId).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function addTeamMember(teamId, newMember) {
            var postReq = {
                method: 'POST',
                url: apicURLS.teamMember.replace('{%teamId%}', teamId),
                data: newMember
            };
            return $http(postReq).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function getTeamMembers(teamId) {
            return $http.get(apicURLS.teamMember.replace('{%teamId%}', teamId)).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function deleteMember(teamId, memberId) {
            return $http.delete(apicURLS.teamMember.replace('{%teamId%}', teamId) + memberId).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function getMembersOf(user) {
            return $http.get(apicURLS.teamMemberOf + user).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function exitTeam(teamId) {
            return $http.delete(apicURLS.teamExit.replace('{%teamId%}', teamId)).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function invite(emails) {
            var postReq = {
                method: 'POST',
                url: apicURLS.teamInvite,
                data: emails
            };
            return $http(postReq).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function responseCB(resp) {
            if (resp && resp.data) {
                return resp.data;
            } else {
                return undefined;
            }
        }

        return service;
    }


    ShareIt.$inject = ['$http', 'apicURLS'];
    function ShareIt($http, apicURLS) {
        var service = {
            share: share,
            unshare: unshare
        };

        function share(teamId, objId, type) {
            var postReq = {
                method: 'POST',
                url: apicURLS.share,
                data: {
                    teamId: teamId,
                    //objId: objId,
                    type: type
                }
            };
            if (typeof objId === 'string') {
                postReq.data.objId = objId;
            } else {
                postReq.data.objIds = objId;
            }
            return $http(postReq).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function unshare(teamId, objId, type) {
            var postReq = {
                method: 'POST',
                url: apicURLS.unshare,
                data: {
                    teamId: teamId,
                    type: type
                }
            };
            if (typeof objId === 'string') {
                postReq.data.objId = objId;
            } else {
                postReq.data.objIds = objId;
            }
            return $http(postReq).then(function (resp) {
                return responseCB(resp);
            }, function (resp) {
                return responseCB(resp);
            });
        }

        function responseCB(resp) {
            if (resp && resp.data) {
                return resp.data;
            } else {
                return undefined;
            }
        }
        return service;
    }
})();