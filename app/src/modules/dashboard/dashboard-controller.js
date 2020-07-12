/* global angular */

(function () {
    'use strict';
    angular.module('app.home')
            .controller('DashboardController', DashboardController);

    DashboardController.$inject = ['$scope', '$http', 'apicURLS', 'toastr','$rootScope','$state'];
    function DashboardController($scope, $http, apicURLS, toastr, $rootScope,$state) {
        $scope.$on('$stateChangeSuccess', function (event, toState) {
            if (toState.name === 'apic.dashboard') {
                loadDashboard();
            }
        });        
        var vm = this;
        vm.flags = {
            loading: false
        };
        vm.db;
        
        vm.loadDashboard = loadDashboard;

        if(!$rootScope.userData || !$rootScope.userData.UID){
            toastr.error('You need to be logged in to APIC to access Dashboard.');
            $state.go('apic.designer');
            return;
        }

        loadDashboard();

        function loadDashboard() {
            vm.flags.loading = true;
            $http.get(apicURLS.dashboard).then(function (resp) {
                if (resp.data) {
                    if (resp.data.status === 'ok') {
                        vm.db = resp.data.resp;
                    } else {
                        toastr.error(resp.data.desc);
                    }
                } else {
                    toastr.error('Failed to load your dashboard.');
                }
                vm.flags.loading = false;
            }, function () {
                toastr.error('Failed to load your dashboard.');
                vm.flags.loading = false;
            });
        }
    }
})();