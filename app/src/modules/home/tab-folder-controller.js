(function () {
    'use strict';
    angular.module('app.home')
            .controller('FolderTabCtrl', FolderTabCtrl);

    FolderTabCtrl.$inject = ['$scope', '$rootScope', 'toastr'];
    function FolderTabCtrl($scope, $rootScope, toastr) {
        var runner;
        var vm = this;
        
        vm.folder;
        vm.folderNameCopy = '';
        vm.ctrls = {
            
        };
        
        init();
        function init() {
            if (!$rootScope.folderToOpen) {
                toastr.error('Unexpected error occured');
                return;
            }
            
            vm.folder = $rootScope.folderToOpen;
            vm.folderNameCopy = vm.folder.name;
            $rootScope.folderToOpen = null;
        }
    }
})();