/* global angular, APP */

(function () {
    'use strict';
    angular.module('app.home')
        .controller('rootController', rootController)
        .run(run);

    rootController.$inject = ['$scope', '$uibModal', '$rootScope', 'iDB', '$timeout', '$interpolate', 'Utils', 'toastr', 'HttpService', 'FileSystem', 'apicURLS', 'User', 'ngSockJs', 'DataService', 'SyncIt', 'ShareIt', 'TeamService', '$state'];
    function rootController($scope, $uibModal, $rootScope, iDB, $timeout, $interpolate, Utils, toastr, HttpService, FileSystem, apicURLS, User, ngSockJs, DataService, SyncIt, ShareIt, TeamService, $state) {
        $scope.openEnvModal = openEnvModal;
        $scope.openSettingsModal = openSettingsModal;
        $rootScope.openLoginModal = openLoginModal;
        $scope.openUpdateFoundModal = openUpdateFoundModal;
        $scope.openLogoutModal = openLogoutModal;
        $scope.selectEnv = selectEnv;
        $scope.openEnvDD = openEnvDD;
        $scope.switchTheme = switchTheme;
        $scope.saveWorkspace = saveWorkspace;

        $rootScope.getKeys = getKeys;
        $rootScope.logout = logout;
        $rootScope.getSelectedEnv = getSelectedEnv;
        $rootScope.openUpdatedModal = openUpdatedModal;
        $rootScope.closeEnvModal = closeEnvModal;
        $rootScope.closeSettingsModal = closeSettingsModal;
        $rootScope.closeLoginModal = closeLoginModal;
        $rootScope.closeUpdateFoundModal = closeUpdateFoundModal;
        $rootScope.closeUpdatedModal = closeUpdatedModal;
        $scope.closeLogoutModal = closeLogoutModal;
        $rootScope.openIntroModal = openIntroModal;
        $rootScope.closeIntroModal = closeIntroModal;
        $rootScope.openFeatureModal = openFeatureModal;
        $rootScope.closeFeatureModal = closeFeatureModal;
        $rootScope.requestFeature = requestFeature;
        $rootScope.getAllEnv = getAllEnv;
        $rootScope.focus = focus;
        $rootScope.interpolate = interpolate;
        $rootScope.copyToClipboard = copyToClipboard;
        $rootScope.copyKV = copyKV;
        $rootScope.pasteKV = pasteKV;
        $rootScope.download = download;
        $scope.checkForUpdate = checkForUpdate;
        $rootScope.downloadUpdate = downloadUpdate;
        $rootScope.restart = restart;
        $rootScope.openDevTools = openDevTools;
        $rootScope.winMinimize = winMinimize;
        $rootScope.winMaximize = winMaximize;
        $rootScope.winClose = winClose;
        $rootScope.onSocketInbound = onSocketInbound;
        $rootScope.onSocketConnected = onSocketConnected;
        $rootScope.reconnect = reconnect;
        $rootScope.checkLogin = checkLogin;
        $rootScope.checkOwner = checkOwner;
        //team sharing
        $rootScope.openShareModal = openShare;
        $rootScope.closeShare = closeShare;
        $scope.share = share;
        $rootScope.unshare = unshare;
        $rootScope.hardSync = hardSync;
        $rootScope.formatJSON = formatJSON;

        if (!$rootScope.ENVS) {
            $rootScope.ENVS = [];
        }
        $scope.updateModal = {
            newVer: '',
            downloading: false
        };
        $scope.logoutModal = {
            logoutAll: false
        };
        $scope.fReqModel = {
            email: '',
            message: ''
        };
        $scope.tmSelector = {};
        $scope.curEnv = {
            name: 'No Environment'
        };
        $scope.selectedTheme = {};
        $scope.fsInputCfg = {
            type: 'text',
            model: '',
            show: false
        }

        window.addEventListener('message', function (event) {
            $rootScope.$emit('messageReceived', event);
        }, false);

        init();

        function init() {
            getAllEnv();
            setAppInfo();
            menuOpened();

            Utils.storage.get(['themeAccent', 'themeType']).then(function (data) {
                $scope.selectedTheme.themeAccent = data.themeAccent || '#2196f3';
                $scope.selectedTheme.themeType = data.themeType || 'light';
            });
        }

        function setAppInfo() {
            $rootScope.appInfo = {
                version: APP.VERSION,
                platform: APP.PLATFORM,
                type: APP.TYPE
            };
        }

        function openEnvModal() {
            $scope.envModalInstance = $uibModal.open({
                animation: false,
                backdrop: 'static',
                keyboard: false,
                //windowClass: 'full-screen',
                templateUrl: 'modules/environments/env-modal.html',
                controller: 'envController as vm',
                size: 'lg'
            });
        }
        function closeEnvModal() {
            $scope.envModalInstance.close('close');
        }

        function openSettingsModal() {
            $scope.settingsModalInstance = $uibModal.open({
                animation: false,
                scope: $scope,
                templateUrl: 'modules/settings/settings-modal.html',
                controller: 'settingsController as vm',
                size: 'lg'
            });
        }

        function closeSettingsModal() {
            $scope.settingsModalInstance.close('close');
        }

        function openLoginModal(window) {
            window = window ? ' ' + window : '';
            $scope.loginModalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'modules/login/login-modal.html',
                windowClass: 'full-screen login-modal-window' + window,
                controller: 'loginController as vm'
            });
        }

        function closeLoginModal() {
            $scope.loginModalInstance.close('close');
        }

        function openUpdateFoundModal() {
            $scope.updateModal.downloading = false;
            $scope.updateModalInstance = $uibModal.open({
                animation: true,
                scope: $scope,
                backdrop: 'static',
                templateUrl: 'modules/home/updateFound.html'
            });
        }

        function closeUpdateFoundModal() {
            $scope.updateModalInstance.close('close');
        }

        function openUpdatedModal() {
            $scope.updateModalInstance = $uibModal.open({
                animation: true,
                scope: $scope,
                backdrop: 'static',
                templateUrl: 'modules/home/updateDownloaded.html'
            });
        }

        function closeUpdatedModal() {
            $scope.updateModalInstance.close('close');
        }

        function openLogoutModal() {
            $scope.logoutModal.logoutAll = false;
            $scope.logoutModalInstance = $uibModal.open({
                animation: true,
                scope: $scope,
                backdrop: 'static',
                templateUrl: 'modules/home/logout.html'
            });
        }

        function selectEnv(env) {

            if (env) {
                $scope.curEnv.name = env.name;
                $scope.curEnv._id = env._id;
                $scope.curEnv.vals = Utils.processEnv(env.vals);
                Utils.storage.set({ lastSelectedEnv: env._id });
            } else {
                $scope.curEnv.name = 'No Environment';
                $scope.curEnv._id = undefined;
                $scope.curEnv.vals = undefined;
                Utils.storage.remove('lastSelectedEnv');
            }
        }

        function openEnvDD($event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.curEnv.open = !$scope.curEnv.open
        }

        function getSelectedEnv() {
            return $scope.curEnv;
        }

        var envUpdatedListener = $rootScope.$on('envUpdated', function () {
            if ($scope.curEnv && $scope.curEnv._id && $rootScope.ENVS) {
                for (var i = 0; i < $rootScope.ENVS.length; i++) {
                    if ($rootScope.ENVS[i]._id === $scope.curEnv._id) {
                        $scope.curEnv.vals = Utils.processEnv($rootScope.ENVS[i].vals);
                        break;
                    }
                }
            }
        });


        function closeLogoutModal() {
            if ($scope.logoutModalInstance) {
                $scope.logoutModalInstance.close('close');
            }
        }

        function logout() {
            if ($scope.logoutModal.logoutAll) {
                User.logout().then(function (resp) {
                    if (resp.status === 'ok') {
                        toastr.info('Logged out from all other APIC instances.');
                    } else {
                        toastr.error('Failed to logout from all other instances. Please tray again later.');
                    }
                }, function () {
                    toastr.error('Failed to logout from all other instances.');
                });
            }
            Utils.storage.remove(['UID', 'authToken', 'name', 'email', 'id', 'verified', 'firstRun']).then(function () {
                delete $rootScope.userData;
                ngSockJs.disconnect();
                toastr.info('Logged out from APIC.');
            }, function () {
                toastr.error('Failed to logged out from this instance.');
            });
            closeLogoutModal();
            DataService.clearAllData();
            User.doFirstRun().then(function () {
                $rootScope.$emit('ApiProjChanged');
                $rootScope.$emit('FoldersChanged');
                $rootScope.$emit('TestSuitUpdated');
                $rootScope.$emit('refreshProjectReqs');
                if ($state.includes('apic.dashboard')) {
                    $state.go('apic.designer');
                }
            });
        }

        function openIntroModal() {
            $scope.introModalInstance = $uibModal.open({
                animation: true,
                scope: $scope,
                templateUrl: 'modules/home/intro.html',
                windowClass: 'full-screen login-modal-window'
            });
            $timeout(function () {
                loadIntro();
            })
        }

        function switchTheme(themeType, themeAccent) {
            if (!themeType) themeType = $scope.selectedTheme.themeType;
            if (!themeAccent) themeAccent = $scope.selectedTheme.themeAccent;
            var root = document.documentElement;
            var themeData = $rootScope.Const.themes[themeType];
            angular.forEach(themeData, function (val, key) {
                root.style.setProperty(key, val);
            })
            root.style.setProperty('--accent-color', themeAccent || $rootScope.Const.themes.accents[0]);
            root.style.setProperty('--accent-shadow', (themeAccent || $rootScope.Const.themes.accents[0]) + '4d');
            document.querySelector('meta[name=theme-color]').setAttribute('content', themeData['--header-bg']);
            try {
                Utils.storage.set({ themeType: themeType, themeAccent: themeAccent }).then(function () {
                    console.log('Theme saved');
                    $scope.selectedTheme.themeAccent = themeAccent;
                    $scope.selectedTheme.themeType = themeType;
                });
            } catch (e) {
                localStorage.setItem('themeType', themeType);
                localStorage.setItem('themeAccent', themeAccent);
                $scope.selectedTheme.themeAccent = themeAccent;
                $scope.selectedTheme.themeType = themeType;
            }
        }

        function saveWorkspace(workspace) {
            $scope.module = workspace;
            Utils.storage.set('workspace', workspace)
        }

        function getKeys(obj) {
            if (obj)
                return Object.keys(obj);
        }

        function closeIntroModal() {
            unloadIntro();
            Utils.storage.get('firstRun').then(function (data) {
                if (!data || !data.firstRun) {
                    var intro = introJs();
                    intro.setOption('showBullets', false);
                    intro.setOptions({
                        steps: [
                            {
                                element: '#designer-ico',
                                intro: '<div class="bold">API Designer </div><div><ul><li>A simplistic yet a powerful platform to design your APIs by defining models, traits and endpoints</li><li>CRUD Builder to build your endpoints automatically</li><li>Auto generate requests for testing</li><li>Auto generate functional documentations</li></ul></div>'
                            },
                            {
                                element: '#tester-ico',
                                intro: '<div class="bold">API Tester </div><div><ul><li>Run and Test APIs</li><li>Test with JSON Schema and scripts</li><li>Write Test Cases and Suites</li><li>Generate Test Reports</li><li>Manage Test Environments</li></ul></div>'
                            },
                            {
                                element: '#docs-ico',
                                intro: '<div class="bold">API Docs </div><div><ul><li>Auto generate API Docs</li><li>Publish Docs online</li><li>Share with 3rd-party developers </li><li>Offline access</li></ul></div>'
                            },
                            {
                                element: '#dash-ico',
                                intro: '<div class="bold">And a Lot more...</div><div><ul><li>Team management and Sharing</li><li>Mocked API response</li><li>Random data generation</li><li>Import/Export Open API/Swagger specs</li></ul></div>'
                            },
                            {
                                element: '.avatar-cont',
                                intro: '<div class="bold">Free Cloud Storage</div><div" style="text-align:center; margin-top:20px;">Never loose your data by syncing them with our cloud.</br><div style="margin:20px;">Login/Register to enable cloud sync</div></div>'
                            }
                        ]
                    });
                    intro.start();
                }
            })
            $timeout(function () {
                Utils.storage.set('firstRun', true);
            })
            if ($scope.introModalInstance) {
                $scope.introModalInstance.close('close');
            }
        }

        function openFeatureModal() {
            $scope.featureModalInstance = $uibModal.open({
                animation: true,
                scope: $scope,
                templateUrl: 'modules/home/featureReq.html'
            });
        }
        function closeFeatureModal() {
            if ($scope.featureModalInstance) {
                $scope.featureModalInstance.close('close');
            }
        }

        function requestFeature(e) {
            console.log($scope.fReqModel);
            e.preventDefault();
            HttpService.create(apicURLS.featureRequest, $scope.fReqModel).then(function (data) {
                if (data && data.status === 'ok') {
                    toastr.success(data.desc);
                    closeFeatureModal();
                } else {
                    toastr.error('Failed ro request feature, please try again.');
                }
            }, function () {
                toastr.error('Failed ro request feature, please try again.');
            });
        }

        function getAllEnv() {
            return iDB.readSorted('Environments', 'name', 'asc').then(function (envs) {
                Utils.storage.get(['lastSelectedEnv']).then(function (data) {
                    if (data && data.lastSelectedEnv) {
                        selectEnv(envs.find(e => e._id === localStorage.lastSelectedEnv))
                    }
                });
                return envs;
            });
        }

        function focus(selector) {
            $timeout(function () {
                angular.element(selector).focus();
            });
        }

        //TODO: remove this. Its enhanced version is defined in Utils.interpolate;
        function interpolate(string, env) {
            var mergedEnv = angular.copy(env);
            var compiled = string;
            //if (env) {
            if ($rootScope.xtraEnv) {
                mergedEnv = angular.merge({}, mergedEnv, $rootScope.xtraEnv);
            }
            try {
                compiled = $interpolate(string)(mergedEnv);
            } catch (err) {
                compiled = 'Syntax Error!';
            }
            //}
            return compiled;
        }

        function copyToClipboard(text) {
            if (!text)
                return;
            var str = text;
            if (typeof text !== 'string') {
                str = text.toString();
            }
            Utils.copyToClipboard(str);
            toastr.success('Copied');
        }

        function copyKV(kvPair) {
            var copyText = {
                key: kvPair.key,
                val: kvPair.val,
                // type: 'apic-kv-clip'
            }
            copyToClipboard(JSON.stringify(copyText));
        }

        async function pasteKV(target) {
            var text = await navigator.clipboard.readText();
            var pair = JSON.parse(text);
            // if (pair.type === 'apic-kv-clip') {
            target.key = pair.key;
            target.val = pair.val;
            $scope.$apply();
            // }
        }

        function download(fileName, data) {
            if (typeof data !== 'string') {
                try {
                    data = JSON.stringify(data);
                } catch (e) {
                    toastr.error('Download failed. Invalid data.');
                }
            }
            FileSystem.download(fileName, data);
        }

        function checkForUpdate(manual) {
            var data = {
                noCache: Math.random(),
                oldVersion: APP.VERSION,
                platform: APP.PLATFORM
            };
            if (manual) {
                toastr.info('Checking for update.');
            }
            HttpService.get(apicURLS.checkUpdate, data).then(function (data) {
                if (data && data.desc === 'Update found.') {
                    $scope.updateModal.newVer = data.resp.version;
                    $scope.updateModal.changeLog = data.resp.changeLog;
                    openUpdateFoundModal();
                } else {
                    if (manual) {
                        toastr.info('You are already using the latest version of apic.');
                    }
                }
            }, function () {
                if (manual) {
                    toastr.error('Couldn\'t connect to update server. Please try again later.');
                }
            });
        }

        function menuOpened(open) {
            $(document).on('mouseenter', '.saved .dropdown', function () {
                var child = $(this).children('.dropdown-menu');
                $(child).css({
                    visibility: 'hidden',
                    display: 'block'
                });

                $(child).parent().removeClass('dropup');
                if ($(child).offset().top + $(child).outerHeight() > $(window).innerHeight() + $(window).scrollTop()) {
                    $(child).parent().addClass('dropup');
                }

                $(child).removeAttr('style');
            });
        }

        function downloadUpdate(newVer) {
            //openUpdateFoundModal(); $scope.updateModal.downloading = true;return ;
            $scope.updateModal.downloading = true;
            if (APP.TYPE === 'ELECTRON') {
                if (APP.PLATFORM.toLowerCase() === 'darwin') {
                    //macOS requires signed certificate for auto update to work, so for mac just download the dmg
                    if (APP.electron.shell) {
                        APP.electron.shell.openExternal('https://apic.app/download/apic-' + newVer + '.dmg');
                        $scope.updateModal.downloading = false;
                        toastr.info("Your download has been started..");
                        closeUpdateFoundModal();
                        return;
                    }
                } else {
                    APP.electron.sendMessage('check-for-update');
                }
            } else if (APP.TYPE === 'CHROME') {
                toastr.info('Chrome app updates are handled by Chrome internally.');
            } else {
                window.location.reload();
            }
        }

        function restart() {
            APP.electron.sendMessage('restart-apic');
        }

        function openDevTools() {
            APP.electron.sendMessage('open-devtools');
        }

        function winMinimize() {
            console.log(APP.electron.remote);
            window.electron.remote.BrowserWindow.getFocusedWindow().minimize();
        }
        function winMaximize() {
            var win = window.electron.remote.BrowserWindow.getFocusedWindow();
            if (!win.isMaximized()) {
                win.maximize();
            } else {
                win.unmaximize();
            }
        }
        function winClose() {
            window.electron.remote.BrowserWindow.getFocusedWindow().close();
        }

        //listen for socket incoming messages
        function onSocketInbound(data) {
            console.log('receoved', data);
            DataService.executeIncoming(data);
        }

        function reconnect(headers) {
            ngSockJs.reconnect(headers);
        }

        function onSocketConnected() {
            SyncIt.syncUnsynced();
            iDB.findByKey('setting', '_id', 'lastSynced').then(function (data) {
                var ts = 0;//new Date().getTime();
                if (data && data.time) {
                    ts = data.time;
                }
                DataService.getAllData().then(function (data) {
                    SyncIt.fetch('fetchAll', ts, data);
                });
            });
        }

        function checkLogin(e) {
            if (!$rootScope.userData || !$rootScope.userData.UID) {
                toastr.error('You need to be logged in to APIC to use this feature');
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                return false;
            }
            return true;
        }

        function checkOwner(uid, e) {
            if (uid && $rootScope.userData && $rootScope.userData.UID !== uid) {
                toastr.error('You don\'t have permission to perform this operation as you are not the owner.');
                e.preventDefault();
                e.stopPropagation();
            }
        }

        function getNotifications() {
            HttpService.get(apicURLS.notifications).then(function (data) {
                $rootScope.notifications = data.resp;
            }, function () {

            });
        }

        //team sharing
        function openShare(objId, type) {
            if (!checkLogin()) return;
            $scope.tmSelector.type = type;
            $scope.tmSelector.objId = objId;
            $scope.shareModalInstance = $uibModal.open({
                animation: true,
                scope: $scope,
                backdrop: 'static',
                templateUrl: 'modules/home/teamSelector.html'
            });
            $scope.tmSelector.loading = true;
            $timeout(function () {
                TeamService.getList(true).then(function (data) {
                    if (data && data.resp && data.resp.length) {
                        $rootScope.Teams = {};
                        for (var i = 0; i < data.resp.length; i++) {
                            $rootScope.Teams[data.resp[i].id] = data.resp[i].name;
                        }
                    } else {
                        delete $rootScope.Teams;
                    }
                    $scope.tmSelector.loading = false;
                });
            });
        }

        function closeShare() {
            $scope.shareModalInstance.close('close');
        }

        function share(teamId) {
            $scope.tmSelector.sharing = true;
            ShareIt.share(teamId, $scope.tmSelector.objId, $scope.tmSelector.type).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        toastr.success('Shared.');
                        closeShare();
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Sharing failed.');
                }
                $scope.tmSelector.sharing = false;
            });
        }

        function unshare(teamId, objId, type) {
            toastr.info('Removing share with team...');
            ShareIt.unshare(teamId, objId, type).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        toastr.success('Removed sharing with team.');
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Unable to remove sharing. Please try again later.');
                }
            });
        }

        function hardSync() {
            SyncIt.syncUnsynced();
            iDB.findByKey('setting', '_id', 'lastSynced').then(function (data) {
                var ts = 0;
                /*if(data && data.time){
                    ts = data.time;
                }*/
                DataService.getAllData().then(function (data) {
                    SyncIt.fetch('fetchAll', ts, data);
                });
            });
        }

        function formatJSON(jsonString) {
            try {
                return JSON.stringify(JSON.parse(jsonString), null, '\t');
            } catch (e) {
                return jsonString;
            }
        }

        $timeout(function () {
            getNotifications();
            checkForUpdate();
        }, 3000);

        function loadIntro() { var h, e, i, d, r, g, c, l, s, o; function n(t, i) { this.anchorX = t, this.anchorY = i, this.x = Math.random() * (t - (t - s)) + (t - s), this.y = Math.random() * (i - (i - s)) + (i - s), this.vx = 2 * Math.random() - 1, this.vy = 2 * Math.random() - 1, this.energy = 100 * Math.random(), this.radius = Math.random(), this.siblings = [], this.brightness = 0 } function y(t, i) { return Math.sqrt(Math.pow(t.x - i.x, 2) + Math.pow(t.y - i.y, 2)) } function a() { h.width = window.innerWidth, h.height = window.innerHeight } function t(t) { r.x = t.clientX, r.y = t.clientY } g = 100, c = 10, l = 0, s = 20, o = 200, i = 2 * Math.PI, d = [], h = document.querySelector("canvas"), a(), r = { x: h.width / 2, y: h.height / 2 }, (e = h.getContext("2d")) || alert("Ooops! Your browser does not support canvas :'("), n.prototype.drawNode = function () { var t = "rgba(255, 0, 0, " + this.brightness + ")"; e.beginPath(), e.arc(this.x, this.y, 2 * this.radius + 2 * this.siblings.length / c, 0, i), e.fillStyle = t, e.fill() }, n.prototype.drawConnections = function () { for (var t = 0; t < this.siblings.length; t++) { var i = "rgba(255, 0, 0, " + this.brightness + ")"; e.beginPath(), e.moveTo(this.x, this.y), e.lineTo(this.siblings[t].x, this.siblings[t].y), e.lineWidth = 1 - y(this, this.siblings[t]) / g, e.strokeStyle = i, e.stroke() } }, n.prototype.moveNode = function () { this.energy -= 2, this.energy < 1 && (this.energy = 100 * Math.random(), this.x - this.anchorX < -s ? this.vx = 2 * Math.random() : this.x - this.anchorX > s ? this.vx = -2 * Math.random() : this.vx = 4 * Math.random() - 2, this.y - this.anchorY < -s ? this.vy = 2 * Math.random() : this.y - this.anchorY > s ? this.vy = -2 * Math.random() : this.vy = 4 * Math.random() - 2), this.x += this.vx * this.energy / 100, this.y += this.vy * this.energy / 100 }, document.addEventListener("resize", a, !1), h.addEventListener("mousemove", t, !1), function () { e.clearRect(0, 0, h.width, h.height), d = []; for (var t = 50; t < h.width; t += 50)for (var i = 50; i < h.height; i += 50)d.push(new n(t, i)), l++ }(), function t() { var i, s, n; for (a(), e.clearRect(0, 0, h.width, h.height), function () { for (var t, i, s, n = 0; n < l; n++) { (t = d[n]).siblings = []; for (var h = 0; h < l; h++)if (t !== (i = d[h]) && (s = y(t, i)) < g) if (t.siblings.length < c) t.siblings.push(i); else { for (var e, r = 0, o = 0, a = 0; a < c; a++)o < (r = y(t, t.siblings[a])) && (o = r, e = a); s < o && (t.siblings.splice(e, 1), t.siblings.push(i)) } } }(), i = 0; i < l; i++)s = d[i], n = y({ x: r.x, y: r.y }, s), s.brightness = n < o ? 1 - n / o : 0; for (i = 0; i < l; i++)(s = d[i]).brightness && (s.drawNode(), s.drawConnections()), s.moveNode(); $scope.animationFrame = requestAnimationFrame(t) }() }

        function unloadIntro() {
            cancelAnimationFrame($scope.animationFrame);
        }

        $scope.$on('$destroy', function () {
            envUpdatedListener();
        });
    }

    run.$inject = ['$rootScope', 'Const'];
    function run($rootScope, Const) {
        $rootScope.Const = Const;
    }

})();
