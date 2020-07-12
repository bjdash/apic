(function () {
    'use strict';
    angular.module('app.home')
            .controller('ProjInfoController', ProjInfoController);

    ProjInfoController.$inject = ['DesignerServ', 'iDB', 'toastr', '$rootScope'];
    function ProjInfoController(DesignerServ, iDB, toastr, $rootScope) {
        var vm = this;
        vm.flags = {};
        vm.proj = {};

        vm.createProj = createProj;
        function createProj() {
            var proj = angular.copy(vm.proj);
            if($rootScope.userData && $rootScope.userData.UID){
                proj.owner = $rootScope.userData.UID;
            }
            
            DesignerServ.addProject(proj).then(function (data) {
                $rootScope.closeProjInfoModal();
                $rootScope.$broadcast('ApiProjChanged');
                toastr.success('API Project "' + vm.proj.title + '" created');
            }, function () {
                toastr.success('Failed to create API Project');
            });
        }
    }
})();