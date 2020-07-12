/* global angular */

(function () {
    'use strict';
    angular.module('app.home')
            .controller('PublishedDocsController', PublishedDocsController)
            .controller('NewPublishedDocsController', NewPublishedDocsController);

    PublishedDocsController.$inject = ['$timeout', 'apicURLS', '$http', 'toastr','$stateParams','$rootScope'];
    function PublishedDocsController($timeout, apicURLS, $http, toastr, $stateParams,$rootScope) {
        var vm = this;
        vm.flags = {
            loading: false,
            inEdit: false,
            saving: false
        };
        vm.data = [];
        vm.selectedName = '';
        vm.selected = {};

        vm.getPDocs = getPDocs;
        vm.edit = edit;
        vm.republish = republish;
        vm.deleteDoc = deleteDoc;

        init();
        function init(){
            if($stateParams.docId){
                vm.selected.id=$stateParams.docId;
            }
            getPDocs(true);
        }

        function getPDocs(toEdit) {
            vm.flags.inEdit = false;
            vm.flags.loading = true;
            $http.get(apicURLS.publishDoc).then(function (resp) {
                if (resp.data) {
                    if (resp.data.status === 'ok') {
                        vm.data = resp.data.resp;
                        if(toEdit){
                            for(var i=0; i< vm.data.length; i++){
                                if(vm.data[i].id === vm.selected.id){
                                    edit(vm.data[i]);
                                    break;
                                }
                            }
                        }
                    } else {
                        toastr.error(resp.data.desc);
                    }
                } else {
                    toastr.error('Failed to load your published docs.');
                }
                vm.flags.loading = false;
            }, function () {
                toastr.error('Failed to load your published docs.');
                vm.flags.loading = false;
            });
        }
        
        function edit(doc){
            vm.selected=angular.copy(doc);
            vm.flags.inEdit = true;
            vm.selectedName = vm.selected.title;
            $timeout(function (){
                angular.element('#pDocTitle_e').focus();
            });
        }
        
        function republish(){
            console.log(vm.selected);
            vm.selected._modified = new Date().getTime();
            var putReq = {
                method: 'PUT',
                url: apicURLS.publishDoc,
                data: vm.selected
            };
            vm.flags.saving = true;
            $http(putReq).then(function (resp){
                if(resp.data){
                    if(resp.data.status === 'ok'){
                        toastr.success('Doc re-publidhded.');
                        vm.selected={};
                        getPDocs();
                    }else{
                        toastr.error(resp.data.desc);                        
                    }
                }else{
                    toastr.error('Failed to republish.');
                }
                vm.flags.saving=false;
            }, function (){
                toastr.error('Failed to republish.');
                vm.flags.saving=false;
            });
        }
        
        function deleteDoc(id, apiProjId){
            $http.delete(apicURLS.publishDoc+'/'+id).then(function (resp){
                if(resp && resp.data){
                    if(resp.data.status === 'ok'){
                        getPDocs();
                    }else{
                        toastr.error(resp.data.desc);
                    }
                }else{
                    toastr.error('Failed to delete doc.');
                }
            },function (){
                toastr.error('Failed to delete doc.');
            });
        }
    }

    NewPublishedDocsController.$inject = ['$scope', '$stateParams', '$state', '$http', 'apicURLS', 'toastr', '$confirm', 'DesignerServ','$rootScope'];
    function NewPublishedDocsController($scope, $stateParams, $state, $http, apicURLS, toastr, $confirm, DesignerServ,$rootScope) {
        var vm = this;
        vm.flags = {
            loading: false
        };


        vm.publish = publish;
        init();

        function init() {
            if (!$stateParams.projId) {
                $state.go('apic.dashboard.publishedDocs');
                return;
            }
            vm.newPublished = {
                title: $stateParams.title
            };
            if($stateParams.projId.indexOf('$')>0){
                var ids = $stateParams.projId.split('$');
                vm.newPublished.projId = ids[0];
                vm.newPublished.id = ids[1];
            }else{
                vm.newPublished.projId= $stateParams.projId;
            }
        }

        function publish() {
            var ts = new Date().getTime();
            if(!vm.newPublished.id){
                vm.newPublished.id = ts + '-' + s12();
            }
            if(!vm.newPublished._created){
                vm.newPublished._created = ts;
            }
            vm.newPublished._modified = ts;
            console.log(vm.newPublished);
            var postReq = {
                method: 'POST',
                url: apicURLS.publishDoc,
                data: vm.newPublished
            };
            vm.flags.loading = true;
            $http(postReq).then(function (resp) {
                var data = resp.data;
                if (data) {
                    if (data.status === 'ok') {
                        var projId = data.resp.projId;
                        DesignerServ.getAPIProjectById(projId).then(function (proj) {
                            if (proj) {
                                proj.publishedId = data.resp.id;
                                proj._modified = new Date().getTime();
                                DesignerServ.updateAPIProjects(proj).then(function () {
                                    $confirm({text: data.desc + ' You can view your published document at https://apic.app/PublishedDocs/#/' + data.resp.id, title: 'Documentation published', ok: 'Ok', type: 'alert'})
                                            .then(function () {
                                                $scope.$parent.vm.getPDocs();
                                                $state.go('apic.dashboard.publishedDocs');
                                            }, function () {
                                                $scope.$parent.vm.getPDocs();
                                                $state.go('apic.dashboard.publishedDocs');
                                            });
                                });
                            }
                        });

                    } else {
                        toastr.error('Failed to publish documentation. ' + data.desc);
                    }
                } else {
                    toastr.error('Failed to publish documentation.');
                }
                vm.flags.loading = false;
            }, function (resp) {
                var msg='';
                if(resp && resp.data){
                    msg = resp.data.desc;
                }
                vm.flags.loading = false;
                toastr.error('Failed to publish documentation. '+msg);
            });
        }
    }
})();