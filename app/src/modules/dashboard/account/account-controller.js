/* global angular */
(function () {
    'use strict';
    angular.module('app.home')
            .controller('AccountController', AccountController);

    AccountController.$inject = ['$scope', '$http', 'apicURLS', 'toastr', '$rootScope', 'Utils', '$uibModal'];
    function AccountController($scope, $http, apicURLS, toastr, $rootScope, Utils, $uibModal) {
        var vm = this;

        vm.user = $rootScope.userData;
        vm.accDetailForm = {
            name: vm.user.name
        };
        vm.psdForm = {
            curPsd: '',
            newPsd: '',
            newPsdAgain: ''
        };
        vm.flags = {
            accUpdating: false,
            psd: false,
            delAcc: false
        };

        vm.updateAccount = updateAccount;
        vm.resetAccDetailForm = resetAccDetailForm;
        vm.changePassword = changePassword;
        vm.confirmAccDelete = confirmAccDelete;
        vm.cancelAccDelete = cancelAccDelete;
        vm.deleteAccount = deleteAccount;


        function updateAccount() {
            var putReq = {
                method: 'PUT',
                url: apicURLS.accUpdate,
                data: {
                    name: vm.accDetailForm.name
                }
            };
            vm.flags.accUpdating = true;
            $http(putReq).then(function (resp) {
                if (resp.data) {
                    if (resp.data.status === 'ok') {
                        toastr.success(resp.data.desc);
                        Utils.storage.set('name', resp.data.resp);
                        vm.user.name = vm.accDetailForm.name;
                    } else {
                        toastr.error(resp.data.desc);
                    }
                } else {
                    toastr.error('Failed to update account detail.');
                }
                vm.flags.accUpdating = false;
            }, function () {
                toastr.error('Failed to update account detail.');
                vm.flags.accUpdating = false;
            });
        }

        function resetAccDetailForm() {
            vm.accDetailForm.name = vm.user.name;
        }

        function changePassword() {
            var req = {
                method: 'POST',
                url: apicURLS.changePsd,
                data: vm.psdForm
            };
            vm.flags.psd = true;
            $http(req).then(function (resp) {
                if (resp.data) {
                    if (resp.data.status === 'ok') {
                        $rootScope.reconnect({'Auth-Token': $rootScope.userData.UID + '||' + resp.data.resp.authToken});
                        $http.defaults.headers.common['Authorization'] = $rootScope.userData.UID + '||' + resp.data.resp.authToken;
                        Utils.storage.set({authToken:resp.data.resp.authToken})
                        toastr.success(resp.data.desc);
                    } else {
                        toastr.error(resp.data.desc);
                    }
                } else {
                    toastr.error('Failed to update password.');
                }
                vm.flags.psd = false;
            }, function (err) {
                if (err && err.data) {
                    toastr.error(err.data.desc);
                } else {
                    toastr.error('Failed to update password.');
                }
                vm.flags.psd = false;
            });
        }

        function confirmAccDelete() {
            vm.delConf = '';
            $scope.modalInst = $uibModal.open({
                animation: true,
                scope: $scope,
                backdrop: 'static',
                templateUrl: 'modules/partial/accDel.html',
                size: 'lg'
            });

        }

        function cancelAccDelete(){
            $scope.modalInst.close('close');
        }

        function deleteAccount() {
            var req = {
                method: 'DELETE',
                url: apicURLS.account
            };
            vm.flags.delAcc = true;
            $http(req).then(function (resp) {
                if (resp.data) {
                    if (resp.data.status === 'ok') {
                        toastr.success(resp.data.desc);
                        //logout user
                        $rootScope.logout();
                    } else {
                        toastr.error(resp.data.desc);
                    }
                } else {
                    toastr.error('Failed to update password.');
                }
                vm.flags.delAcc = false;
                cancelAccDelete();
            }, function () {
                toastr.error('Failed to update password.');
                vm.flags.delAcc = false;
            });
        }
    }
})();
