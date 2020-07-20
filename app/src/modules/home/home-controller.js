/* global Mousetrap */

(function () {
    'use strict';
    angular.module('app.home')
        .controller('HomeController', HomeController);

    HomeController.$inject = ['$scope', '$timeout', '$rootScope', '$confirm'];
    function HomeController($scope, $timeout, $rootScope, $confirm) {
        var counter = 1;
        $scope.tabs = [];
        $scope.addTab = addTab;
        $scope.removeTabAtPosition = removeTabAtPosition;
        $scope.tabSelected = tabSelected;

        addTab();
        function addTab(type, obj) {
            if (!type) {
                if ($rootScope.loadRequest) {
                    type = $rootScope.loadRequest.type === 'ws' ? 'socket' : 'req';
                } else {
                    type = 'req';
                }
            }
            var tab;
            switch (type) {
                case 'req':
                    tab = { title: 'New tab', id: new Date().getTime() + 'newtab', type: 'req', icon: 'icon bj-embed2' };
                    break;
                case 'suit':
                    tab = { title: obj.name, type: 'suit', id: 'suit-' + obj._id, icon: 'icon bj-box-filled' };
                    break;
                case 'folder':
                    tab = { title: obj.name, type: 'folder', id: 'folder-' + obj._id, icon: 'icon bj-folder-information2' };
                    break;
                case 'socket':
                    tab = { title: 'Websocket', type: 'socket', id: 'socket-' + new Date().getTime() + 'newtab', icon: 'icon bj-websocket' };
                    break;
                default:
                    return;
            }
            tab.index = counter;
            counter++;
            $scope.tabs.push(tab);

            $timeout(function () {
                $scope.active = tab.index;
            });
        }

        function removeTabAtPosition(event, position) {
            event.preventDefault();
            event.stopPropagation();
            $scope.tabs.splice(position, 1);
        }

        function removeTabWithIndex(tabIndex) {
            if ($scope.tabs.length === 1)
                return;
            if (!tabIndex)
                tabIndex = $scope.active;
            for (var i = 0; i < $scope.tabs.length; i++) {
                if ($scope.tabs[i].index === tabIndex) {
                    $scope.tabs.splice(i, 1);
                    break;
                }
            }
        }

        function tabSelected(tab) {
            $rootScope.selectedTab = tab.id;
        }

        //If the tab is already opened, return its index
        function isTabOpen(id) {
            for (var i = 0; i < $scope.tabs.length; i++) {
                if ($scope.tabs[i].id === id) {
                    return $scope.tabs[i].index;
                }
            }
        }

        function focusNextTab() {
            if ($scope.tabs.length > 1) {
                for (var i = 0; i < $scope.tabs.length; i++) {
                    if ($scope.tabs[i].index === $scope.active) {
                        var nextTab = i === $scope.tabs.length - 1 ? $scope.tabs[0] : $scope.tabs[i + 1];
                        $scope.active = nextTab.index;
                        $scope.$apply();
                        break;
                    }
                }
            }
        }
        function focusPrevTab() {
            if ($scope.tabs.length > 1) {
                for (var i = 0; i < $scope.tabs.length; i++) {
                    if ($scope.tabs[i].index === $scope.active) {
                        var prevTab = i === 0 ? $scope.tabs[$scope.tabs.length - 1] : $scope.tabs[i - 1];
                        $scope.active = prevTab.index;
                        $scope.$apply();
                        break;
                    }
                }
            }
        }

        $rootScope.$on('LoadFromHistory', function (e, args) {
            $rootScope.loadRequest = args;
            addTab();
        });

        $rootScope.$on('LoadFromSave', function (e, entry) {
            $rootScope.loadRequest = entry;
            var opened = isTabOpen(entry._id);
            if (opened) {
                $scope.active = opened;
                delete $rootScope.loadRequest;
                return;
            }
            addTab();
        });

        $rootScope.$on('OpenSuitTab', function (e, suit) {
            if (!suit._id) {
                return;
            }
            var opened = isTabOpen('suit-' + suit._id);
            if (opened) {
                $scope.active = opened;
                if (suit.reqIdToOpen) {
                    $scope.$broadcast('openSuitReq', { suitId: suit._id, reqIdToOpen: suit.reqIdToOpen });
                }
                return;
            }
            $rootScope.loadSuit = suit;
            addTab('suit', suit);
        });

        $rootScope.$on('OpenFolderTab', function (e, folder) {
            if (!folder._id) {
                return;
            }
            var opened = isTabOpen('folder-' + folder._id);
            if (opened) {
                $scope.active = opened;
                return;
            }
            $rootScope.folderToOpen = folder;
            addTab('folder', folder);
        });

        $rootScope.$on('TestSuitDeleted', function (e, ids) {
            var opened = {
                tabStr: [],
                tabs: []
            };
            for (var j = 0; j < ids.length; j++) {
                for (var i = 0; i < $scope.tabs.length; i++) {
                    if ($scope.tabs[i].id === 'suit-' + ids[j]) {
                        opened.tabStr.push($scope.tabs[i].title);
                        opened.tabs.push($scope.tabs[i].index);
                    }
                }
            }
            if (opened.tabs.length > 0) {
                $confirm({ text: 'Following opened Test Suite(s) "' + opened.tabStr.join(', ') + '" is/are deleted by another user. The opened tab(s) will now close.', title: 'Suite Deleted', ok: 'Ok', type: 'alert' })
                    .then(function () {
                        closeTabs(opened.tabs);
                    }, function () {
                        closeTabs(opened.tabs);
                    });

            }
        });

        function closeTabs(tabs) {
            for (var i = 0; i < tabs.length; i++) {
                removeTabWithIndex(tabs[i]);
            }
        }

        Mousetrap.bind('ctrl+tab', focusNextTab);
        Mousetrap.bind('ctrl+shift+tab', focusPrevTab);
        Mousetrap.bind('ctrl+t', function () {
            addTab();
            $scope.$apply();
        });
        Mousetrap.bind('ctrl+w', function (event) {
            event.preventDefault();
            event.stopPropagation();
            console.log('close tab');
            removeTabWithIndex();
            $scope.$apply();
        });
        //delete

    }
})();
