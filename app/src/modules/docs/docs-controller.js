(function () {
    'use strict';
    angular.module('app.home')
            .controller('DocsController', DocsController);

    DocsController.$inject = ['$scope', 'DocBuilder', '$timeout', 'iDB', 'toastr', '$rootScope', '$location', '$state'];
    function DocsController($scope, DocBuilder, $timeout, iDB, toastr, $rootScope, $location, $state) {
        var vm = this;
        vm.SelectedPROJ;
        vm.leftTree = {};
        vm.error = ''

        vm.listDocs = listDocs;

        vm.tagGroups = {Untagged:[]}

        vm.ctrls = {
            infoTgl: false,
            pathTgl: false,
            modelTgl: false,
            docLoaded: false,
            groupBy:'tags'
        };

        function buildDocs(proj) {
            vm.SelectedPROJ = proj;
            vm.error = '';
            DocBuilder.getResolvedSpec(angular.copy(proj)).then(function (resolvedSpec) {
                docBuilt(resolvedSpec);
            }, function (e) {
                DocBuilder.getParsedSpec(angular.copy(proj)).then(function (resolvedSpec) {
                    docBuilt(resolvedSpec);
                }, function (e) {
                    vm.error += e.message;
                    toastr.error('Failed to generate documentation. '+e.message);
                });
                vm.error = e.message;                
            });
        }

        function docBuilt(resolvedSpec){
            $scope.specs = resolvedSpec;
            vm.ctrls.docLoaded = true;
            generateLeftTree();
            vm.tagGroups = {Untagged:[]}
            angular.forEach(resolvedSpec.paths, function(val, path){
                angular.forEach(resolvedSpec.paths[path], function(endp, method){
                    if(endp.tags && endp.tags.length>0){
                        endp.tags.forEach(function(tag){
                            if(!vm.tagGroups[tag]) vm.tagGroups[tag] =[];
                            endp.method = method;
                            endp.path = path;
                            vm.tagGroups[tag].push(endp);
                        });
                    }else{
                        endp.method = method;
                        endp.path = path;
                        vm.tagGroups.Untagged.push(endp);
                    }
                })
            });
            if(vm.tagGroups.Untagged.length===0) delete vm.tagGroups.Untagged;
        }

        function listDocs() {
            $state.go('apic.docs');
        }

        $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
            if (toState.name === 'apic.docs.detail') {
                vm.ctrls.docLoaded = false;
                if (typeof toParams.proj === 'object') {
                    buildDocs(toParams.proj);
                } else {
                    //iDB.findByKey('Environments','name','asd').then(function (data){
                    iDB.findByKey('ApiProjects', '_id', toParams.projId).then(function (data) {
                        buildDocs(data);
                    }, function () {
                        toastr.error('Failed to generate documentation');
                    });
                }
                $timeout(function () {
                    $rootScope.module = 'Docs';
                });
                $scope.$parent.hideDocs = true;

            }
        });

        function generateLeftTree() {
            vm.leftTree = {
                ungrouped: {
                    models: {},
                    traits: {},
                    endps: {}
                }
            };
            angular.forEach(vm.SelectedPROJ.folders, function (folder, _id) {
                vm.leftTree[_id] = {};
                vm.leftTree[_id].folder = vm.SelectedPROJ.folders[_id];
                vm.leftTree[_id].models = {};
                vm.leftTree[_id].traits = {};
                vm.leftTree[_id].endps = {};
            });
            angular.forEach(vm.SelectedPROJ.models, function (model, _id) {
                addModelToLeftTree(model);
            });
            angular.forEach(vm.SelectedPROJ.traits, function (trait, _id) {
                addTraitsToLeftTree(trait);
            });
            angular.forEach(vm.SelectedPROJ.endpoints, function (endp, _id) {
                addEndpToLeftTree(endp);
            });
        }

        function addModelToLeftTree(model, prevFolder) {
            if (prevFolder && vm.leftTree[prevFolder]) {
                delete vm.leftTree[prevFolder].models[model._id];
            }
            var modelX = {
                _id: model._id,
                name: model.name,
                nameSpace: model.nameSpace
            };
            if (vm.leftTree[model.folder]) {
                vm.leftTree[model.folder].models[model._id] = modelX;
            } else {
                vm.leftTree.ungrouped.models[model._id] = modelX;
            }
        }

        function addTraitsToLeftTree(trait, prevFolder) {
            if (prevFolder && vm.leftTree[prevFolder]) {
                delete vm.leftTree[prevFolder].traits[trait._id];
            }
            var traitX = {
                _id: trait._id,
                name: trait.name
            };
            if (vm.leftTree[trait.folder]) {
                vm.leftTree[trait.folder].traits[trait._id] = traitX;
            } else {
                vm.leftTree.ungrouped.traits[trait._id] = traitX;
            }
        }

        function addEndpToLeftTree(endp, prevFolder) {
            if (prevFolder && vm.leftTree[prevFolder]) {
                delete vm.leftTree[prevFolder].endps[endp._id];
            }
            var endpX = {
                _id: endp._id,
                name: endp.summary,
                method: endp.method,
                path: endp.path
            };
            if (vm.leftTree[endp.folder]) {
                vm.leftTree[endp.folder].endps[endp._id] = endpX;
            } else {
                vm.leftTree.ungrouped.endps[endp._id] = endpX;
            }
        }


        $scope.test = function (e) {
            e.preventDefault();
            $location.hash('post-user');
            console.log($location.hash());
        };
    }
})();