/* global apic */

var APP = {
    VERSION: '2.0.0',
    PLATFORM: 'WEB',
    IS_ELECTRON: isElectron(),
    TYPE: getAppType()
};
(function () {
    angular.module('apic', ['ui.router',
        'ct.ui.router.extras',
        'ui.bootstrap',
        'app.home',
        'indexedDB',
        'ui.ace',
        'toastr',
        'angular-confirm',
        'ngSanitize',
        'ui.sortable',
        //'io.dennis.contextmenu',
        'json-schema',
        'ngTagEditor',
        'jsonFormatter',
        'mohsen1.json-schema-view'
    ]);

    angular.module('apic')
        .config(config)
        .run(run);

    config.$inject = ['$stateProvider', '$urlRouterProvider', '$indexedDBProvider', 'toastrConfig', '$compileProvider', '$httpProvider'];
    function config($stateProvider, $urlRouterProvider, $indexedDBProvider, toastrConfig, $compileProvider, $httpProvider) {
        $compileProvider.debugInfoEnabled(false);
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        // $httpProvider.defaults.withCredentials = true;

        $indexedDBProvider
            .connection('apic')
            .upgradeDatabase(1, function (event, db, tx) {
                var objStore = db.createObjectStore('history', { keyPath: '_id' });
                //objStore.createIndex('_id', '_id', {unique: true});
                objStore.createIndex('_time', '_time', { unique: false });
                objStore.createIndex('_id', '_id', { unique: true });
            })
            .upgradeDatabase(2, function (event, db, tx) {
                var folders = db.createObjectStore('folders', { keyPath: '_id' });
                folders.createIndex('_created', '_created', { unique: false });
                folders.createIndex('name', 'name', { unique: false });
                folders.createIndex('_id', '_id', { unique: true });
            })
            .upgradeDatabase(3, function (event, db, tx) {
                var savedReq = db.createObjectStore('savedRequests', { keyPath: '_id' });
                savedReq.createIndex('_time', '_time', { unique: false });
                savedReq.createIndex('_id', '_id', { unique: true });
            })
            .upgradeDatabase(9, function (event, db, tx) {
                try {
                    var envs = db.createObjectStore('Environments', { keyPath: '_id' });
                    envs.createIndex('_created', '_created', { unique: false });
                    envs.createIndex('_id', '_id', { unique: true });
                } catch (e) {
                    db.deleteObjectStore('Environments');
                    var envs = db.createObjectStore('Environments', { keyPath: '_id' });
                    envs.createIndex('_created', '_created', { unique: false });
                    envs.createIndex('_id', '_id', { unique: true });
                }
            })
            .upgradeDatabase(10, function (event, db, tx) {
                try {
                    var envs = db.createObjectStore('Projects', { keyPath: '_id' });
                    envs.createIndex('_created', '_created', { unique: false });
                    envs.createIndex('_id', '_id', { unique: true });
                } catch (e) {
                    db.deleteObjectStore('Projects');
                    var envs = db.createObjectStore('Projects', { keyPath: '_id' });
                    envs.createIndex('_created', '_created', { unique: false });
                    envs.createIndex('_id', '_id', { unique: true });
                }
            })
            .upgradeDatabase(6, function (event, db, tx) {
                var envs = db.createObjectStore('TestSuits', { keyPath: '_id' });
                envs.createIndex('projId', 'projId', { unique: false });
                envs.createIndex('_id', '_id', { unique: true });
            })
            .upgradeDatabase(7, function (event, db, tx) {
                var envs = db.createObjectStore('ApiProjects', { keyPath: '_id' });
                //envs.createIndex('_created', '_created', {unique: true});
                envs.createIndex('_id', '_id', { unique: true });
            })
            .upgradeDatabase(8, function (event, db, tx) {
                var envs = db.createObjectStore('setting', { keyPath: '_id' });
                //envs.createIndex('_created', '_created', {unique: true});
                envs.createIndex('_id', '_id', { unique: true });
            })
            .upgradeDatabase(11, function (event, db, tx) {
                var table = db.createObjectStore('unsynced', { keyPath: '_id' });
                table.createIndex('_id', '_id', { unique: true });
                table.createIndex('time', 'time', { unique: false });
            });
        //$urlRouterProvider.otherwise('/apic/designer');
        $urlRouterProvider.otherwise(function ($injector, $location) {
            var $state = $injector.get('$state');
            $injector.get('Utils').storage.get(['workspace']).then(function (data) {
                if (data.workspace === 'Tester') $state.go('apic.home')
                else $state.go('apic.designer')
            })
            return $location.path();
        });
        $stateProvider
            .state('apic', {
                url: '/apic?color',
                templateUrl: 'modules/parentView.html',
                resolve: {
                    envs: ['$rootScope', 'iDB', function ($rootScope, iDB) {
                        return iDB.readSorted('Environments', 'name', 'asc').then(function (envs) {
                            $rootScope.ENVS = envs;
                            return envs;
                        });
                    }]
                },
                controller: ['$scope', '$state', '$rootScope', '$stateParams', 'Const', 'Utils', function ($scope, $state, $rootScope, $stateParams, Const, Utils) {
                    $rootScope.module = 'Tester';
                    $scope.routeIncludes = function (partialRoute) {
                        return $state.includes(partialRoute);
                    };
                    if (!$rootScope.theme) {
                        var color;
                        if ($stateParams.color) {
                            color = decodeURIComponent($stateParams.color);
                        } else if (localStorage) {
                            color = localStorage.getItem('theme');
                        }
                        setTheme(color);
                    }

                    $rootScope.$on('setTheme', function (e, args) {
                        var color = decodeURIComponent(args.color);
                        setTheme(color);
                    });

                    function setTheme(color) {
                        Utils.storage.get(['themeAccent', 'themeType']).then(function (data) {
                            var root = document.documentElement;
                            var themeData = Const.themes[data.themeType];
                            if (themeData) {
                                angular.forEach(themeData, function (val, key) {
                                    root.style.setProperty(key, val);
                                })
                                document.querySelector('meta[name=theme-color]').setAttribute('content', themeData['--header-bg']);
                            }
                            root.style.setProperty('--accent-color', data.themeAccent || Const.themes.accents[0]);
                            root.style.setProperty('--accent-shadow', (data.themeAccent || Const.themes.accents[0]) + '4d');
                        });
                    }

                }],
                sticky: true
            })
            .state('apic.home', {
                url: '/home',
                sticky: true,
                deepStateRedirect: false,
                views: {
                    'homeView': {
                        templateUrl: 'modules/home/home.html',
                        controller: 'HomeController as vm'
                    }
                }
            })
            .state('apic.designer', {
                url: '/designer',
                sticky: true,
                deepStateRedirect: false,
                views: {
                    'designerView': {
                        templateUrl: 'modules/designer/designerHome.html',
                        controller: 'DesignerController as vm'
                    }
                }
            })
            .state('apic.dashboard', {
                url: '/dashboard',
                sticky: true,
                deepStateRedirect: false,
                views: {
                    'dashboardView': {
                        templateUrl: 'modules/dashboard/dashboard.html',
                        controller: 'DashboardController as vm'
                    }
                }
            })
            .state('apic.dashboard.publishedDocs', {
                url: '/publishedDocs/:docId',
                templateUrl: 'modules/dashboard/publishedDocs/pdocs.html',
                controller: 'PublishedDocsController as vm'
            })
            .state('apic.dashboard.team', {
                url: '/team/',
                templateUrl: 'modules/dashboard/team/team.html',
                controller: 'TeamController as vm'
            })
            .state('apic.dashboard.account', {
                url: '/account/',
                templateUrl: 'modules/dashboard/account/account.html',
                controller: 'AccountController as vm'
            })
            .state('apic.dashboard.publishedDocs.new', {
                url: '/new/:projId',
                templateUrl: 'modules/dashboard/publishedDocs/newPDocs.html',
                controller: 'NewPublishedDocsController as vm',
                params: {
                    title: ''
                }
            })
            .state('apic.docs', {
                url: '/docs',
                params: { proj: undefined },
                sticky: true,
                deepStateRedirect: false,
                views: {
                    'docsView': {
                        templateUrl: 'modules/docs/docsHome.html',
                        controller: 'DocsHomeController as vm'
                    }
                }
            })
            .state('apic.docs.detail', {
                url: '/:projId',
                templateUrl: 'modules/docs/docs.html',
                controller: 'DocsController as vm'
            })
        //.state('otherwise', {url: '/designer'});



        angular.extend(toastrConfig, {
            //autoDismiss: false,
            maxOpened: 10,
            newestOnTop: true,
            positionClass: 'toast-bottom-right',
            closeButton: true,
            timeOut: 5000
        });

        //close model selector custom dropdown dropdown
        angular.element('body').bind('click', function (e) {
            var target = e.target;
            if (!angular.element(target).hasClass('model-selector')) {
                angular.element('.model-type-selector').hide();
            }
            //e.stopPropagation();
            //e.preventDefault();
            //return false;
            //console.log(e.target);
        });
    }

    run.$inject = ['$rootScope', 'Const', '$http', 'Utils', 'apicURLS', 'ngSockJs', 'User', 'TeamService'];
    function run($rootScope, Const, $http, Utils, apicURLS, ngSockJs, User, TeamService) {
        //add addHeader function to XMLHttpRequest prototype
        XMLHttpRequest.prototype.addHeadersFromObj = function (headers) {
            var _this = this;
            angular.forEach(headers, function (val, key) {
                if (key) {
                    var headerName = key.toUpperCase();
                    if (Const.restrictedHeaders.includes(headerName) || headerName.startsWith('SEC-') || headerName.startsWith('PROXY-')) {
                        key = 'APIC-' + key;
                    }
                    try {
                        _this.setRequestHeader(key, val);
                    } catch (e) {
                        var m = e.message;
                        console.warn(m.slice(m.indexOf(':') + 1).trim());
                    }
                }
            })
            return _this;
        };

        //check if the user is logged in
        Utils.storage.get(['UID', 'authToken', 'name', 'email']).then(function (data) {
            if (data && data.UID && data.authToken) { //user is logged in
                User.setData(data);
                console.log('user data', data);
                $rootScope.userData = data;
                $http.defaults.headers.common['Authorization'] = data.UID + '||' + data.authToken;
                TeamService.getList(true).then(function (data) {
                    if (data && data.resp && data.resp.length) {
                        $rootScope.Teams = {};
                        for (var i = 0; i < data.resp.length; i++) {
                            $rootScope.Teams[data.resp[i].id] = data.resp[i].name;
                        }
                    } else {
                        delete $rootScope.Teams;
                    }
                });
                ngSockJs.connect({ 'Auth-Token': data.UID + '||' + data.authToken }).then(function () {
                    //get the last synced time
                    //no need to do these. The are handeled once socket is connected onSocketConnected();
                    /*iDB.findByKey('setting', '_id', 'lastSynced').then(function (data){
                        console.log('lastsybced', data);
                        var ts = 0;//new Date().getTime();
    
                        if(data && data.time){
                            ts = data.time;
                        }
                        //SyncIt.fetch('fetchAll', ts);
                        //SyncIt.syncUnsynced();
                    });*/
                });
            }
            //check if the dummy user is registered, otherwise add a dummy user.
            Utils.storage.get('userId').then(function (data) {
                var request = {
                    method: 'POST',
                    url: apicURLS.registerDummy,
                    data: {
                        id: apic.uuid(),
                        platform: APP.TYPE
                    }
                };
                if (data && data.userId) {
                    request.data.id = data.userId;
                    request.data.existing = true;
                }
                $http(request).then(function (response) {
                    if (response && response.data && response.data.resp) {
                        Utils.storage.set('userId', response.data.resp.id);
                    }
                }, function () {
                    console.log('Failed to add dummy user');
                });
            }, function (e) {
                console.error(e);
            });

        });
        User.doFirstRun();

        //check if APIC was updated, and show notification
        Utils.storage.get('version').then(function (data) {
            if (data.version) {
                if (Utils.isNewVersion(APP.VERSION, data.version)) {
                    Utils.notify('APIC Updated', 'Apic has been updated to a new version (' + APP.VERSION + ').', 'https://apic.app/changelog.html');
                }
            }
            Utils.storage.set('version', APP.VERSION);
        }, function () {
            Utils.storage.set('version', APP.VERSION);
        });

        //puts test code snippets in rootScope
        $rootScope.testSnippets = Const.testSnippets;
        $rootScope.reqBodySnippets = Const.reqBodySnippets;

        $rootScope.safeApply = function (fn) {
            var phase = this.$root.$$phase;
            if (phase === '$apply' || phase === '$digest') {
                if (fn && (typeof (fn) === 'function')) {
                    fn();
                }
            } else {
                this.$apply(fn);
            }
        };
    }

})();
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
