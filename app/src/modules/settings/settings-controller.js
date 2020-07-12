/* global chrome */

(function () {
    'use strict';
    angular.module('app.home')
            .controller('settingsController', settingsController);
    settingsController.$inject = ['$scope', 'Const', 'Utils', '$rootScope'];
    function settingsController($scope, Const, Utils, $rootScope) {
        var vm = this;
        vm.saveRequired = false;
        vm.settingOptns = [
            {name: 'Themes'}
        ];
        vm.selectedSetting = {};

        vm.themes = Const.themes;
        
        vm.selectSetting = selectSetting;

        init();
        function init() {
            selectSetting(vm.settingOptns[0]);
            //I guess this is not not required
            // Utils.storage.get(['themeAccent', 'themeType']).then(function (data) {
            //     $scope.selectedTheme.themeAccent = data.themeAccent || '#2196f3';
            //     $scope.selectedTheme.themeType = data.themeType || 'light';
            // });
        }

        function selectSetting(optn) {
            vm.selectedSetting = optn;
        }

        $scope.$watch('envForm.$dirty', function () {
            if ($scope.envForm) {
                if ($scope.envForm.$dirty) {
                    vm.saveRequired = true;
                } else {
                    vm.saveRequired = false;
                }
            }
        }, true);

    }

})();