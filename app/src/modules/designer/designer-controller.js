/* global apic */

(function () {
    'use strict';
    angular.module('app.home')
        .controller('DesignerController', DesignerController);

    DesignerController.$inject = ['$scope', '$uibModal', '$rootScope', 'iDB', 'toastr', '$timeout', 'JsonSchema', 'DocBuilder', '$state', 'FileSystem', 'Validator', 'Utils', 'Const', 'lMenuService', '$confirm', 'DataBuilder', 'DesignerServ', 'EnvService', '$q'];
    function DesignerController($scope, $uibModal, $rootScope, iDB, toastr, $timeout, JsonSchema, DocBuilder, $state, FileSystem, Validator, Utils, Const, lMenuService, $confirm, DataBuilder, DesignerServ, EnvService, $q) {
        var vm = this;
        vm.flags = {
            hideLMenu: true,
            tab: 'setting',
            mocked: true,
            editProj: false,
            mockLoading: false,
            scriptType: 'postrun',
            mockHelp: false,
            modelPageDirty: false,
            traitPageDirty: false,
            endpPageDirty: false,
            expType: 'json', //yaml
            impType: 'json' //yaml
        };

        vm.stage = 'workspace';
        vm.responses = []; //this will have responses from traits those are defined against a name instead of a status code
        vm.designStage = 'dashboard';
        vm.activeHomeTab = {
            index: 0,
            name: 'Designer'
        };
        vm.MIMEs = ['application/EDI-X12', 'application/EDIFACT', 'application/atom+xml', 'application/font-woff', 'application/gzip', 'application/javascript', 'application/json', 'application/octet-stream', 'application/ogg', 'application/pdf', 'application/postscript', 'application/soap+xml', 'application/x-bittorrent', 'application/x-tex', 'application/xhtml+xml', 'application/xml-dtd', 'application/xop+xml', 'application/zip', 'application/x-www-form-urlencoded', 'application/xml', 'multipart/form-data', 'text/html', 'text/plain'];
        vm.SelectedPROJ = {};
        vm.selectedProjEndps = [];
        vm.projSetting = {
            protocol: 'http'
        };
        vm.importModel = {
            type: 'file',
            file: null,
            text: null,
            optn: {
                groupby: 'tag'
            }
        };
        vm.tbHelper = {
            save: saveBuilderTests,
            hideRun: true
        }
        var secDefModel = {
            type: 'basic', //apiKey,oauth2
            name: '',
            description: '',
            xProperty: [{ key: '', val: '' }]
        }

        vm.getApiProjs = getApiProjs;
        vm.selectProject = selectProject;
        vm.saveProjSetting = saveProjSetting;
        vm.showWorkspace = showWorkspace;
        vm.showProjImport = showProjImport;
        vm.closeProjImport = closeProjImport;
        vm.initProjImport = initProjImport;
        vm.openProjInfoModal = openProjInfoModal;
        $rootScope.closeProjInfoModal = closeProjInfoModal;
        vm.openExportModal = openExportModal;
        vm.closeExportModal = closeExportModal;
        vm.buildTestCases = buildTestCases;
        vm.loadFoldersView = loadFoldersView;
        vm.loadMdelsView = loadMdelsView;
        vm.loadCrudView = loadCrudView;
        vm.loadEndpointView = loadEndpointView;
        vm.loadTraitsView = loadTraitsView;
        vm.deleteApiProject = deleteApiProject;
        vm.viewDocs = viewDocs;
        vm.getEndpoints = getEndpoints;
        vm.enableProjEdit = enableProjEdit;
        vm.cancelProjEdit = cancelProjEdit;
        vm.saveProjEdit = saveProjEdit;
        vm.enableMock = enableMock;
        vm.disableMock = disableMock;
        vm.runMockedEndp = runMockedEndp;
        vm.duplicateEndp = duplicateEndp;
        vm.duplicateModel = duplicateModel;
        vm.duplicateTrait = duplicateTrait;
        vm.confirmExit = confirmExit;
        vm.jsonToYaml = jsonToYaml;
        vm.jsonToString = jsonToString;
        vm.addSecDef = addSecDef;
        vm.saveSecDef = saveSecDef;
        vm.secDefTypeChange = secDefTypeChange;

        vm.exportType = '';

        vm.projects = [];

        init();

        function init() {
            getApiProjs();
        }

        function getApiProjs() {
            return DesignerServ.getApiProjs().then(function (data) {
                if (data) {
                    vm.projects = data;
                }
                return data;
            }, function () {
                toastr.error('Failed to read API Projects');
            });
        }

        function selectProject(proj) {
            vm.flags.hideLMenu = false;
            vm.stage = 'projHome';
            vm.designStage = 'dashboard';
            vm.leftTree = {};
            vm.responses = [];
            iDB.findByKey('ApiProjects', '_id', proj._id).then(function (data) {
                vm.SelectedPROJ = angular.copy(data);
                if (vm.SelectedPROJ.setting) {
                    vm.projSetting = angular.copy(vm.SelectedPROJ.setting);
                } else {
                    vm.projSetting = {
                        protocol: 'http'
                    };
                }
                vm.selectedProjEndps = getEndpoints(vm.SelectedPROJ);
                generateLeftTree();
                vm.responses = DesignerServ.getTraitNamedResponses(vm.SelectedPROJ);
                //set security definitions
                vm.securityDefs = vm.SelectedPROJ.securityDefinitions || [];
                //reset selection for folders, models, traits and endpoints
                setCreate();
                setCreateModel();
                setCreateTrait();
                setCreateEndp();
            }, function () {
                toastr.error('Failed to load project detail.');
                showWorkspace();
            });
        }

        function saveProjSetting() {
            if (!vm.projSetting.host) {
                toastr.error('Please enter host name');
                return;
            }
            createEnvFromSetting(vm.SelectedPROJ, vm.projSetting);
        }

        function createEnvFromSetting(proj, settings) { //setting has -> host, basePath, protocol
            //if host has /at the end remove it
            if (settings.host.charAt(settings.host.length - 1) === '/') {
                settings.host = settings.host.substring(0, settings.host.length - 1);
            }

            var ts = new Date().getTime();
            //find existing env for this project if any, based on find add or update
            var newEnv = {
                name: proj.title + '-env',
                //vals: envVals,
                _created: ts,
                _modified: ts,
                _id: proj.setting && proj.setting.envId ? proj.setting.envId : ts + '-' + Math.random().toString(16).substring(2),
                proj: {
                    id: proj._id,
                    name: proj.title
                },
                owner: proj.owner
            };
            var action = proj.setting && proj.setting.envId ? 'update' : 'add';
            if (proj.team) {
                newEnv.team = proj.team;
            }
            (function () {
                var settingEnv = [{
                    key: 'host',
                    val: settings.host,
                    readOnly: true
                }, {
                    key: 'basePath',
                    val: settings.basePath,
                    readOnly: true
                }, {
                    key: 'scheme',
                    val: settings.protocol + '://',
                    readOnly: true
                }]
                if (action === 'add') {
                    newEnv.vals = settingEnv;
                    return EnvService.addEnv(newEnv);
                } else {
                    //if update get existing values and update
                    for (var i = 0; i < $rootScope.ENVS.length; i++) {
                        if ($rootScope.ENVS[i]._id === proj.setting.envId) {
                            var vals = $rootScope.ENVS[i].vals;
                            var rest = vals.filter(function (val) {
                                return ['host', 'basePath', 'scheme'].indexOf(val.key) < 0
                            });
                            newEnv.vals = settingEnv.concat(rest);
                            break;
                        }
                    }
                    return EnvService.updateEnv(newEnv);
                }
            }()).then(function () {
                var prevSetting = angular.copy(proj.setting);
                proj.setting = {
                    host: settings.host,
                    basePath: settings.basePath,
                    protocol: settings.protocol,
                    envId: newEnv._id
                };
                updateApiProject(proj).then(function () {
                    toastr.success('Settings Saved');
                }, function () {
                    toastr.error('Failed to save setting.');
                    proj.setting = prevSetting;
                });
            }, function () {
                toastr.error('Failed to save setting.');
            });
        }

        function showWorkspace() {
            vm.SelectedPROJ = {};
            vm.selectedProjEndps = [];
            vm.flags.hideLMenu = true;
            vm.stage = 'workspace';
            vm.designStage = null;
        }

        function showProjImport() {
            vm.importModel.text = null;
            $scope.projImportModalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'modules/designer/importProj.html',
                size: 'lg',
                scope: $scope
            });
            $scope.projImportModalInstance.opened.then(function () {
                $timeout(function () {
                    angular.element('#apiProjName').focus();
                }, 500);
            });
        }
        function closeProjImport() {
            $scope.projImportModalInstance.close('close');
        }
        function initProjImport() {
            if (!vm.importModel.type) {
                toastr.error('Please select the import type');
                return;
            }
            var fileChoser = document.getElementById('importProjFile');
            if (vm.importModel.type === 'file' && !fileChoser.value) {
                toastr.error('Please browse a Swagger/OAS or APIC project file to import');
                return;
            }
            if (vm.importModel.type === 'text' && !vm.importModel.text) {
                toastr.error('Please type a Swagger/OAS or APIC project file content to import');
                return;
            }
            closeProjImport();
            if (vm.importModel.type === 'file') {
                FileSystem.readFile(fileChoser.files).then(function (file) {
                    importProj(file.data, vm.importModel.optn);
                }, function () {
                    toastr.error('Import Failed. Couldn\'t read file');
                });
            } else if (vm.importModel.type === 'text') {
                importProj(vm.importModel.text, vm.importModel.optn);
            }
        }

        function importProj(content, optn) {
            if (!optn) optn = {};
            var data = null;
            try {
                data = JSON.parse(content);
            } catch (e) {
                try {
                    data = jsyaml.safeLoad(content);
                } catch (e) {
                    toastr.error('Import failed. Invalid file format');
                }
            }
            if (!data)
                return;

            var project;
            if (data.TYPE === 'APIC Api Project') {
                if (Validator.apiProject(data, true) === true) {
                    project = sanitizeProjImport(data.value);
                } else {
                    toastr.error('Selected file doesn\'t contain valid Project information');
                    return;
                }
            } else if (data.swagger === '2.0') {
                project = sanitizeProjImport(DocBuilder.importOAS2(data, optn));

            } else {
                toastr.error('Selected file doesn\'t contain valid Project information');
                return;
            }

            var ts = new Date().getTime();
            project._id = ts + '-' + s12();

            //create environment based on bsePath and host name, used in project settings
            if (!project.setting) project.setting = {};
            var newEnv = {
                name: project.title + '-env',
                vals: [{
                    key: 'host', val: project.setting.host, readOnly: true
                }, {
                    key: 'basePath', val: project.setting.basePath, readOnly: true
                }, {
                    key: 'scheme', val: project.setting.protocol, readOnly: true
                }],
                _created: ts,
                _modified: ts,
                _id: ts + '-' + s12(),
                proj: {
                    id: project._id,
                    name: project.title
                }
            };
            EnvService.addEnv(newEnv).then(function () {
                project.setting.envId = newEnv._id;
                DesignerServ.addProject(project).then(function () {
                    vm.projects.push(project);
                    toastr.success('Project "' + project.title + '" imported');
                }, function () {
                    toastr.error('Project import failed.');
                });
            });
        }

        function sanitizeProjImport(project) {
            delete project.owner;
            delete project.team;
            delete project.simKey;
            delete project.publishedId;
            var ts = new Date().getTime();
            project._id = ts + '-' + s12();
            project._created = ts;
            project._modified = ts;
            if (vm.projects) {
                for (var i = 0; i < vm.projects.length; i++) {
                    if (project.title.toLowerCase() === vm.projects[i].title.toLowerCase()) {
                        project.title = project.title + '-' + Utils.getRandomStr(8);
                    }
                }
            }
            if (project.setting) {
                delete project.setting.envId
            }
            return project;
        }

        function openProjInfoModal() {
            $scope.projInfoModalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'modules/designer/project-info/project-info-modal.html',
                size: 'lg',
                controller: 'ProjInfoController as vm'
            });
            $scope.projInfoModalInstance.opened.then(function () {
                $timeout(function () {
                    angular.element('#apiProjName').focus();
                }, 500);
            });
        }

        function closeProjInfoModal() {
            $scope.projInfoModalInstance.close('close');
        }

        function openExportModal(type) {
            prepareForExport(type);
            vm.exportType = type;
            $scope.exportModalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'modules/designer/projExportModal.html',
                size: 'lg',
                scope: $scope
            });
        }

        function closeExportModal() {
            $scope.exportModalInstance.close('close');
        }

        function loadFoldersView() {
            vm.designStage = 'folders';
            $timeout(function () {
                angular.element('#newFolderName').focus();
            });
        }

        function loadMdelsView() {
            vm.designStage = 'models';
            $timeout(function () {
                angular.element('#newModelName').focus();
            });
        }

        function loadEndpointView() {
            vm.designStage = 'endpoints';
            $timeout(function () {
                angular.element('#newEndpName').focus();
            });
        }
        function loadCrudView() {
            vm.designStage = 'API builder';
            $timeout(function () {
                if ($scope.crudForm) {
                    $scope.crudForm.$setPristine();
                }
                angular.element('#crudName').focus();
            });
        }

        function loadTraitsView() {
            vm.designStage = 'traits';
            $timeout(function () {
                angular.element('#newTraitName').focus();
            });
        }

        $rootScope.$on('ApiProjChanged', function (e, opId) {
            getApiProjs().then(function () {
                //handel if opened proj is changed
                for (var i = 0; i < vm.projects.length; i++) {
                    if (vm.projects[i]._id === vm.SelectedPROJ._id && vm.SelectedPROJ._modified < vm.projects[i]._modified) {
                        var curProj = vm.projects[i];
                        if (opId === 'auto') {//sharing/unsharing
                            vm.SelectedPROJ.publishedId = vm.projects[i].publishedId;
                            vm.SelectedPROJ.team = vm.projects[i].team;
                        } else if (opId === 'mock') {
                            vm.SelectedPROJ = vm.projects[i];
                        } else {
                            if ($state.current.name === 'apic.designer') {
                                $confirm({ text: 'The selected API project has been modified by another user.', title: 'Project modified', ok: 'Reload', type: 'alert' })
                                    .then(function () {
                                        selectProject(curProj);
                                    }, function () {
                                        selectProject(curProj);
                                    });
                            } else {
                                selectProject(curProj);
                            }
                        }
                        break;
                    }
                }
            });
        });

        $rootScope.$on('ApiProjRemoved', function (e, ids) {
            getApiProjs().then(function (projs) {
                //handel if opened proj is removed
                for (var i = 0; i < ids.length; i++) {
                    if (ids[i] === vm.SelectedPROJ._id) {
                        $confirm({ text: 'The selected API project has been deleted by its owner.', title: 'Project deleted', ok: 'Ok', type: 'alert' })
                            .then(function () {
                                showWorkspace();
                            }, function () {
                                showWorkspace();
                            });
                    }
                }
            });
        });

        function updateApiProject(project) {
            project._modified = new Date().getTime();
            return DesignerServ.updateAPIProjects(project);
        }

        function deleteApiProject(proj, projEnvId) {
            if (proj.owner && $rootScope.userData && $rootScope.userData.UID !== proj.owner) {
                toastr.error('You can\'t delete this Project as you are not the owner. If you have permission you can edit it though.');
                return;
            }
            var id = proj._id;
            DesignerServ.deleteAPIProject(id).then(function () {
                if (projEnvId) {
                    EnvService.deleteEnv(projEnvId)
                }
                getApiProjs();
                showWorkspace();
                toastr.success('Project deleted');
            }, function () {
                toastr.error('Failed to delete project');
            });
        }

        function prepareForExport(type) {
            vm.flags.expType = 'json'
            switch (type) {
                case 'OAS':
                    vm.exportedText = DocBuilder.exportOAS(vm.SelectedPROJ, '');
                    vm.exportedTextStr = JSON.stringify(vm.exportedText, null, '    ');
                    break;
                case 'RAW':
                    vm.exportedText = DocBuilder.exportRAW(vm.SelectedPROJ, '');
                    vm.exportedTextStr = JSON.stringify(vm.exportedText, null, '    ');
                    break;
            }
        }

        function buildTestCases() {

        }

        function viewDocs() {
            $state.go('apic.docs.detail', { projId: vm.SelectedPROJ._id, proj: vm.SelectedPROJ });
        }

        function getEndpoints(project) {
            if (!project.endpoints) {
                return [];
            }
            var endpoints = [];
            angular.forEach(project.endpoints, function (endp) {
                var tmpEndp = {
                    _id: endp._id,
                    method: endp.method,
                    path: endp.path,
                    summary: endp.summary
                };
                endpoints.push(tmpEndp);
            });

            return endpoints;
        }

        function enableProjEdit(e) {
            e.preventDefault();
            e.stopPropagation();
            vm.flags.editProj = true;
            vm.SelectedPROJCopy = angular.copy(vm.SelectedPROJ);
        }

        function cancelProjEdit() {
            vm.flags.editProj = false;
        }

        function saveProjEdit() {
            var envUpd = false;
            if (vm.SelectedPROJ.title !== vm.SelectedPROJCopy.title && vm.SelectedPROJ.setting) envUpd = true;
            vm.SelectedPROJ.title = vm.SelectedPROJCopy.title;
            vm.SelectedPROJ.version = vm.SelectedPROJCopy.version;
            vm.SelectedPROJ.description = vm.SelectedPROJCopy.description;
            vm.SelectedPROJ.termsOfService = vm.SelectedPROJCopy.termsOfService;
            if (vm.SelectedPROJCopy.license) {
                if (!vm.SelectedPROJ.license) {
                    vm.SelectedPROJ.license = {};
                }
                vm.SelectedPROJ.license.name = vm.SelectedPROJCopy.license.name;
                vm.SelectedPROJ.license.url = vm.SelectedPROJCopy.license.url;

            }
            if (vm.SelectedPROJCopy.contact) {
                if (!vm.SelectedPROJ.contact) {
                    vm.SelectedPROJ.contact = {};
                }
                vm.SelectedPROJ.contact.url = vm.SelectedPROJCopy.contact.url;
                vm.SelectedPROJ.contact.email = vm.SelectedPROJCopy.contact.email;
                vm.SelectedPROJ.contact.name = vm.SelectedPROJCopy.contact.name;
            }

            updateApiProject(vm.SelectedPROJ).then(function () {
                cancelProjEdit();
                if (envUpd) {
                    for (var i = 0; i < $rootScope.ENVS.length; i++) {
                        if ($rootScope.ENVS[i]._id === vm.SelectedPROJ.setting.envId) {
                            var env = $rootScope.ENVS[i];
                            env.name = vm.SelectedPROJ.title + '-env';
                            env.proj.name = vm.SelectedPROJ.title;
                            EnvService.updateEnv(env);
                        }
                    }
                }
            });
        }

        function enableMock(e) {
            e.preventDefault();
            e.stopPropagation();


            if (!$rootScope.checkLogin(e)) {
                return;
            }
            if (vm.SelectedPROJ._id.indexOf('-demo') > 0) {
                toastr.error('This is a demo project and hence mocking of APIs is not allowed.');
                return;
            }
            vm.flags.mockLoading = true;
            DesignerServ.enableMock(vm.SelectedPROJ._id).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        if (data._id === vm.SelectedPROJ._id) {
                            vm.SelectedPROJ.simKey = data.simKey;
                        }
                        toastr.success(data.desc);
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Couldn\'t start mocked response for the project. Please try again later.');
                }
                vm.flags.mockLoading = false;
            });
        }
        function disableMock(e) {
            e.preventDefault();
            e.stopPropagation();
            vm.flags.mockLoading = true;
            DesignerServ.disableMock(vm.SelectedPROJ._id).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        delete vm.SelectedPROJ.simKey;
                        toastr.success(data.desc);
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Couldn\'t start mocked response for the project. Please try again later.');
                }
                vm.flags.mockLoading = false;
            });
        }

        function runMockedEndp(endp) {
            $state.go('apic.home');
            $timeout(function () {
                var formattedEndp = DesignerServ.formatEndpForRun(endp, vm.SelectedPROJ);
                var runObj = prepareEndpForRun(formattedEndp);
                console.log(runObj);
                if (!vm.SelectedPROJ.setting) vm.SelectedPROJ.setting = {};
                runObj.url = 'https://apic.app/mock/' + vm.SelectedPROJ.simKey + (vm.SelectedPROJ.setting.basePath || '') + endp.path;
                $rootScope.$broadcast('LoadFromSave', runObj);
            });

        }

        /******************************************/
        /************* Crud Page ****************/
        /******************************************/
        vm.CRUD = {
            getResFromName: getResFromName,
            generateCRUDRes: generateCRUDRes
        };

        vm.CRUD.model = {
            name: '',
            path: '',
            projBakBeforeBuild: {}
        };

        function getResFromName() {
            if ($scope.crudForm && $scope.crudForm.crudPath.$pristine) {
                vm.CRUD.model.path = '/' + vm.CRUD.model.name.toLowerCase() + 's';
            }
        }

        function generateCRUDRes() {
            if (!vm.CRUD.model.name || !vm.CRUD.model.path) {
                return;
            }
            //take backup of project before building APIs
            vm.CRUD.model.projBakBeforeBuild = angular.copy(vm.SelectedPROJ);
            //create folder with name
            var folderId = checkExistingFolder(vm.CRUD.model.name);
            if (!folderId) {
                var folder = {
                    _id: Date.now() + s8(),
                    name: vm.CRUD.model.name,
                    desc: 'This folder contains all resources related to ' + vm.CRUD.model.name
                };
                if (!vm.SelectedPROJ.folders) {
                    vm.SelectedPROJ.folders = {};
                }
                vm.SelectedPROJ.folders[folder._id] = folder;
                folderId = folder._id;
                //add to left tree
                vm.leftTree[folder._id] = {
                    models: {},
                    traits: {},
                    endps: {}
                };
                vm.leftTree[folder._id].folder = folder;
            }
            generateModels(folderId);

        }

        function generateModels(folderId) {
            if (!folderId)
                return;
            //create input model
            if (!vm.SelectedPROJ.models) {
                vm.SelectedPROJ.models = {};
            }
            var ipModel = {
                _id: Date.now() + s8(),
                name: 'Input ' + vm.CRUD.model.name,
                folder: folderId,
                nameSpace: 'input_' + vm.CRUD.model.name,
                data: JsonSchema.obj2schema(vm.CRUD.model.req, vm.SelectedPROJ.models)
            };
            vm.SelectedPROJ.models[ipModel._id] = ipModel;
            addModelToLeftTree(ipModel, undefined);

            var opModel = {
                _id: Date.now() + s8(),
                name: 'Output ' + vm.CRUD.model.name.toLowerCase(),
                folder: folderId,
                nameSpace: 'output_' + vm.CRUD.model.name.toLowerCase(),
                data: JsonSchema.obj2schema(vm.CRUD.model.resp, vm.SelectedPROJ.models)
            };
            vm.SelectedPROJ.models[opModel._id] = opModel;
            addModelToLeftTree(opModel, undefined);

            generateEndPs([ipModel, opModel], folderId);

        }

        function generateEndPs(models, folderId) {
            var inModel = models[0]._id, outModel = models[1]._id;
            var name = vm.CRUD.model.name, path = vm.CRUD.model.path;
            resetEndp();
            var endp = angular.copy(vm.endp);
            endp.responses = [];
            var endpBody = {
                type: 'raw',
                rawData: ''
            };

            //create post req
            var postEndp = angular.copy(endp);
            var postBody = angular.copy(endpBody);
            postEndp.method = 'post';
            postEndp.summary = 'Create ' + name;
            postEndp.description = postEndp.summary;
            postEndp.path = path;
            postEndp.folder = folderId;
            postEndp.tags = [name];
            postEndp.queryParams = JsonSchema.newObject('##ROOT##');
            postEndp.pathParams = JsonSchema.newObject('##ROOT##');
            postEndp.headers = JsonSchema.newObject('##ROOT##');
            postEndp.responses.push({
                code: '201',
                data: JsonSchema.new$ref('##ROOT##', outModel),
                desc: 'Returns response 201 with the details of the newly created ' + name
            });
            postBody.rawData = JsonSchema.new$ref('##ROOT##', inModel);
            var toSavePost = prepareEndp4Save(postEndp, postBody, false);
            //createEndp(postEndp, postBody, false, true);


            //Create list GET req
            var getEndp = angular.copy(endp);
            getEndp.method = 'get';
            getEndp.summary = 'Get list of ' + name + 's';
            getEndp.description = getEndp.summary;
            getEndp.path = path;
            getEndp.folder = folderId;
            getEndp.tags = [name];
            getEndp.queryParams = JsonSchema.newObject('##ROOT##');
            getEndp.pathParams = JsonSchema.newObject('##ROOT##');
            getEndp.headers = JsonSchema.newObject('##ROOT##');
            var arrResp = JsonSchema.newArray('##ROOT##');
            arrResp._items.push(JsonSchema.new$ref('arrayEle', outModel));
            getEndp.responses.push({
                code: '200',
                data: arrResp,
                desc: 'Returns 200 with list/array of ' + name + 's'
            });
            var toSaveGet = prepareEndp4Save(getEndp, null, false);
            //createEndp(getEndp, null, false, true);

            //create GET by Id req
            var getIdEndp = angular.copy(endp);
            getIdEndp.method = 'get';
            getIdEndp.summary = 'Get detail of ' + name + ' by ' + name + 'Id';
            getIdEndp.description = getIdEndp.summary;
            getIdEndp.path = vm.CRUD.model.path + '/{' + name.toLowerCase() + 'Id}';
            getIdEndp.folder = folderId;
            getIdEndp.tags = [name];
            getIdEndp.queryParams = JsonSchema.newObject('##ROOT##');
            getIdEndp.headers = JsonSchema.newObject('##ROOT##');
            getIdEndp.pathParams = JsonSchema.newObject('##ROOT##', [JsonSchema.newString(name.toLowerCase() + 'Id', true)]);
            getIdEndp.responses.push({
                code: '200',
                data: JsonSchema.new$ref('##ROOT##', outModel),
                desc: 'Returns 200 with the detail of ' + name + ' for the specified ' + name.toLowerCase() + 'Id'
            });
            var toSaveGetId = prepareEndp4Save(getIdEndp, null, false);
            //createEndp(getIdEndp, null, false, true);

            //create UPDATE by Id req
            var putEndp = angular.copy(endp);
            var putBody = angular.copy(endpBody);
            putEndp.method = 'put';
            putEndp.summary = 'Update ' + name + ' details by ' + name + 'Id';
            putEndp.description = putEndp.summary;
            putEndp.path = vm.CRUD.model.path + '/{' + name.toLowerCase() + 'Id}';
            putEndp.folder = folderId;
            putEndp.tags = [name];
            putEndp.queryParams = JsonSchema.newObject('##ROOT##');
            putEndp.headers = JsonSchema.newObject('##ROOT##');
            putEndp.pathParams = JsonSchema.newObject('##ROOT##', [JsonSchema.newString(name.toLowerCase() + 'Id', true)]);
            putEndp.responses.push({
                code: '200',
                data: JsonSchema.new$ref('##ROOT##', outModel),
                desc: 'Returns 200 with the detail of updated ' + name
            });
            putBody.rawData = JsonSchema.new$ref('##ROOT##', inModel);
            var toSavePut = prepareEndp4Save(putEndp, putBody, false);
            //createEndp(putEndp, putBody, false, true);

            //create Delete by Id req
            var delEndp = angular.copy(endp);
            delEndp.method = 'delete';
            delEndp.summary = 'Delete ' + name + ' by ' + name + 'Id';
            delEndp.description = delEndp.summary;
            delEndp.path = vm.CRUD.model.path + '/{' + name.toLowerCase() + 'Id}';
            delEndp.folder = folderId;
            delEndp.tags = [name];
            delEndp.queryParams = JsonSchema.newObject('##ROOT##');
            delEndp.headers = JsonSchema.newObject('##ROOT##');
            delEndp.pathParams = JsonSchema.newObject('##ROOT##', [JsonSchema.newString(name.toLowerCase() + 'Id', true)]);
            delEndp.responses.push({
                code: '200',
                data: JsonSchema.newObject('##ROOT##'),
                desc: 'Returns 200 with the detail of updated ' + name
            });
            var toSaveDel = prepareEndp4Save(delEndp, null, false);
            //createEndp(delEndp, null, false, true);

            if (!vm.SelectedPROJ.endpoints) {
                vm.SelectedPROJ.endpoints = {};
            }

            var projBak = angular.copy(vm.SelectedPROJ);

            vm.SelectedPROJ.endpoints[toSavePost._id] = toSavePost;
            vm.SelectedPROJ.endpoints[toSaveGet._id] = toSaveGet;
            vm.SelectedPROJ.endpoints[toSaveGetId._id] = toSaveGetId;
            vm.SelectedPROJ.endpoints[toSavePut._id] = toSavePut;
            vm.SelectedPROJ.endpoints[toSaveDel._id] = toSaveDel;

            updateApiProject(vm.SelectedPROJ).then(function (data) {
                toastr.success('APIs built successfully');
                vm.CRUD.model = {
                    name: '',
                    path: ''
                };
                $scope.crudForm.$setPristine();
                addEndpToLeftTree(toSavePost);
                addEndpToLeftTree(toSaveGet);
                addEndpToLeftTree(toSaveGetId);
                addEndpToLeftTree(toSavePut);
                addEndpToLeftTree(toSaveDel);
            }, function () {
                toastr.error('Failed to Build APIs');
                vm.SelectedPROJ = projBak;
            });

            setCreateEndp();

        }

        /******************************************/
        /************* Folder page ****************/
        /******************************************/
        vm.folder = {
            _id: undefined,
            name: '',
            desc: ''
        };
        vm.folderCopy = {
            _id: undefined,
            name: '',
            desc: ''
        };
        vm.selectedFName = '';
        vm.folderActnType = 'create';

        vm.createFolder = createFolder;
        vm.selectFolder = selectFolder;
        vm.setCreate = setCreate;
        vm.deleteFolder = deleteFolder;

        function createFolder(folder, edit) {
            var dfr = $q.defer();
            if (checkExistingFolder(folder.name) && !edit) {
                toastr.error('Folder ' + folder.name + ' already exists');
                return;
            }
            if (!vm.SelectedPROJ.folders) {
                vm.SelectedPROJ.folders = {};
            }
            if (edit) {
                if (!folder._id) {
                    toastr.error('Missing folder ID.');
                    return;
                }
                //vm.SelectedPROJ.folders[vm.folder._id] = angular.copy(vm.folder);
                vm.SelectedPROJ.folders[folder._id].name = folder.name;
                vm.SelectedPROJ.folders[folder._id].desc = folder.desc;
            } else {
                folder._id = new Date().getTime() + s8();
                vm.SelectedPROJ.folders[folder._id] = angular.copy(folder);
            }
            updateApiProject(vm.SelectedPROJ).then(function (data) {
                $scope.folderForm.$setPristine();
                if (edit) {
                    toastr.success('Folder updated');
                } else {
                    toastr.success('Folder created');
                    vm.leftTree[folder._id] = {
                        models: {},
                        traits: {},
                        endps: {}
                    };
                    vm.leftTree[folder._id].folder = vm.SelectedPROJ.folders[folder._id];
                }
                vm.folderActnType = 'edit';
                vm.folderCopy = angular.copy(vm.folder);
                dfr.resolve(angular.copy(folder));
            }, function () {
                toastr.error('Failed to create/update folder');
                if (edit) {
                    vm.SelectedPROJ.folders[vm.folderCopy._id].name = vm.folderCopy.name;
                    vm.SelectedPROJ.folders[vm.folderCopy._id].desc = vm.folderCopy.desc;
                } else {
                    delete vm.SelectedPROJ.folders[folder._id];
                }
                dfr.reject();
            });
            return dfr.promise;
        }

        function selectFolder(folder, action) {
            //check if already unsaved folder data is there
            if ($scope.folderForm.$dirty) {
                $confirm({ text: 'The Folders view has some unsaved data. Do you want to replace it with your current selection?', title: 'Unsaved data', ok: 'Replace', cancel: 'No, I will save it' })
                    .then(function () {
                        $scope.folderForm.$setPristine();
                        vm.folderActnType = action;
                        vm.folderCopy = angular.copy(folder);
                        vm.folder = angular.copy(folder);
                    }, function () {
                        //selectProject(curProj);
                    });
            } else {
                vm.folderActnType = action;
                vm.folderCopy = angular.copy(folder);
                vm.folder = angular.copy(folder);
            }
        }

        function setCreate() {
            if ($scope.folderForm.$dirty) {
                $confirm({ text: 'The Folders view has some unsaved data. Do you want to reset it?', title: 'Unsaved data', ok: 'Reset', cancel: 'No, I will save it' })
                    .then(function () {
                        inner();
                    }, function () {
                        //selectProject(curProj);
                    });
            } else {
                inner();
            }

            function inner() {
                $scope.folderForm.$setPristine();
                vm.folderActnType = 'create';
                vm.folder = {
                    _id: undefined,
                    name: '',
                    desc: ''
                };
                vm.folderCopy = {
                    _id: undefined,
                    name: '',
                    desc: ''
                };
            }
        }

        function checkExistingFolder(name) {
            if (!name)
                return undefined;
            var foundId;
            if (vm.SelectedPROJ.folders) {
                angular.forEach(vm.SelectedPROJ.folders, function (f, key) {
                    if (f.name.toLowerCase() === name.toLowerCase()) {
                        foundId = key;
                    }
                });
            }
            return foundId;
        }

        function deleteFolder(id) {
            if (!id || !vm.SelectedPROJ.folders)
                return;
            var f = vm.SelectedPROJ.folders[id];
            delete vm.SelectedPROJ.folders[id];

            updateApiProject(vm.SelectedPROJ).then(function () {
                toastr.success('Folder deleted');
                $scope.folderForm.$setPristine();
                setCreate();
                removeFolderFromLeftTree(id);
            }, function () {
                toastr.error('Failed to delete folder');
                vm.SelectedPROJ.folders[id] = f;
            });

        }

        /******************************************/
        /************* Models page ****************/
        /******************************************/
        //Model Page (MP) variables
        vm.model = {
            _id: '',
            name: '',
            folder: '',
            nameSpace: '',
            data: ''
        };
        vm.modelCopy = {
            _id: '',
            name: '',
            folder: '',
            nameSpace: '',
            data: ''
        };


        vm.modelActnType = 'create';

        vm.selectFolderForModel = selectFolderForModel;
        vm.createModel = createModel;
        vm.selectModel = selectModel;
        vm.setCreateModel = setCreateModel;
        vm.deleteModel = deleteModel;
        vm.setDefaultNameSpace = setDefaultNameSpace;

        function selectFolderForModel(folderId) {
            vm.model.folder = folderId;
            vm.flags.modelPageDirty = true;
        }

        function createModel(model, edit, allowDup) {
            var dfr = $q.defer();
            if (checkExistingModel(model.name) && !edit && !allowDup) {
                toastr.error('Model ' + model.name + ' already exists');
                return;
            }
            var toSave = {
                _id: model._id,
                name: model.name,
                folder: model.folder,
                nameSpace: model.nameSpace,
                data: JsonSchema.obj2schema(model.data, vm.SelectedPROJ.models)
            };

            if (!vm.SelectedPROJ.models) {
                vm.SelectedPROJ.models = {};
            }
            if (edit) {
                if (!toSave._id) {
                    toastr.error('Missing model ID.');
                    return;
                }
                vm.SelectedPROJ.models[toSave._id] = toSave;
            } else {
                toSave._id = new Date().getTime() + s8();
                model._id = toSave._id;
                vm.SelectedPROJ.models[toSave._id] = toSave;
            }
            updateApiProject(vm.SelectedPROJ).then(function (data) {
                vm.flags.modelPageDirty = false;
                $scope.modelForm.$setPristine();
                if (edit) {
                    toastr.success('Model updated');
                    addModelToLeftTree(model, vm.modelCopy.folder ? vm.modelCopy.folder : 'ungrouped');
                } else {
                    toastr.success('Model created');
                    addModelToLeftTree(model, undefined);
                }
                vm.modelActnType = 'edit';
                vm.modelCopy = angular.copy(model);
                dfr.resolve(toSave);
            }, function () {
                toastr.error('Failed to create/update model');
                if (edit) {
                    vm.SelectedPROJ.models[vm.modelCopy._id] = angular.copy(model);
                } else {
                    delete vm.SelectedPROJ.models[model._id];
                }
                dfr.reject();
            });
            return dfr.promise;
        }

        function selectModel(model, action) {
            if ($scope.modelForm.$dirty || vm.flags.modelPageDirty) {
                $confirm({ text: 'Models view has some unsaved data. Do you want to replace it with your current selection?', title: 'Unsaved data', ok: 'Replace', cancel: 'No, I will save it' })
                    .then(function () {
                        inner();
                    }, function () {
                        //selectProject(curProj);
                    });
            } else {
                inner();
            }
            function inner() {
                $scope.modelForm.$setPristine();
                vm.flags.modelPageDirty = false;
                vm.modelActnType = action;
                var modelParsed = {
                    _id: model._id,
                    name: model.name,
                    folder: model.folder,
                    nameSpace: model.nameSpace,
                    data: JsonSchema.schema2obj(model.data, undefined, undefined, true, vm.SelectedPROJ.models)
                };
                vm.model = angular.copy(modelParsed);
                vm.modelCopy = angular.copy(modelParsed);
            }
        }

        function setCreateModel() {
            if ($scope.modelForm.$dirty || vm.flags.modelPageDirty) {
                $confirm({ text: 'Models view has some unsaved data. Do you want to reset it?', title: 'Unsaved data', ok: 'Reset', cancel: 'No, I will save it' })
                    .then(function () {
                        inner();
                    }, function () {
                        //selectProject(curProj);
                    });
            } else {
                inner();
            }
            function inner() {
                $scope.modelForm.$setPristine();
                vm.flags.modelPageDirty = false;
                vm.modelActnType = 'create';
                vm.model = {
                    _id: '',
                    name: '',
                    folder: '',
                    nameSpace: '',
                    data: ''
                };
                vm.modelCopy = angular.copy(vm.model);
            }
        }

        function checkExistingModel(name) {
            if (!name)
                return undefined;
            var foundId;
            if (vm.SelectedPROJ.models) {
                angular.forEach(vm.SelectedPROJ.models, function (m, key) {
                    if (m.name.toLowerCase() === name.toLowerCase()) {
                        foundId = key;
                    }
                });
            }
            return foundId;
        }

        function deleteModel(id) {
            if (!id || !vm.SelectedPROJ.models)
                return;
            var f = vm.SelectedPROJ.models[id];
            delete vm.SelectedPROJ.models[id];

            updateApiProject(vm.SelectedPROJ).then(function () {
                toastr.success('Model deleted');
                if (vm.model && vm.model._id === id) {
                    $scope.modelForm.$setPristine();
                    vm.flags.modelPageDirty = false;
                    setCreateModel();
                    vm.designStage = 'dashboard';
                }
                removeModelFromLeftTree(f._id, f.folder);
            }, function () {
                toastr.error('Failed to delete model');
                vm.SelectedPROJ.models[id] = f;
            });
        }

        function setDefaultNameSpace() {
            if (!vm.model.nameSpace)
                vm.model.nameSpace = vm.model.name.replace(/\s/g, '_');
        }

        /******************************************/
        /************* Endpoint page **************/
        /******************************************/

        vm.endpPans = {
            path: false,
            query: false,
            header: false,
            body: false,
            resp: false,
            more: true
        };
        vm.endp = {
            _id: undefined,
            operationId: '',
            method: 'get',
            schemes: [],
            path: '',
            folder: '',
            tags: [],
            consumes: [],
            produces: [],
            traits: [],
            summary: '',
            description: '',
            pathParams: undefined,
            queryParams: undefined,
            headers: undefined,
            responses: [],
            prerun: '',
            postrun: '',
            resp: {
                code: undefined,
                data: undefined,
                desc: ''
            },
            body: {
                type: 'raw',
                data: ''
            }
        };
        vm.endpBody = {
            type: 'raw',
            rawData: '',
            formData: [{ key: '', type: 'string' }],
            xformData: [{ key: '', type: 'string' }]
        };
        vm.endpCopy = angular.copy(vm.endpoint);
        vm.newEndpResp = '200';
        vm.endpActnType = 'create';
        vm.endpSuggestnCofig = {
            key: '_id',
            val: 'name'
        };
        vm.endp.resp; //selected endpoint


        vm.schemesSugg = [{ key: 'http', val: 'HTTP' }, { key: 'https', val: 'HTTPS' }, { key: 'ws', val: 'ws' }, { key: 'wss', val: 'wss' }];
        vm.schemesSuggConfig = { key: 'key', val: 'val' };

        vm.selectFolderForEndp = selectFolderForEndp;
        vm.checkForPathParams = checkForPathParams;
        vm.selectEndp = selectEndp;
        vm.showEndpResp = showEndpResp;
        vm.addEndpResp = addEndpResp;
        vm.removeRespEndp = removeRespEndp;
        vm.createEndp = createEndp;
        vm.addEndpResp = addEndpResp;
        vm.resetEndp = resetEndp;
        vm.setCreateEndp = setCreateEndp;
        vm.deleteEndp = deleteEndp;
        vm.runEndp = runEndp;
        vm.buildRequests = buildRequests;
        vm.addCodeSnip = addCodeSnip;
        vm.toggleSecDef = toggleSecDef;

        function selectFolderForEndp(folderId) {
            vm.endp.folder = folderId;
            vm.flags.endpPageDirty = true;
        }

        function checkForPathParams() {
            var path = vm.endp.path, error = false;
            if (path.indexOf('?') >= 0) {
                toastr.error("Query params can't be added here to the path property. Add them in Query Params section below.")
                vm.endp.path = path.replace(/\?/g, '');
                return;
            }

            var params = [],
                rxp = /{([^}]+)}/g,
                curMatch;

            while (curMatch = rxp.exec(path)) {
                var match = curMatch[1];
                if (match.match(/^[a-z0-9_]+$/i)) {
                    params.push(match);
                } else {
                    error = true;
                }
            }

            if (error) {
                toastr.clear();
                toastr.warning('Path params should be alpha numeric and can only contain underscore (_). There are few in the url those are not. Please correct.');
            }


            var properties = [], existingKeys = [];
            for (var j = 0; j < vm.endp.pathParams._properties.length; j++) {
                var existing = vm.endp.pathParams._properties[j];
                if (existing.disabled) {
                    properties.push(existing);
                    existingKeys.push(key);
                }
            }

            for (var i = 0; i < params.length; i++) {
                var param = params[i];
                if (existingKeys.indexOf(param) >= 0) {
                    continue;
                }
                var obj = JsonSchema.getObjPropertyByKey(vm.endp.pathParams, param);
                if (!obj) {
                    var schema = JsonSchema.newString(param, true);
                    schema._required = true;
                    properties.push(schema);
                } else {
                    properties.push(obj);
                }
            }
            vm.endp.pathParams._properties = properties;
        }

        function formatEndpForRun(rawEndp) {
            var endp = angular.copy(rawEndp);
            var endpBody = {
                type: 'raw',
                rawData: '',
                formData: [{ key: '', type: 'string' }],
                xformData: [{ key: '', type: 'string' }]
            };

            endp.headers = JsonSchema.schema2obj(endp.headers, undefined, undefined, true, vm.SelectedPROJ.models);
            endp.queryParams = JsonSchema.schema2obj(endp.queryParams, undefined, undefined, true, vm.SelectedPROJ.models);
            endp.pathParams = JsonSchema.schema2obj(endp.pathParams, undefined, undefined, true, vm.SelectedPROJ.models);

            for (var i = 0; i < endp.responses.length; i++) {
                endp.responses[i].data = JsonSchema.schema2obj(endp.responses[i].data, undefined, undefined, true, vm.SelectedPROJ.models);
            }

            //load body params
            if (endp.body) {
                endpBody.type = endp.body.type;
                switch (endp.body.type) {
                    case 'raw':
                        endpBody.rawData = JsonSchema.schema2obj(endp.body.data, undefined, undefined, true, vm.SelectedPROJ.models);
                        break;
                    case 'form-data':
                        endpBody.formData = angular.copy(endp.body.data);
                        break;
                    case 'x-www-form-urlencoded':
                        endpBody.xformData = angular.copy(endp.body.data);
                        break;
                }
            }

            if (endp.traits) {
                for (var i = 0; i < rawEndp.traits.length; i++) {
                    importTraitData(rawEndp.traits[i]._id, rawEndp.traits[i].name, endp);
                }
            }
            return endp;

        }

        function selectEndp(endp, action) {
            if ($scope.endpForm.$dirty || vm.flags.endpPageDirty) {
                $confirm({ text: 'Endpoints view has some unsaved data. Do you want to replace it with your current selection?', title: 'Unsaved data', ok: 'Replace', cancel: 'No, I will save it' })
                    .then(function () {
                        inner();
                    }, function () {
                        //selectProject(curProj);
                    });
            } else {
                inner();
            }
            function inner() {
                vm.endpActnType = action; //edit or create
                var preparedEndp = prepareEndp4View(endp, vm.SelectedPROJ.models);
                vm.endp = preparedEndp.endp;
                vm.endpCopy = angular.copy(vm.endp);
                vm.endpBody = preparedEndp.endpBody;
                showEndpResp(0);
                vm.flags.endpPageDirty = false;
                $scope.endpForm.$setPristine();
            }
        }

        function prepareEndp4View(originalEndp, models) {
            var endp = angular.copy(originalEndp);
            var endpBody = {
                type: 'raw',
                rawData: '',
                formData: [{ key: '', type: 'string' }],
                xformData: [{ key: '', type: 'string' }]
            };

            endp.headers = JsonSchema.schema2obj(endp.headers, undefined, undefined, true, models);
            endp.queryParams = JsonSchema.schema2obj(endp.queryParams, undefined, undefined, true, models);
            endp.pathParams = JsonSchema.schema2obj(endp.pathParams, undefined, undefined, true, models);
            for (var i = 0; i < endp.responses.length; i++) {
                endp.responses[i].data = JsonSchema.schema2obj(endp.responses[i].data, undefined, undefined, true, models);
            }

            if (endp.body) {
                endpBody.type = endp.body.type;
                switch (endp.body.type) {
                    case 'raw':
                        endpBody.rawData = JsonSchema.schema2obj(endp.body.data, undefined, undefined, true, models);
                        break;
                    case 'form-data':
                        endpBody.formData = angular.copy(endp.body.data);
                        break;
                    case 'x-www-form-urlencoded':
                        endpBody.xformData = angular.copy(endp.body.data);
                        break;
                }
            }

            if (endp.traits) {
                for (var i = 0; i < endp.traits.length; i++) {
                    importTraitData(endp.traits[i]._id, endp.traits[i].name, endp);
                }
            }

            return { endp: endp, endpBody: endpBody }
        }

        function showEndpResp(index) {
            vm.endp.resp = vm.endp.responses[index];
        }

        function addEndpResp(code, click) {
            if (vm.newEndpResp === '' && code === undefined) {
                toastr.error('Please enter a status code');
                return;
            } else if (vm.newEndpResp === '') {
                vm.newEndpResp = code;
            }
            if (parseInt(vm.newEndpResp) != vm.newEndpResp) {
                toastr.error('The status code should be a number');
                return;
            }
            for (var i = 0; i < vm.endp.responses.length; i++) {
                var resp = vm.endp.responses[i];
                if (resp.code == vm.newEndpResp) {
                    toastr.error('Status code already exists.');
                    return;
                }
            }
            if (click) vm.flags.endpPageDirty = true;
            var code = vm.newEndpResp;
            var resp = {
                data: undefined,
                code: code
            };
            vm.endp.responses.push(resp);
            showEndpResp(vm.endp.responses.length - 1);
            vm.newEndpResp = '';
        }

        addEndpResp();

        function removeRespEndp(index) {
            vm.endp.responses.splice(index, 1);
            vm.flags.endpPageDirty = true;
        }

        function prepareEndp4Save(endp, endpBody, edit) {
            if (!endp.summary || !endp.path)
                return;
            if (endp.path && endp.path.charAt(0) !== '/') {
                endp.path = '/' + endp.path;
            }
            var toSave = angular.copy(endp);
            if (Const.with_body.indexOf(toSave.method.toUpperCase()) >= 0 && endpBody) {
                if (!toSave.body) {
                    toSave.body = {};
                }
                toSave.body.type = endpBody.type;
                if (endpBody.type === 'raw') {
                    toSave.body.data = JsonSchema.obj2schema(endpBody.rawData, vm.SelectedPROJ.models);
                } else if (endpBody.type === 'form-data') {
                    toSave.body.data = endpBody.formData;
                } else if (endpBody.type === 'x-www-form-urlencoded') {
                    toSave.body.data = endpBody.xformData;
                }
            } else {
                delete toSave.body;
            }

            if (edit) {
                if (!toSave._id) {
                    toastr.error('Missing endpoint ID.');
                    return;
                }
                //    vm.SelectedPROJ.endpoints[toSave._id] = toSave;
            } else {
                toSave._id = new Date().getTime() + s8();
                endp._id = toSave._id;
            }
            for (var i = 0; i < endp.traits.length; i++) {
                toSave = removeTraitData(endp.traits[i]._id, toSave);
            }

            toSave.queryParams = JsonSchema.obj2schema(toSave.queryParams, vm.SelectedPROJ.models);
            toSave.headers = JsonSchema.obj2schema(toSave.headers, vm.SelectedPROJ.models);
            toSave.pathParams = JsonSchema.obj2schema(toSave.pathParams, vm.SelectedPROJ.models);
            for (var i = 0; i < toSave.responses.length; i++) {
                toSave.responses[i].data = JsonSchema.obj2schema(toSave.responses[i].data, vm.SelectedPROJ.models);
            }

            return toSave;
        }

        function createEndp(endp, endpBody, edit, allowDuplicate) {
            var dfr = $q.defer();
            var toSave = prepareEndp4Save(endp, endpBody, edit);
            if (!toSave) {
                toastr.error('Please fill in all required fields.'); return;
            }
            if (checkExistingEndp(endp.summary) && !edit && !allowDuplicate) {
                toastr.error('Endpoint ' + endp.summary + ' already exists');
                return;
            }

            if (!vm.SelectedPROJ.endpoints) {
                vm.SelectedPROJ.endpoints = {};
            }
            vm.SelectedPROJ.endpoints[toSave._id] = toSave;
            //while editing current endp, set it in vm.endp
            endp.body = angular.copy(toSave.body);

            updateApiProject(vm.SelectedPROJ).then(function (data) {
                vm.flags.endpPageDirty = false;
                $scope.endpForm.$setPristine();
                if (edit) {
                    toastr.success('Endpoint updated');
                    addEndpToLeftTree(endp, vm.endpCopy.folder ? vm.endpCopy.folder : 'ungrouped');
                } else {
                    //resetTrait();
                    toastr.success('Endpoint created');
                    addEndpToLeftTree(endp, undefined);
                }
                vm.endpActnType = 'edit';
                vm.endpCopy = angular.copy(endp);
                dfr.resolve(endp);
                vm.selectedProjEndps = getEndpoints(vm.SelectedPROJ);
            }, function () {
                toastr.error('Failed to create/update endpoint');
                if (edit) {
                    vm.SelectedPROJ.endpoints[vm.endpCopy._id] = angular.copy(endp);
                } else {
                    delete vm.SelectedPROJ.endpoints[endp._id];
                }
                dfr.reject();
            });

            return dfr.promise;
        }

        function checkExistingEndp(name) {
            if (!name)
                return undefined;
            var foundId;
            if (vm.SelectedPROJ.endpoints) {
                angular.forEach(vm.SelectedPROJ.endpoints, function (t, key) {
                    if (t.summary.toLowerCase() === name.toLowerCase()) {
                        foundId = key;
                    }
                });
            }
            return foundId;
        }

        function resetEndp() {
            vm.endp = {
                _id: undefined,
                operationId: '',
                method: 'get',
                schemes: [],
                path: '',
                folder: '',
                tags: [],
                consumes: [],
                produces: [],
                traits: [],
                summary: '',
                description: '',
                pathParams: undefined,
                queryParams: undefined,
                headers: undefined,
                responses: [],
                prerun: '',
                postrun: '',
                resp: {
                    code: undefined,
                    data: undefined
                },
                body: {
                    type: 'raw',
                    data: ''
                }
            };
            resetEndpBody();
            vm.endpCopy = angular.copy(vm.endp);
            addEndpResp('200');
        }

        function resetEndpBody() {
            vm.endpBody = {
                type: 'raw',
                rawData: '',
                formData: [{ key: '', type: 'string' }],
                xformData: [{ key: '', type: 'string' }]
            };
        }

        $scope.$on('tagAdded', function (e, args) {
            importTraitData(args[vm.endpSuggestnCofig['key']], args[vm.endpSuggestnCofig['val']], vm.endp);
            e.stopPropagation();
        });
        $scope.$on('tagRemoved', function (e, args) {
            removeTraitData(args[vm.endpSuggestnCofig['key']]);
            e.stopPropagation();
        });

        function importTraitData(traitId, name, endp) {
            if (!traitId)
                return;
            var trait = vm.SelectedPROJ.traits[traitId];

            //add responses from trait
            for (var i = 0; i < trait.responses.length; i++) {
                var resp = angular.copy(trait.responses[i]);
                if (!resp.noneStatus) {
                    resp.data = JsonSchema.schema2obj(resp.data, undefined, undefined, true, vm.SelectedPROJ.models);
                    resp.fromTrait = true;
                    resp.traitId = traitId;
                    resp.traitName = name;
                    endp.responses.push(resp);
                }
            }

            //add query params from trait
            var traitPparams = JsonSchema.schema2obj(trait.pathParams, undefined, undefined, undefined, vm.SelectedPROJ.models);
            for (var i = 0; i < traitPparams._properties.length; i++) {
                var qProp = traitPparams._properties[i];
                qProp.disabled = true;
                endp.pathParams._properties.push(qProp);
            }

            //add query params from trait
            var traitQparams = JsonSchema.schema2obj(trait.queryParams, undefined, undefined, undefined, vm.SelectedPROJ.models);
            for (var i = 0; i < traitQparams._properties.length; i++) {
                var qProp = traitQparams._properties[i];
                qProp.disabled = true;
                endp.queryParams._properties.push(qProp);
            }

            //add headers from trait
            var traitHeaders = JsonSchema.schema2obj(trait.headers, undefined, undefined, undefined, vm.SelectedPROJ.models);
            for (var i = 0; i < traitHeaders._properties.length; i++) {
                var hProp = traitHeaders._properties[i];
                hProp.disabled = true;
                endp.headers._properties.push(hProp);
            }
            return endp;
        }

        function removeTraitData(traitId, endpoint) {
            if (!traitId)
                return;
            if (!endpoint) {
                //if endpoint is provided then remove from that otherwise remove from vm.endp (selected endpoint)
                endpoint = vm.endp;
            }

            // remove responses from endpoint belonging to this trait
            for (var i = 0; i < endpoint.responses.length; i++) {
                if (endpoint.responses[i].traitId === traitId) {
                    endpoint.responses.splice(i, 1);
                    i--;
                }
            }

            var trait = vm.SelectedPROJ.traits[traitId];

            var traitPparams = JsonSchema.schema2obj(trait.pathParams, undefined, undefined, undefined, vm.SelectedPROJ.models);
            for (var j = 0; j < traitPparams._properties.length; j++) {
                var paramToRemove = traitPparams._properties[j];
                if (typeof paramToRemove === 'object') {
                    for (var k = 0; k < endpoint.pathParams._properties.length; k++) {
                        var param = endpoint.pathParams._properties[k];
                        if (param._key === paramToRemove._key && param.disabled) {
                            endpoint.pathParams._properties.splice(k, 1);
                        }
                    }
                }
            }

            var traitQparams = JsonSchema.schema2obj(trait.queryParams, undefined, undefined, undefined, vm.SelectedPROJ.models);
            for (var j = 0; j < traitQparams._properties.length; j++) {
                var paramToRemove = traitQparams._properties[j];
                if (typeof paramToRemove === 'object') {
                    for (var k = 0; k < endpoint.queryParams._properties.length; k++) {
                        var param = endpoint.queryParams._properties[k];
                        if (param._key === paramToRemove._key && param.disabled) {
                            endpoint.queryParams._properties.splice(k, 1);
                        }
                    }
                }
            }

            var traitHeaders = JsonSchema.schema2obj(trait.headers, undefined, undefined, undefined, vm.SelectedPROJ.models);
            for (var j = 0; j < traitHeaders._properties.length; j++) {
                var paramToRemove = traitHeaders._properties[j];
                if (typeof paramToRemove === 'object') {
                    for (var k = 0; k < endpoint.headers._properties.length; k++) {
                        var param = endpoint.headers._properties[k];
                        if (param._key === paramToRemove._key && param.disabled) {
                            endpoint.headers._properties.splice(k, 1);
                        }
                    }
                }
            }

            return endpoint;
        }

        function setCreateEndp() {
            if ($scope.endpForm.$dirty || vm.flags.endpPageDirty) {
                $confirm({ text: 'Endpoints view has some unsaved data. Do you want to reset it?', title: 'Unsaved data', ok: 'Reset', cancel: 'No, I will save it' })
                    .then(function () {
                        inner();
                    }, function () {
                        //selectProject(curProj);
                    });
            } else {
                inner();
            }
            function inner() {
                vm.flags.endpPageDirty = false;
                $scope.endpForm.$setPristine();
                vm.endpActnType = 'create';
                resetEndp();
            }
        }

        function deleteEndp(id) {
            if (!id || !vm.SelectedPROJ.endpoints)
                return;
            var t = vm.SelectedPROJ.endpoints[id];
            delete vm.SelectedPROJ.endpoints[id];

            updateApiProject(vm.SelectedPROJ).then(function () {
                toastr.success('Endpoint deleted');
                if (vm.endp && vm.endp._id === id) {
                    vm.flags.endpPageDirty = false;
                    $scope.endpForm.$setPristine();
                    setCreateEndp();
                    vm.designStage = 'dashboard';
                }
                removeEndpFromLeftTree(t._id, t.folder);
            }, function () {
                toastr.error('Failed to delete endpoint');
                vm.SelectedPROJ.endpoints[id] = t;
            });
        }

        function runEndp(endp) {
            if (vm.SelectedPROJ.setting && vm.SelectedPROJ.setting.host) {
                $state.go('apic.home');
                $timeout(function () {
                    var runObj = prepareEndpForRun(endp);
                    console.log(runObj);
                    $rootScope.$broadcast('LoadFromSave', runObj);
                });
            } else {
                toastr.warning('This project doesn\'t have the host name set. Please move to the project\'s home and set it under settings');
            }
        }

        function prepareEndpForRun(endp, modelRefs, autoSave) {
            if (!modelRefs) modelRefs = JsonSchema.getModeldefinitions(vm.SelectedPROJ.models);
            return DataBuilder.endpointToReqTab(endp, vm.SelectedPROJ, autoSave, modelRefs);
        }

        function buildRequests(retry) {
            if (retry > 10) {
                toastr.error('Failed to build requests');
                return;
            }
            var reqs = [], subFolders = {};
            if (vm.SelectedPROJ.setting && vm.SelectedPROJ.setting.host) {
                //create the main project folder
                var folder = {
                    name: 'Project: ' + vm.SelectedPROJ.title,
                    desc: vm.SelectedPROJ.description,
                    projId: vm.SelectedPROJ._id
                };
                if (retry)
                    folder.name = folder.name + '(' + apic.randomStr(4) + ')';
                lMenuService.validateAndCreateFolder(folder).then(function (parentFolder) {
                    //create model ref to resolve $refs
                    var modelRefs = JsonSchema.getModeldefinitions(vm.SelectedPROJ.models);

                    //create remaining folders and requests
                    angular.forEach(vm.SelectedPROJ.endpoints, function (endp) {
                        //if it belongs to a folder and its not already created then create it
                        if (endp.folder && !subFolders[endp.folder]) {
                            var f = vm.SelectedPROJ.folders[endp.folder];
                            var subFolder = {
                                name: f.name,
                                desc: f.desc,
                                projId: f._id,
                                parentId: parentFolder._id,
                                _id: new Date().getTime() + Math.random().toString(16).substring(2)
                            };
                            subFolders[f._id] = subFolder;
                            lMenuService.validateAndCreateFolder(subFolder).then(function (data) {
                                console.log('Folder created:' + data.name);
                            });
                        }
                        //add api requests
                        //TODO: WTF. Create separate logic for parsing(converting json schema to object notation) of endpoint
                        // and use the same one here and in selectEndp() function
                        selectEndp(endp, 'edit');
                        var runObj = prepareEndpForRun(vm.endp, modelRefs, true);

                        runObj._parent = subFolders[endp.folder] ? subFolders[endp.folder]._id : parentFolder._id;
                        reqs.push(runObj);

                    });
                    lMenuService.upsertReq(reqs).then(function () {
                        toastr.success('Folder "' + parentFolder.name + '" created. Navigate to Test panel to see the requests.');
                        $rootScope.$emit('refreshLeftMenu');
                    }, function (e) {
                        toastr.error('Failed to build requests.');
                    });




                }, function (err) {
                    if (err === 'Folder already exists.') {
                        if (!retry) {
                            $confirm({ text: 'A folder with name "' + folder.name + '" already exists. Do you want to build it with a different name?', title: 'Project folder already exists', ok: 'Build again', cancel: 'Cancel' })
                                .then(function () {
                                    buildRequests(1);
                                }, function () {
                                    toastr.warning('Build cancelled.');
                                });
                        } else {
                            buildRequests(++retry);
                        }
                    } else {
                        toastr.error(err);
                    }
                });
                return;
            } else {
                toastr.warning('This project doesn\'t have the host name set. Please move to the project\'s home and set it under settings');
            }
        }

        function addCodeSnip(snip) {
            var editType = vm.flags.scriptType;
            vm.endp[editType] += (vm.endp[editType] ? '\n' : '');
            if (snip.hasOwnProperty('params')) {
                vm.endp[editType] += snip.code.replace('<<assert>>', Utils.assertBuilder.apply(null, snip.params));
            } else {
                vm.endp[editType] += snip.code;
            }
        }

        function toggleSecDef() {
            if (vm.endp.security) delete vm.endp.security;
            else {
                vm.endp.security = [];
            }
        }

        function saveBuilderTests(tests, save) {
            vm.scriptType = 'PostRun';
            $timeout(function () {
                vm.endp.postrun += '\n' + tests;
                if (save) {
                    vm.createEndp(vm.endp, vm.endpBody, vm.endpActnType === 'edit' ? true : false);
                } else {
                    toastr.info('Test added to postrun scripts.')
                }
            });
        }

        /******************************************/
        /************* Traits page **************/
        /******************************************/

        vm.traitsPans = {
            query: false,
            header: false,
            resp: false
        };
        vm.trait = {
            _id: undefined,
            name: '',
            summary: '',
            folder: '',
            queryParams: undefined,
            headers: undefined,
            pathParams: undefined,
            responses: [],
            resp: {
                code: undefined,
                data: undefined,
                desc: ''
            }
        };
        vm.traitCopy = angular.copy(vm.trait);
        vm.newTraitResp = '200';
        vm.traitActnType = 'create';

        vm.selectFolderForTrait = selectFolderForTrait;
        vm.selectTrait = selectTrait;
        vm.showTraitResp = showTraitResp;
        vm.addTraitResp = addTraitResp;
        vm.removeRespTrait = removeRespTrait;
        vm.focusRespEditInp = focusRespEditInp;
        vm.createTrait = createTrait;
        vm.resetTrait = resetTrait;
        vm.setCreateTrait = setCreateTrait;
        vm.deleteTrait = deleteTrait;

        function selectFolderForTrait(folderId) {
            vm.trait.folder = folderId;
            vm.flags.traitPageDirty = true;
        }

        function selectTrait(trait, action) {
            if ($scope.traitForm.$dirty || vm.flags.traitPageDirty) {
                $confirm({ text: 'Traits view has some unsaved data. Do you want to replace it with your current selection?', title: 'Unsaved data', ok: 'Replace', cancel: 'No, I will save it' })
                    .then(function () {
                        inner();
                    }, function () {
                        //selectProject(curProj);
                    });
            } else {
                inner();
            }

            function inner() {
                $scope.traitForm.$setPristine();
                vm.flags.traitPageDirty = false;
                vm.traitActnType = action;
                vm.trait = angular.copy(trait);
                vm.trait.headers = JsonSchema.schema2obj(vm.trait.headers, undefined, undefined, true, vm.SelectedPROJ.models);
                vm.trait.queryParams = JsonSchema.schema2obj(vm.trait.queryParams, undefined, undefined, true, vm.SelectedPROJ.models);
                vm.trait.pathParams = JsonSchema.schema2obj(vm.trait.pathParams, undefined, undefined, true, vm.SelectedPROJ.models);
                if (vm.trait.responses) {
                    for (var i = 0; i < vm.trait.responses.length; i++) {
                        vm.trait.responses[i].data = JsonSchema.schema2obj(vm.trait.responses[i].data, undefined, undefined, true, vm.SelectedPROJ.models);
                    }
                }
                vm.traitCopy = angular.copy(trait);
                showTraitResp(0);
            }
        }

        function showTraitResp(index) {
            vm.trait.resp = vm.trait.responses[index];
        }

        function addTraitResp(code, click) {
            if (vm.newTraitResp === '' && code === undefined) {
                toastr.error('Please enter a status code');
                return;
            } else if (vm.newTraitResp === '') {
                vm.newTraitResp = code;
            }

            var noneStatus = false;
            if (parseInt(vm.newTraitResp) != vm.newTraitResp) {
                noneStatus = true;
            }
            for (var i = 0; i < vm.trait.responses.length; i++) {
                var resp = vm.trait.responses[i];
                if (resp.code == vm.newTraitResp) {
                    toastr.error('Status code already exists.');
                    return;
                }
            }
            if (click) vm.flags.traitPageDirty = true;

            var code = vm.newTraitResp;
            var resp = {
                data: undefined,
                code: code,
                noneStatus: noneStatus
            };
            vm.trait.responses.push(resp);
            showTraitResp(vm.trait.responses.length - 1);
            vm.newTraitResp = '';
        }

        function removeRespTrait(index) {
            vm.trait.responses.splice(index, 1);
            vm.flags.traitPageDirty = true;
        }

        function focusRespEditInp(event) {
            var ele = event.currentTarget;
            $timeout(function () {
                angular.element(ele).parents('.resp-code').find('.resp-code-inp').focus();
            });
        }

        function createTrait(edit) {
            if (!vm.trait.name)
                return;
            if (checkExistingTrait(vm.trait.name) && !edit) {
                toastr.error('Trait ' + vm.trait.name + ' already exists');
                return;
            }
            var toSave = {
                _id: vm.trait._id,
                name: vm.trait.name,
                folder: vm.trait.folder,
                summary: vm.trait.summary,
                queryParams: JsonSchema.obj2schema(vm.trait.queryParams, vm.SelectedPROJ.models),
                headers: JsonSchema.obj2schema(vm.trait.headers, vm.SelectedPROJ.models),
                pathParams: JsonSchema.obj2schema(vm.trait.pathParams, vm.SelectedPROJ.models),
                responses: []
            };
            for (var i = 0; i < vm.trait.responses.length; i++) {
                var resp = {
                    code: vm.trait.responses[i].code,
                    data: JsonSchema.obj2schema(vm.trait.responses[i].data, vm.SelectedPROJ.models),
                    desc: vm.trait.responses[i].desc,
                    noneStatus: vm.trait.responses[i].noneStatus
                };
                toSave.responses.push(resp);
            }

            if (!vm.SelectedPROJ.traits) {
                vm.SelectedPROJ.traits = {};
            }
            if (edit) {
                if (!toSave._id) {
                    toastr.error('Missing trait ID.');
                    return;
                }
                vm.SelectedPROJ.traits[toSave._id] = toSave;
            } else {
                toSave._id = new Date().getTime() + s8();
                vm.trait._id = toSave._id;
                vm.SelectedPROJ.traits[toSave._id] = toSave;
            }
            updateApiProject(vm.SelectedPROJ).then(function (data) {
                $scope.traitForm.$setPristine();
                vm.flags.traitPageDirty = false;
                if (edit) {
                    toastr.success('Trait updated');
                    addTraitsToLeftTree(vm.trait, vm.traitCopy.folder ? vm.traitCopy.folder : 'ungrouped');
                } else {
                    //resetTrait();
                    toastr.success('Trait created');
                    addTraitsToLeftTree(vm.trait, undefined);
                }
                vm.traitActnType = 'edit';
                vm.traitCopy = angular.copy(vm.trait);
            }, function () {
                toastr.error('Failed to create/update trait');
                if (edit) {
                    vm.SelectedPROJ.traits[vm.traitCopy._id] = angular.copy(vm.trait);
                } else {
                    delete vm.SelectedPROJ.traits[vm.trait._id];
                }
            });
        }

        function resetTrait() {
            $scope.traitForm.$setPristine();
            vm.flags.traitPageDirty = false;
            vm.trait = {
                _id: undefined,
                name: '',
                summary: '',
                queryParams: undefined,
                headers: undefined,
                responses: [],
                resp: {
                    code: undefined,
                    data: undefined
                }
            };
            vm.traitCopy = angular.copy(vm.trait);
            addTraitResp('200');
        }

        function checkExistingTrait(name) {
            if (!name)
                return undefined;
            var foundId;
            if (vm.SelectedPROJ.traits) {
                angular.forEach(vm.SelectedPROJ.traits, function (t, key) {
                    if (t.name.toLowerCase() === name.toLowerCase()) {
                        foundId = key;
                    }
                });
            }
            return foundId;
        }

        function setCreateTrait() {
            if ($scope.traitForm.$dirty || vm.flags.traitPageDirty) {
                $confirm({ text: 'Traits view has some unsaved data. Do you want to reset it?', title: 'Unsaved data', ok: 'Reset', cancel: 'No, I will save it' })
                    .then(function () {
                        inner();
                    }, function () {
                        //selectProject(curProj);
                    });
            } else {
                inner();
            }

            function inner() {
                vm.traitActnType = 'create';
                resetTrait();
            }
        }
        addTraitResp();

        function deleteTrait(id) {
            if (!id || !vm.SelectedPROJ.traits)
                return;
            var t = vm.SelectedPROJ.traits[id];
            delete vm.SelectedPROJ.traits[id];

            //detete trait from endpoints where its used
            //TODO: of trait named response #/responses is used in endp, show error while derefing, in service.js
            angular.forEach(vm.SelectedPROJ.endpoints, function (endp) {
                if (endp && endp.traits && endp.traits.length > 0) {
                    endp.traits = endp.traits.filter(function (t) {
                        return t._id != id;
                    })
                }
            })

            updateApiProject(vm.SelectedPROJ).then(function () {
                $scope.traitForm.$setPristine();
                vm.flags.traitPageDirty = false;
                toastr.success('Trait deleted');
                if (vm.trait && vm.trait._id === id) {
                    setCreateTrait();
                    vm.designStage = 'dashboard';
                }
                removeTraitFromLeftTree(t._id, t.folder);
            }, function () {
                toastr.error('Failed to delete trait');
                vm.SelectedPROJ.traits[id] = t;
            });
        }

        //Left menu related code;
        vm.leftTree = {};
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
            } else if (prevFolder) { //if only prev folder id exists but teh folder is not in the left tree (folder was deleted recently)
                delete vm.leftTree.ungrouped.models[model._id];
            }
            var modelX = {
                _id: model._id,
                name: model.name
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
            } else if (prevFolder) { //if only prev folder id exists but the folder is not in the left tree (folder was deleted recently)
                delete vm.leftTree.ungrouped.traits[trait._id];
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
            } else if (prevFolder) { //if only prev folder id exists but teh folder is not in the left tree (folder was deleted recently)
                delete vm.leftTree.ungrouped.endps[endp._id];
            }
            var endpX = {
                _id: endp._id,
                name: endp.summary,
                method: endp.method
            };
            if (vm.leftTree[endp.folder]) {
                vm.leftTree[endp.folder].endps[endp._id] = endpX;
            } else {
                vm.leftTree.ungrouped.endps[endp._id] = endpX;
            }
        }

        function removeModelFromLeftTree(modelId, folderId) {
            if (!folderId)
                folderId = 'ungrouped';
            if (vm.leftTree[folderId]) {
                delete vm.leftTree[folderId].models[modelId];
            }
        }

        function removeTraitFromLeftTree(traitId, folderId) {
            if (!folderId)
                folderId = 'ungrouped';
            if (vm.leftTree[folderId]) {
                delete vm.leftTree[folderId].traits[traitId];
            }
        }

        function removeEndpFromLeftTree(endpId, folderId) {
            if (!folderId)
                folderId = 'ungrouped';
            if (vm.leftTree[folderId]) {
                delete vm.leftTree[folderId].endps[endpId];
            }
        }

        function removeFolderFromLeftTree(folderId) {
            if (vm.leftTree[folderId]) {
                angular.merge(vm.leftTree.ungrouped.endps, vm.leftTree[folderId].endps);
                angular.merge(vm.leftTree.ungrouped.models, vm.leftTree[folderId].models);
                angular.merge(vm.leftTree.ungrouped.traits, vm.leftTree[folderId].traits);
            }
            delete vm.leftTree[folderId];
        }

        function duplicateEndp(endp) {
            var toCopy = angular.copy(vm.SelectedPROJ.endpoints[endp._id]);
            toCopy._id = s12();
            while (checkExistingEndp(toCopy.summary)) {
                var counter = parseInt(toCopy.summary.charAt(toCopy.summary.length - 1));
                var numberAtEnd = true;
                if (isNaN(counter)) {
                    counter = 0;
                    numberAtEnd = false;
                }
                counter++
                toCopy.summary = (numberAtEnd ? toCopy.summary.substring(0, toCopy.summary.length - 1) : toCopy.summary).trim() + ' ' + counter;
            }
            vm.SelectedPROJ.endpoints[toCopy._id] = toCopy;
            updateApiProject(vm.SelectedPROJ).then(function () {
                toastr.success('Duplicate Endpoint ' + toCopy.summary + ' created.');
                addEndpToLeftTree(angular.copy(toCopy), toCopy.folder ? toCopy.folder : 'ungrouped');
            });
        }

        function duplicateModel(model) {
            var toCopy = angular.copy(vm.SelectedPROJ.models[model._id]);
            toCopy._id = s12();
            while (checkExistingModel(toCopy.name)) {
                var counter = parseInt(toCopy.name.charAt(toCopy.name.length - 1));
                var numberAtEnd = true;
                if (isNaN(counter)) {
                    counter = 0;
                    numberAtEnd = false;
                }
                counter++
                toCopy.name = (numberAtEnd ? toCopy.name.substring(0, toCopy.name.length - 1) : toCopy.name).trim() + ' ' + counter;
                toCopy.nameSpace = (numberAtEnd ? toCopy.nameSpace.substring(0, toCopy.nameSpace.length - 1) : toCopy.nameSpace).trim() + ' ' + counter;
            }
            vm.SelectedPROJ.models[toCopy._id] = toCopy;
            updateApiProject(vm.SelectedPROJ).then(function () {
                toastr.success('Duplicate Model ' + toCopy.name + ' created.');
                addModelToLeftTree(angular.copy(toCopy), toCopy.folder ? toCopy.folder : 'ungrouped');
            });
        }

        function duplicateTrait(trait) {
            var toCopy = angular.copy(vm.SelectedPROJ.traits[trait._id]);
            toCopy._id = s12();
            while (checkExistingTrait(toCopy.name)) {
                var counter = parseInt(toCopy.name.charAt(toCopy.name.length - 1));
                var numberAtEnd = true;
                if (isNaN(counter)) {
                    counter = 0;
                    numberAtEnd = false;
                }
                counter++
                toCopy.name = (numberAtEnd ? toCopy.name.substring(0, toCopy.name.length - 1) : toCopy.name).trim() + ' ' + counter;
            }
            vm.SelectedPROJ.traits[toCopy._id] = toCopy;
            updateApiProject(vm.SelectedPROJ).then(function () {
                toastr.success('Duplicate Trait ' + toCopy.name + ' created.');
                addTraitsToLeftTree(angular.copy(toCopy), toCopy.folder ? toCopy.folder : 'ungrouped');
            });
        }

        function confirmExit() {
            switch (vm.designStage) {
                case 'folders':
                    if ($scope.folderForm.$dirty) {
                        return confirm('Discard unsaved data?');
                    }
                    break;
            }
        }

        function jsonToYaml(json) {
            // ace.edit('designer-export').getSession().setMode('ace/mode/yaml')
            return jsyaml.safeDump(json, { skipInvalid: true })
        }
        function jsonToString(json) {
            // ace.edit('designer-export').getSession().setMode('ace/mode/json')
            return JSON.stringify(json, null, '    ');
        }

        function addSecDef() {
            vm.securityDefs.push(angular.copy(secDefModel));
        }

        function saveSecDef(securityDefs) {
            //TODO: Handle already selected secdefs in endpoint
            var prevSecDef = vm.SelectedPROJ.securityDefinitions;
            vm.SelectedPROJ.securityDefinitions = angular.copy(securityDefs);
            updateApiProject(vm.SelectedPROJ).then(function () {
                toastr.success('Security definitions Saved');
            }, function () {
                toastr.error('Failed to save Security definitions.');
                vm.SelectedPROJ.securityDefinitions = prevSecDef;
            });
        }

        function secDefTypeChange(def) {
            switch (def.type) {
                case 'basic':
                    delete def.apiKey;
                    delete def.oauth2;
                    break;
                case 'apiKey':
                    def.apiKey = {
                        in: 'header',
                        name: ''
                    }
                    delete def.oauth2;
                    break;
                case 'oauth2':
                    def.oauth2 = {
                        flow: '',
                        authorizationUrl: '',
                        tokenUrl: '',
                        scopes: [{ key: '', val: '' }]
                    }
                    delete def.apikey;
                    break;
            }
        }
    }
})();