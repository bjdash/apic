(function () {
    'use strict';
    angular.module('app.home')
            .controller('DocsHomeController', DocsHomeController);

    DocsHomeController.$inject = ['$scope', 'iDB', 'toastr', '$rootScope', '$state'];
    function DocsHomeController($scope, iDB, toastr, $rootScope, $state) {
        $scope.hideDocs = false;
        var vm = this;
        vm.projects = [];
        

        vm.showDocs = showDocs;

        init();

        function init() {
            getApiProjs();
        }

        function getApiProjs() {
            iDB.read('ApiProjects').then(function (data) {
                if (data) {
                    vm.projects = data;
                }
            }, function () {
                toastr.error('Failed to read API Projects');
            });
        }

        function showDocs(proj) {
            $state.go('apic.docs.detail', {projId: proj._id, proj: proj});
        }
        
        $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
            if (toState.name === 'apic.docs') {
                $scope.hideDocs = false;
            }
        });
    }
})();