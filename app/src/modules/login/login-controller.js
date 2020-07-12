/* global CryptoJS, chrome, gapi */

(function () {
    'use strict';
    angular.module('app.home')
        .controller('loginController', loginController);
    loginController.$inject = ['$scope', 'apicURLS', 'DataService', '$http', '$timeout', 'Utils', '$rootScope', 'ngSockJs', 'SyncIt'];
    function loginController($scope, apicURLS, DataService, $http, $timeout, Utils, $rootScope, ngSockJs, SyncIt) {
        var vm = this;
        vm.window = 'login';
        vm.type = 'web';
        vm.gToken = '';
        vm.gScript = 0;
        vm.loginModel = {
            email: '',
            psd: ''
        };
        vm.msg = {
            type: '', //OK, WARNING, ERROR
            text: ''
        };

        vm.login = login;
        vm.register = register;
        vm.forgotPassword = forgotPassword;
        vm.initGoogleLogin = initGoogleLogin;

        init();
        function init() {
            if (APP.TYPE === 'ELECTRON') {

            } else if (APP.TYPE === 'CHROME' && chrome && chrome.identity) {
                vm.type = 'chrome';
            } else {
                console.log('loading lib');
                vm.gScript = 1; //loading
                var script = document.createElement('script');
                script.src = 'https://apis.google.com/js/platform.js';
                script.async = true;
                script.onload = registerGButton;
                script.onerror = function () {
                    vm.gScript = 3;
                };
                document.head.appendChild(script); //or something of the likes
            }

            $timeout(function () {
                var modal = angular.element('.full-screen.login-modal-window');
                if (modal) {
                    if (modal.hasClass('reg')) {
                        vm.window = 'reg';
                    }
                    if (modal.hasClass('forgot')) {
                        vm.window = 'forgot';
                    }
                }
            });
        }

        function registerGButton() {
            vm.gScript = 2;
            var auth2;
            var btn = document.querySelector('.login-g');
            gapi.load('auth2', function () {
                auth2 = gapi.auth2.init({
                    client_id: '918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com',
                    scope: 'email profile'
                });

                auth2.attachClickHandler(btn, {}, function (user) {
                    var profile = user.getBasicProfile();
                    var regModel = {
                        name: profile.getName(),
                        email: profile.getEmail(),
                        source: 'google',
                        token: user.getAuthResponse().access_token
                    };
                    var postReq = {
                        method: 'POST',
                        url: apicURLS.login + '/google',
                        data: regModel
                    };
                    $scope.$apply(function () {
                        doLogin(postReq);
                    });

                }, function (e) {
                    vm.msg = {
                        type: 'ERROR',
                        text: e.error
                    };
                });
            });
        }

        function login() {
            vm.msg = {
                type: 'INFO',
                text: 'Logging in...'
            };
            var loginData = {
                psd: vm.loginModel.psd,
                email: vm.loginModel.email
            };
            var postReq = {
                method: 'POST',
                url: apicURLS.login,
                data: loginData
            };
            doLogin(postReq);
        }

        function doLogin(postReq) {
            $http(postReq).then(function (response) {
                if (response && response.data) {
                    if (response.data.status === 'ok' && response.data.resp) {
                        onLoggedIn(response.data.resp);
                    }
                    vm.msg = {
                        type: response.data.status,
                        text: response.data.desc
                    };
                } else {
                    vm.msg = {
                        type: 'ERROR',
                        text: 'Unable to log in. Please try again later.'
                    };
                }
            }, function (e) {
                if (e.data) {
                    vm.msg = {
                        type: e.data.status,
                        text: e.data.desc
                    };
                } else {
                    vm.msg = {
                        type: 'ERROR',
                        text: 'Unable to log in. Please try again later.'
                    };
                }
            });
        }

        function onLoggedIn(userData) {
            userData.UID = userData.id;
            Utils.storage.get('UID').then(function (prevLogin) {
                Utils.storage.set(userData);
                $rootScope.userData = userData;
                $rootScope.closeLoginModal();
                $http.defaults.headers.common['Authorization'] = userData.UID + '||' + userData.authToken;

                if (prevLogin.UID === userData.id) {
                    ngSockJs.reconnect({ 'Auth-Token': userData.UID + '||' + userData.authToken });
                } else {
                    ngSockJs.connect({ 'Auth-Token': userData.UID + '||' + userData.authToken }).then(function () {
                        DataService.getAllData(true).then(function (allData) {
                            SyncIt.execute('updateAll', allData);
                            SyncIt.fetch('fetchAll');
                        });
                    });
                }
            })
            //keep the dummy user id incase the user loggs out
            //Utils.storage.remove('userId', response.data.resp.id);
        }

        function register() {
            vm.msg = {
                type: 'INFO',
                text: 'Registering...'
            };

            var regData = {
                name: vm.regModel.name,
                psd: vm.regModel.psd,
                email: vm.regModel.email,
                captchaCode: CryptoJS.MD5(vm.regModel.email + ':' + vm.regModel.name).toString()
            };
            var getReq = {
                method: 'POST',
                url: apicURLS.register,
                data: regData
            };
            $http(getReq).then(function (response) {
                vm.msg = {
                    type: response.data.status,
                    text: response.data.desc
                };
            }, function (e) {
                if (e.data) {
                    vm.msg = {
                        type: e.data.status,
                        text: e.data.desc
                    };
                } else {
                    vm.msg = {
                        type: 'error',
                        text: 'Unknown error.'
                    };
                }
            });
        }

        function forgotPassword() {
            vm.msg = {
                type: 'INFO',
                text: 'Requesting...'
            };

            var regData = {
                email: vm.forgotEmail,
                captchaCode: CryptoJS.MD5(vm.forgotEmail).toString()
            };
            var getReq = {
                method: 'POST',
                url: apicURLS.forgotPsd,
                data: regData
            };
            $http(getReq).then(function (response) {
                vm.msg = {
                    type: response.data.status,
                    text: response.data.desc
                };
            }, function (e) {
                if (e.data) {
                    vm.msg = {
                        type: e.data.status,
                        text: e.data.desc
                    };
                } else {
                    vm.msg = {
                        type: 'error',
                        text: 'Unknown error.'
                    };
                }
            });
        }

        function initGoogleLogin() {
            if (APP.TYPE === 'ELECTRON') {
                initBrowserLogin();
            } else if (vm.type === 'chrome') {
                vm.msg = {
                    type: 'INFO',
                    text: 'Opening Google auth flow. Please wait...'
                };
                chrome.identity.getAuthToken({ 'interactive': true }, function (token) {
                    if (chrome.runtime.lastError) {
                        vm.msg = {
                            type: 'ERROR',
                            text: chrome.runtime.lastError
                        };
                        initBrowserLogin()
                        $scope.$apply();
                        return;
                    }
                    vm.gToken = token;
                    getGoogleEmail(token);
                });
            } else if (!gapi) {
                if (vm.gScript === 1) {
                    vm.msg = {
                        type: 'INFO',
                        text: 'Loading Google login library. Please wait...'
                    };
                } else if (vm.gScript === 3) {
                    vm.msg = {
                        type: 'ERROR',
                        text: 'Failed to load Google login library. Please try again.'
                    };
                }
                initBrowserLogin();
            }
        }

        function initBrowserLogin() {
            var socket = io.connect(apicURLS.host, {
                path: '/api/socket.io',
                reconnection: false
            });
            vm.msg = {
                type: 'INFO',
                text: 'Please continue signing in with your browser which should have opened now. Completing the sign-in in the browser will automatically log you in this App.'
            };
            socket.on('connect', function () {
                var connId = s12() + s12();
                console.log('connecting soket', connId);
                socket.emit('web_connect', connId);
                if (APP.electron && APP.electron.shell) {
                    APP.electron.shell.openExternal('https://apic.app/identity/#!/login?connId=' + connId);
                } else {
                    window.open('https://apic.app/identity/#!/login?connId=' + connId);
                }
            });

            socket.on('loginNotify', function (dataStr) {
                var data = JSON.parse(dataStr);
                console.log('incoming', data);
                socket.disconnect();
                $scope.$apply(function () {
                    onLoggedIn(data);
                });
            })
        }

        function getGoogleEmail(token) {
            vm.msg = {
                type: 'INFO',
                text: 'Fetching user details...'
            };
            var req = {
                method: 'GET',
                url: 'https://www.googleapis.com/plus/v1/people/me',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            };
            $http(req).then(function (resp) {
                prepareLogin('google', resp.data);
            }, function (resp) {
                if (resp.status === 401) {
                    if (vm.type === 'chrome') {
                        chrome.identity.removeCachedAuthToken({ token: vm.gToken }, initGoogleLogin);
                    }
                }
            });
        }

        function prepareLogin(type, data) {
            switch (type) {
                case 'google':
                    vm.msg = {
                        type: 'INFO',
                        text: 'Hi ' + data.displayName + ". Please wait a moment. We are logging you in..."
                    };
                    var regModel = {
                        name: data.displayName,
                        email: data.emails[0].value,
                        source: 'google',
                        token: vm.gToken
                    };
                    var postReq = {
                        method: 'POST',
                        url: apicURLS.login + '/google',
                        data: regModel
                    };
                    doLogin(postReq);
                    break;
            }
        }
    }
})();