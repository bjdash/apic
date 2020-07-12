(function () {
    'use strict';
    angular.module('app.home')
        .controller('envController', envController);
    envController.$inject = ['$scope', '$timeout', 'toastr', 'FileSystem', 'Validator', '$rootScope', 'EnvService', '$confirm'];
    function envController($scope, $timeout, toastr, FileSystem, Validator, $rootScope, EnvService, $confirm) {
        var vm = this;
        vm.showAddEnv = false;
        vm.selectedEnv = {};
        vm.newEnvName = '';
        vm.saveRequired = false;
        vm.envsLoaded = false;
        vm.edit = {
            show: false,
            copy: '',
            nameBeforeEdit: ''
        };
        vm.checkedEnvs = {
            export: [],
            share: [],
            unshare: []
        };
        vm.selectAll = {
            export: false,
            share: false,
            unshare: false
        };
        vm.flags = {
            showType: 'env', //inMem,
            inMemAdd: false,
            inMemModel: ''
        }

        $scope.notAlphaNum = 0;
        vm.inMemEnvCopy = angular.copy($rootScope.xtraEnv);

        vm.showAddEnvBox = showAddEnvBox;
        vm.selectEnv = selectEnv;
        vm.saveNewEnv = saveNewEnv;
        vm.saveEnvs = saveEnvs;
        vm.removeEnvVals = removeEnvVals;
        vm.deleteEnv = deleteEnv;
        vm.showEnvEdit = showEnvEdit;
        vm.saveEnvEdit = saveEnvEdit;
        vm.discardEdit = discardEdit;
        vm.downloadEnv = downloadEnv;
        vm.downloadMultiple = downloadMultiple;
        vm.importFromFile = importFromFile;
        vm.toggleAllSelection = toggleAllSelection;
        vm.selectionToggled = selectionToggled;
        vm.unshareEnv = unshareEnv;
        vm.shareEnv = shareEnv;
        vm.showInMemEnv = showInMemEnv;
        vm.inMemEnvChanged = inMemEnvChanged;
        vm.addInMemVar = addInMemVar;
        vm.closeInMemVar = closeInMemVar;


        vm.environments = [];


        function showAddEnvBox() {
            if (!validateKeys())
                return;
            vm.showAddEnv = !vm.showAddEnv;
            vm.newEnvName = '';
            if (vm.showAddEnv) {
                $timeout(function () {
                    angular.element('#newEnvName').focus();
                });
            }
        }

        function selectEnv(env) {
            if (!validateKeys())
                return;
            vm.flags.showType = 'env';
            if ($scope.envDetailForm.$dirty) {
                vm.selectedEnv._modified = new Date().getTime();
            }
            vm.selectedEnv = env;
            discardEdit();
            $scope.envDetailForm.$setPristine();
        }

        function saveNewEnv(newName, vals, copying) {
            if (!validateKeys())
                return;
            if (!newName)
                return;
            for (var i = 0; i < vm.environments.length; i++) {
                if (vm.environments[i].name.toLowerCase() === newName.toLowerCase()) {
                    if (copying) {
                        newName = newName + ' Copy';
                        i = 0;
                    } else {
                        toastr.error('Environment with name "' + newName + '" already exists.');
                        return;
                    }
                }
            }

            var ts = new Date().getTime();
            var newEnv = {
                name: newName,
                vals: [{ key: '', val: '' }],
                _created: ts,
                _modified: ts,
                _id: ts + '-' + s12()
            };
            if ($rootScope.userData && $rootScope.userData.UID) {
                newEnv.owner = $rootScope.userData.UID;
            }
            if (vals) {
                newEnv.vals = angular.copy(vals);
                if (copying) {
                    newEnv.vals.forEach(function (val) {
                        delete val.readOnly
                    })
                }
            }
            EnvService.addEnv(newEnv).then(function () {
                vm.environments.push(newEnv);
                vm.selectedEnv = vm.environments[vm.environments.length - 1];
                vm.flags.showType = 'env';
                if (!copying) {
                    vm.showAddEnv = false;
                }
            });
        }

        function saveEnvs(closeModal) {
            if (!validateKeys())
                return;
            if ($scope.envDetailForm.$dirty) {
                vm.selectedEnv._modified = new Date().getTime();
            }
            var envsToUpdate = [];
            for (var i = 0; i < vm.environments.length; i++) {
                if (($rootScope.userData && vm.environments[i].owner === $rootScope.userData.UID) || !$rootScope.userData) {
                    envsToUpdate.push(vm.environments[i]);
                }
            }
            if (envsToUpdate.length > 0) {
                EnvService.updateEnv(envsToUpdate).then(function () {
                    toastr.success('Environments saved');
                    if (closeModal) {
                        $scope.closeEnvModal();
                    } else if ($scope.envDetailForm) {
                        $scope.envDetailForm.$setPristine();
                        vm.saveRequired = false;
                    }
                    $rootScope.$emit('envUpdated');
                }, function () {
                    toastr.error('Failed to save environment');
                });
            } else {
                if (closeModal) {
                    $scope.closeEnvModal();
                } else if ($scope.envDetailForm) {
                    $scope.envDetailForm.$setPristine();
                    vm.saveRequired = false;
                }
            }
            //update in memory envs (if any)
            if ($scope.inMemEnvForm) {
                angular.forEach($scope.inMemEnvForm, function (val, key) {
                    if (key.indexOf('mem.') === 0) {
                        var envKey = key.split('.')[1], envVal = val.$modelValue;
                        if (envVal === undefined) {
                            delete $rootScope.xtraEnv[envKey];
                        } else {
                            if (!$rootScope.xtraEnv) $rootScope.xtraEnv = {};
                            $rootScope.xtraEnv[envKey] = envVal;
                        }
                    }
                });
                vm.inMemEnvCopy = angular.copy($rootScope.xtraEnv);
            }

        }

        function removeEnvVals(index) {
            vm.selectedEnv.vals.splice(index, 1);
            if ($scope.envDetailForm) {
                $scope.envDetailForm.$setDirty();
            }
        }

        function deleteEnv(env, index) {
            if (env.proj) {
                EnvService.canDelete(env._id).then(function (can) {
                    if (can) {
                        deleteEnvById(env._id, index);
                    } else {
                        toastr.error('This environment is auto generated from the saved settings for API project "' + env.proj.name + '". This will be auto deleted when the API design project is deleted. To modify \'host\' & \'basePath\', go to the Designer section');
                    }
                })
            } else {
                deleteEnvById(env._id, index);
            }

        }

        function deleteEnvById(envId, index) {
            EnvService.deleteEnv(envId).then(function () {
                var envName = vm.environments[index].name;
                toastr.clear();
                toastr.success('Environment "' + envName + '" deleted.');
                vm.environments.splice(index, 1);
                if (vm.environments.length === 0) {
                    vm.selectedEnv = {};
                } else if (vm.selectedEnv.name.toLowerCase() === envName.toLowerCase()) {
                    if (index === 0) {
                        vm.selectedEnv = vm.environments[0];
                    } else {
                        vm.selectedEnv = vm.environments[index - 1];
                    }

                }
            }, function () {
                toastr.error('Failed to delete environment');
            });
        }

        function showEnvEdit() {
            vm.edit.show = true;
            vm.edit.copy = vm.selectedEnv.name;
            vm.edit.nameBeforeEdit = vm.selectedEnv.name;
            $timeout(function () {
                angular.element('#envEditName').focus();
            });
        }

        function saveEnvEdit() {
            if (vm.edit.copy === vm.edit.nameBeforeEdit) {
                vm.edit.show = false;
                return;
            }
            for (var i = 0; i < vm.environments.length; i++) {
                if (vm.environments[i].name.toLowerCase() === vm.edit.copy.toLowerCase()) {
                    toastr.error('Environment "' + vm.edit.copy + '" is already there.');
                    return;
                }
            }
            vm.selectedEnv.name = vm.edit.copy;
            vm.edit.show = false;
            if ($scope.envDetailForm) {
                $scope.envDetailForm.$setDirty();
            }
        }

        function discardEdit() {
            vm.edit.show = false;
            vm.edit.copy = '';
            vm.edit.nameBeforeEdit = '';
        }

        function downloadEnv(env) {
            var data = {
                TYPE: 'Environment',
                value: env
            };
            var name = env.name ? env.name : 'Environments';
            FileSystem.download(name + '.env.apic.json', JSON.stringify(data, null, '\t'));

        }

        function downloadMultiple() {
            var toDownload = [];
            for (var i = 0; i < vm.checkedEnvs.export.length; i++) {
                if (vm.checkedEnvs.export[i] === vm.environments[i]._id) {
                    delete vm.environments[i].owner;
                    delete vm.environments[i].team;
                    toDownload.push(vm.environments[i]);
                }
            }
            downloadEnv(toDownload);
        }

        function importFromFile() {
            FileSystem.readFile().then(function (file) {
                var data = null;
                try {
                    data = JSON.parse(file.data);
                } catch (e) {
                    toastr.error('Import failed. Invalid file format');
                }
                if (!data)
                    return;

                if (data.TYPE === 'Environment') {
                    if (Validator.environment(data) === true) {
                        var ts = new Date().getTime();
                        if (data.value.length > 0) {//collectn of envs
                            for (var j = 0; j < data.value.length; j++) {
                                var env = data.value[j];
                                delete env.owner;
                                delete env.team;
                                delete env.proj;
                                env._created = ts;
                                env._modified = ts;
                                env._id = ts + '-' + s12();
                                if ($rootScope.userData && $rootScope.userData.UID) {
                                    env.owner = $rootScope.userData.UID;
                                }
                                importEnv(env);
                            }
                        } else {//single env
                            delete data.value.owner;
                            delete data.value.team;
                            data.value._created = ts;
                            data.value._id = ts + '-' + s12();
                            data.value._modified = ts;
                            if ($rootScope.userData && $rootScope.userData.UID) {
                                data.value.owner = $rootScope.userData.UID;
                            }
                            importEnv(data.value);
                        }
                        saveEnvs();
                    } else {
                        toastr.error('Selected file doesn\'t contain valid environment information');
                    }
                } else {
                    toastr.error('Selected file doesn\'t contain valid environment information');
                }
            });
        }

        function importEnv(env) {
            /*for (var i = 0; i < vm.environments.length; i++) {
                if (env.name.toLowerCase() === vm.environments[i].name.toLowerCase()) {
                    //$confirm({text: 'Environment "'+env.name+'" already exist.Any new values will be added to the environment. What do you want to do with existing properties?', title: 'Environment already exists', ok: 'Keep the ones from file', cancel: 'Keep my current values'})
                    //.then(function () {
                    vm.environments[i].vals = vm.environments[i].vals.concat(env.vals);
                    return;
                    //});
                }
            }*/

            vm.environments.push(env);
            if (vm.environments.length === 1) {
                vm.selectedEnv = vm.environments[0];
            }
        }

        function toggleAllSelection(type) {
            vm.checkedEnvs[type] = [];
            vm.selectAll[type] = !vm.selectAll[type];
            if (vm.selectAll[type]) {
                for (var i = 0; i < vm.environments.length; i++) {
                    var env = vm.environments[i];
                    if (type === 'share' && !env.team && $rootScope.userData && env.owner === $rootScope.userData.UID) {
                        vm.checkedEnvs[type].push(env._id);
                    } else if (type === 'unshare' && env.team && $rootScope.userData && env.owner === $rootScope.userData.UID) {
                        vm.checkedEnvs[type].push(env._id);
                    } else if (type === 'export') {
                        vm.checkedEnvs[type].push(env._id);
                    }
                }
            }
        }

        function selectionToggled(type, id) {
            if (vm.checkedEnvs[type].indexOf(id) < 0) {
                vm.checkedEnvs[type].push(id);
            } else {
                var index = vm.checkedEnvs[type].indexOf(id);
                vm.checkedEnvs[type].splice(index, 1);
            }
            if (vm.checkedEnvs[type].length === vm.environments.length) {
                vm.selectAll[type] = true;
            } else {
                vm.selectAll[type] = false;
            }
            return;

            /*if (vm.checkedEnvs[type].length === vm.environments.length && vm.checkedEnvs[type].indexOf(false) < 0) {
                vm.selectAll[type] = true;
            } else {
                var allUnchecked = false;
                for (var i = 0; i < vm.checkedEnvs[type].length; i++) {
                    if (vm.checkedEnvs[type][i] !== false) {
                        allUnchecked = true;
                        break;
                    }
                }
                if (allUnchecked) {
                    vm.selectAll[type] = false;
                }
            }*/
        }

        function shareEnv(env) {
            if (env.proj && env.proj.id) {
                $confirm({ text: 'This environment is automatically shared when the API project it belongs to is also shared. To share this environment just share the API Project it belongs to.', title: 'Share Environment', ok: 'Ok', type: 'alert' });
            } else {
                $rootScope.openShareModal([env._id], 'Envs');
            }
        }
        function unshareEnv(env) {
            if (env.proj && env.proj.id) {
                $confirm({ text: 'This environment is automatically shared as the API project it belongs to is also shared. This environment can be unshared by unsharing the API Project it belongs to.', title: 'Unshare Environment', ok: 'Ok', type: 'alert' });
            } else {
                $rootScope.unshare(env.team, env._id, 'Envs');
            }
        }

        function readAllEnv() {
            $rootScope.getAllEnv().then(function (envs) {
                vm.environments = envs;
                vm.envsLoaded = true;
            }, function () {
                toastr.error('Failed to read environments.');
            });
        }
        readAllEnv();

        function validateKeys() {
            if ($scope.notAlphaNum > 0) {
                toastr.error('Name can only have alpha numeric value. Please correct before proceeding !');
                return false;
            }
            return true;
        }

        $scope.$watch('envDetailForm.$dirty', function () {
            if ($scope.envDetailForm) {
                if ($scope.envDetailForm.$dirty && !vm.saveRequired) {
                    vm.saveRequired = true;
                }
            }
        }, true);

        function showInMemEnv() {
            vm.flags.showType = 'inMem';
        }
        showInMemEnv()

        function inMemEnvChanged(key, val) {
            vm.saveRequired = true;
        }

        function addInMemVar() {
            //this is required as the ng-model="val" for (key, val ) doesnt update the val;
            if ($scope.inMemEnvForm) {
                angular.forEach($scope.inMemEnvForm, function (val, key) {
                    if (key.indexOf('mem.') === 0) {
                        var envKey = key.split('.')[1], envVal = val.$modelValue;
                        if (val === undefined) {
                            delete vm.inMemEnvCopy[envKey];
                        } else {
                            vm.inMemEnvCopy[envKey] = envVal;
                        }
                    }
                });
            }

            if (!vm.inMemEnvCopy) vm.inMemEnvCopy = {};
            if (vm.inMemEnvCopy.hasOwnProperty(vm.flags.inMemModel) && vm.inMemEnvCopy[vm.flags.inMemModel] !== undefined) {
                toastr.error('An in-memory variable of same name already exists');
                return;
            }
            vm.inMemEnvCopy[vm.flags.inMemModel] = '';
            closeInMemVar();
        }

        function closeInMemVar() {
            vm.flags.inMemAdd = false;
            vm.flags.inMemModel = '';
        }
    }

})();