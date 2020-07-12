(function () {
    'use strict';
    angular.module('app.home')
        .controller('leftMenuCtrl', LeftMenuCtrl);

    LeftMenuCtrl.$inject = ['$scope', '$timeout', '$rootScope', 'HistoryServ', 'DataBuilder', 'toastr', '$uibModal', 'Utils', '$filter', '$q', 'FileSystem', 'Validator', 'lMenuService', 'DesignerServ'];
    function LeftMenuCtrl($scope, $timeout, $rootScope, HistoryServ, DataBuilder, toastr, $uibModal, Utils, $filter, $q, FileSystem, Validator, lMenuService, DesignerServ) {
        var vm = this;
        vm.search = '';
        vm.activeTab = 2;
        vm.historyUrls = {};
        vm.clearHistory = clearHistory;
        vm.deleteFromHistory = deleteFromHistory;
        vm.loadFromHistory = loadFromHistory;
        vm.loadFromSave = loadFromSave;
        vm.openFolderTab = openFolderTab;
        vm.updateHistoryView = updateHistoryView;
        vm.clearHistorySearch = clearHistorySearch;
        vm.exportHistory = exportHistory;
        vm.importHistory = importHistory;
        vm.tabChanged = tabChanged;
        vm.flags = {
            projReqs: true,
            savedReqs: true,
            historyCount: 0,
            showHistWarn: true,
            hSrch: false
        }
        init();

        function init() {
            getUrlsHistory();
            getAllFolders();
            getAllProjs();
            loadTabValue();
            getProjectReqsTree();
        }

        function getUrlsHistory() {
            HistoryServ.getAll('dated').then(function (data) {
                vm.historyUrls = angular.copy(data);
                updateHistoryView();
                //$('#historySearch').trigger('change');
            }, function () {
                toastr.error('Failed to read history');
            });
        }

        function clearHistory() {
            HistoryServ.clear().then(function (status) {
                if (status) {
                    vm.historyUrls = {};
                    updateHistoryView();
                }
            }, function () {
                toastr.error('Failed to clear history');
            });
        }

        function deleteFromHistory(id, date, e) {
            e.stopPropagation();
            HistoryServ.deleteItem(id, date).then(function (data) {
                if (data && vm.historyUrls[data.date]) {
                    for (var i = 0; i < vm.historyUrls[data.date].length; i++) {
                        if (vm.historyUrls[data.date][i]._id === id) {
                            vm.historyUrls[data.date].splice(i, 1);
                            updateHistoryView();
                        }
                    }
                }
            }, function () {
                toastr.error('Failed to delete');
            });
        }

        function loadFromHistory(entry) {
            //var scope = angular.element('.right-cont .tab-pane.active div.tab-controller[ng-controller]').scope()
            $rootScope.$broadcast('LoadFromHistory', angular.copy(entry));
        }
        function loadFromSave(entry) {
            $rootScope.$broadcast('LoadFromSave', angular.copy(entry));
        }

        function openFolderTab(folder) {
            $rootScope.$broadcast('OpenFolderTab', angular.copy(folder));
        }

        $rootScope.$on('SaveInHistory', function (e, arg) {
            var date = HistoryServ.formatDate(new Date().getTime()),
                todaysReq = vm.historyUrls[date],
                reqExistsAt = -1,
                action = 'add';

            var req = HistoryServ.formatRequestForSave(arg);
            if (todaysReq && todaysReq.length > 0) {
                for (var i = 0; i < todaysReq.length; i++) {
                    req._id = todaysReq[i]._id;
                    req._time = todaysReq[i]._time;
                    req._modified = todaysReq[i]._modified;
                    if (angular.equals(req, todaysReq[i])) {
                        reqExistsAt = i;
                        break;
                    }
                }
            }
            if (reqExistsAt !== -1) {
                //request exists in todays history
                action = 'update';
            }

            HistoryServ.saveReq(req, action).then(function (saved) {
                if (vm.historyUrls[date]) {
                    if (action === 'add') {
                        vm.historyUrls[date].unshift(saved);
                    } else {
                        vm.historyUrls[date][reqExistsAt] = saved;
                    }
                    updateHistoryView();
                } else {
                    getUrlsHistory();
                }
                HistoryServ.checkHistoryStack().then(count => {
                    vm.flags.historyCount = count;
                })
            }, function () {
                toastr.error('Failed to save');
            });
        });

        function updateHistoryView() {
            vm.filteredHistory = $filter('objFilterOfArray')(vm.historyUrls, vm.search, 'url');
        }

        function clearHistorySearch() {
            vm.search = '';
            vm.flags.hSrch = false;
            updateHistoryView();
        }

        function exportHistory() {
            var data = {
                TYPE: 'History',
                value: vm.historyUrls
            };
            FileSystem.download('RequestHistory.apic.json', JSON.stringify(data, null, '\t'));
        }

        function importHistory() {
            FileSystem.readFile().then(function (file) {
                var data = null;
                try {
                    data = JSON.parse(file.data);
                } catch (e) {
                    toastr.error('Import failed. Invalid file format');
                }
                if (!data)
                    return;

                if (data.TYPE === 'History') {
                    if (Validator.history(data) === true) {
                        var history = [];
                        Object.keys(data.value).forEach(function (date) {
                            var ts = Date.now();
                            history = history.concat(data.value[date].map(function (h) {
                                h._id = ts + '-' + Math.random().toString(16).substring(2);
                                return h;
                            }));
                        })
                        HistoryServ.saveReq(history).then(function (stat) {
                            if (stat) {
                                toastr.success('Import Complete.');
                                getUrlsHistory();
                            } else {
                                toastr.error('Import failed.');
                            }
                        }, function () {
                            toastr.error('Import failed.');
                        })
                    } else {
                        toastr.error('Selected file doesn\'t contain valid request history.');
                    }
                } else {
                    toastr.error('Selected file doesn\'t contain valid request history.');
                }
            });
        }

        function loadTabValue() {
            Utils.storage.get(['leftTab']).then(function (data) {
                if (data.leftTab) {
                    vm.activeTab = parseInt(data.leftTab);
                }
            });
        };

        function tabChanged(index) {
            Utils.storage.set('leftTab', index);
        }

        /**************************************/
        /************* Saved tab **************/
        /**************************************/
        vm.newFolder = {
            show: false,
            name: '',
            desc: '',
            parentId: undefined
        };
        vm.Folders = [];
        vm.AllReqs = {};
        vm.reqSearch = {
            show: false,
            model: ''
        };
        vm.importFolderData = {
            folders: [],
            reqs: []
        };

        vm.showReqSearch = showReqSearch;
        vm.hideReqSearch = hideReqSearch;
        vm.createFolder = createFolder;
        vm.getAllFolders = getAllFolders;
        vm.editFolder = editFolder;
        vm.saveFolderEdit = saveFolderEdit;
        vm.importFolder = importFolder;

        function showReqSearch() {
            vm.reqSearch.show = true;
            $rootScope.focus('#reqSearchInput');
        }

        function hideReqSearch() {
            vm.reqSearch.model = '';
            vm.reqSearch.show = false;
        }

        function createFolder() {
            var newFolder = angular.copy(vm.newFolder)
            if (newFolder.parentId === undefined) {
                toastr.error('Please select a parent folder.');
                return;
            }
            if (newFolder.parentId === 'root' || !newFolder.parentId) {
                newFolder.parentId = null;
            }
            if ($rootScope.userData && $rootScope.userData.UID) {
                newFolder.owner = $rootScope.userData.UID;
            }
            lMenuService.validateAndCreateFolder(newFolder).then(function () {
                toastr.success('Folder "' + newFolder.name + '" created');
                vm.newFolder = {
                    show: false,
                    name: '',
                    desc: '',
                    parentId: undefined
                };
                getAllFolders();
            }, function (msg) {
                toastr.error(msg);
                $rootScope.focus('#newFolderName');
            });
        }

        function getAllFolders() {
            lMenuService.getFolderTree().then(function (data) {
                vm.AllReqs = data.reqs;
                var expMap = {};
                for (var i = 0; i < vm.Folders.length; i++) {
                    expMap[vm.Folders[i]._id] = vm.Folders[i].expand;
                    if (vm.Folders[i].children) {
                        for (var j = 0; j < vm.Folders[i].children.length; j++) {
                            expMap[vm.Folders[i].children[j]._id] = vm.Folders[i].children[j].expand;
                        }
                    }
                }
                //console.log('tree',vm.Folders, expMap);
                vm.Folders = data.tree;
                for (var i = 0; i < vm.Folders.length; i++) {
                    vm.Folders[i].expand = expMap[vm.Folders[i]._id];
                    if (vm.Folders[i].children) {
                        for (var j = 0; j < vm.Folders[i].children.length; j++) {
                            vm.Folders[i].children[j].expand = expMap[vm.Folders[i].children[j]._id];
                        }
                    }
                }
            }, function (err) {
                toastr.error(err);
            });
        }

        function getProjectReqsTree() {
            return DesignerServ.getApiProjs().then(function (data) {
                vm.ProjectsTree = [];
                if (data) {
                    data.forEach(function (proj) {
                        vm.ProjectsTree.push(formatProject4LeftTree(proj));
                    });
                }
                return vm.ProjectsTree;
            }, function () {
                toastr.error('Failed to read API Projects');
            });
        }

        function getProjectReqs(projId) {
            return DesignerServ.getAPIProjectById(projId).then(function (proj) {
                return formatProject4LeftTree(proj);
            }, function () {
                toastr.error('Failed to read API Project: ' + projId);
            });
        }

        function formatProject4LeftTree(proj) {
            var foldersObj = {};
            var project = {
                name: proj.title,
                children: [],
                desc: '',
                parentId: null,
                requests: [],
                _created: proj._created,
                _id: proj._id,
                _modified: proj._modified
            };
            foldersObj[project._id] = project;
            var subfolders = [];

            if (proj.folders) {
                subfolders = Object.keys(proj.folders);
            }
            if (subfolders.length > 0) {
                subfolders.forEach(function (folderKey) {
                    var f = proj.folders[folderKey];
                    var subFolder = {
                        name: f.name,
                        children: [],
                        desc: f.desc,
                        parentId: project._id,
                        requests: [],
                        _created: proj._created,
                        _id: f._id,
                        _modified: proj._modified
                    }
                    foldersObj[subFolder._id] = subFolder;
                    project.children.push(subFolder);
                })
            }
            //format endpoints
            angular.forEach(proj.endpoints, function (endpoint) {
                var formattedEndp = DesignerServ.formatEndpForRun(endpoint, proj);
                var runObj = DataBuilder.endpointToReqTab(formattedEndp, proj, true);
                runObj.fromProject = {
                    projId: project._id,
                    endpId: endpoint._id
                };
                if (endpoint.folder && foldersObj[endpoint.folder]) {
                    foldersObj[endpoint.folder].requests.push(runObj);
                } else {
                    project.requests.push(runObj);
                }
            })
            return project;
        }

        function editFolder(folder) {
            folder.edit = true;
            $timeout(function () {
                angular.element('#folder_' + folder._id).focus();
            });
        }

        function saveFolderEdit(folder, e) {
            if (e.keyCode === 13) {
                folder._modified = new Date().getTime();
                lMenuService.updateFolder(folder).then(function () {
                    toastr.success('Folder renamed.');
                    folder.edit = false;
                });
            }
        }

        function importFolder() {
            FileSystem.readFile().then(function (file) {
                var data = null;
                try {
                    data = JSON.parse(file.data);
                } catch (e) {
                    toastr.error('Import failed. Invalid file format');
                }
                if (!data)
                    return;

                if (data.TYPE === 'Folder') {
                    if (Validator.testFolder(data) === true) {
                        vm.importFolderData = {
                            folders: [],
                            reqs: []
                        };
                        addImportedFolder(data.value, true);
                        lMenuService.createFolders(vm.importFolderData.folders).then(function () {
                            lMenuService.upsertReq(vm.importFolderData.reqs).then(function () {
                                toastr.success('Import Complete.');
                                getAllFolders();
                            });
                        }, function () {
                            toastr.error('Failed to import');
                        });
                    } else {
                        toastr.error('Selected file doesn\'t contain valid Folder information');
                    }
                } else {
                    toastr.error('Selected file doesn\'t contain valid Folder information');
                }
            });
        }
        function addImportedFolder(folder, isParent) {
            var time = new Date().getTime();
            var folderToAdd = {
                _id: time + '-' + s12(),
                _created: time,
                _modified: time,
                name: folder.name,
                desc: folder.desc,
                parentId: isParent ? null : folder.parentId
            };
            if ($rootScope.userData && $rootScope.userData.UID) {
                folderToAdd.owner = $rootScope.userData.UID;
            }
            vm.importFolderData.folders.push(folderToAdd);
            if (folder.children && folder.children.length > 0) {
                for (var i = 0; i < folder.children.length; i++) {
                    folder.children[i].parentId = folderToAdd._id;
                    addImportedFolder(folder.children[i]);
                }
            }
            if (folder.requests && folder.requests.length > 0) {
                for (var i = 0; i < folder.requests.length; i++) {
                    var req = folder.requests[i];
                    req._id = time + '-' + s12() + s4();
                    req._time = time;
                    req._parent = folderToAdd._id;
                    addReq(req);
                }
            }
        }

        function addReq(req) {
            var reqToAdd;
            if (['Stomp', 'Websocket'].indexOf(req.method) >= 0) {
                reqToAdd = {
                    _id: req._id,
                    _time: req._time,
                    _modified: req._time,
                    url: req.url,
                    method: req.method,
                    name: req.name,
                    description: req.description,
                    _parent: req._parent,
                    type: req.type,
                    connection: req.connection,
                    destQ: req.destQ

                };
            } else {
                reqToAdd = {
                    _id: req._id,
                    _time: req._time,
                    _modified: req._time,
                    url: req.url,
                    method: req.method,
                    prescript: req.prescript,
                    postscript: req.postscript,
                    name: req.name,
                    description: req.description,
                    _parent: req._parent,
                    Req: req.Req,
                    Body: req.Body
                };
            }

            if ($rootScope.userData && $rootScope.userData.UID) {
                // @ts-ignore
                reqToAdd.owner = $rootScope.userData.UID;
            }
            vm.importFolderData.reqs.push(reqToAdd);
        }


        /************* Saved tab END**************/

        /**************************************/
        /************* Save Modal**************/
        /**************************************/

        vm.SaveModalModel = {
            name: '',
            description: '',
            selectedFolder: null
        };
        vm.closeSaveReqModal = closeSaveReqModal;
        vm.beforeSaveRequest = beforeSaveRequest;
        vm.initAddReqToSuit = initAddReqToSuit;
        vm.initCopyMove = initCopyMove;
        vm.copyMoveReq = copyMoveReq;
        vm.deleteReq = deleteReq;
        vm.deleteFolder = deleteFolder;
        vm.downloadFolder = downloadFolder;
        vm.initReqEdit = initReqEdit;
        vm.initFolderToSuit = initFolderToSuit;

        $rootScope.sendSaveRequest = function (saveData) {
            if (saveData.withBody === -1) {
                saveData.Body = null;
            }

            //saving an existing request
            if (saveData.tabId.search('newtab') < 0 && !saveData.saveAs) {
                vm.toSave = vm.AllReqs[saveData.tabId];
                if (vm.toSave) {
                    if (saveData.type === 'ws') {
                        angular.extend(vm.toSave, saveData);
                    } else {
                        var newSave = HistoryServ.formatRequestForSave(saveData, true);
                        angular.extend(vm.toSave, newSave);
                        if (saveData.withBody === -1) {
                            vm.toSave.Body = {};
                        }
                    }
                    saveRequest(true);
                }
                return;
            }

            //saving a new request
            if (['Stomp', 'Websocket', 'Socketio', 'SSE'].indexOf(saveData.method) >= 0) {
                vm.toSave = angular.copy(saveData);
                vm.toSave.type = 'ws';
                var ts = Date.now();
                vm.toSave._id = ts + '-' + Math.random().toString(16).substring(2);
                if (!saveData._modified) {
                    vm.toSave._modified = ts;
                } else {
                    vm.toSave._modified = saveData._modified;
                }
            } else {
                vm.toSave = HistoryServ.formatRequestForSave(saveData);
            }
            vm.saveTabId = saveData.tabId;//used to notify teh tab that it got saved
            var urlParts = Utils.getUrlParts(vm.toSave.url);
            var phrase = '';
            switch (vm.toSave.method) {
                case 'GET':
                    phrase = 'Get ';
                    break;
                case 'POST':
                    phrase = 'Create ';
                    break;
                case 'DELETE':
                    phrase = 'Delete ';
                    break;
                case 'PUT':
                case 'PATCH':
                    phrase = 'Update ';
                    break;
                case 'Stomp':
                    phrase = 'Stomp ';
                    break;
                case 'Websocket':
                    phrase = 'Websocket ';
                    break;
                case 'Socketio':
                    phrase = 'SocketIO ';
                    break;
                case 'SSE':
                    phrase = 'SSE ';
                    break;
            }
            vm.SaveModalModel.name = phrase + urlParts;
            $scope.modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'modules/saveRequest/saveRequestModal.html',
                scope: $scope
                //size: 'lg'
            });
            $scope.modalInstance.opened.then(function () {
                $timeout(function () {
                    angular.element('#saveModalName').focus();
                }, 500);
            });
        };

        function closeSaveReqModal() {
            if ($scope.modalInstance) {
                $scope.modalInstance.close('close');
            }
            vm.SaveModalModel = {
                name: '',
                description: '',
                selectedFolder: null
            };
        }

        function beforeSaveRequest() {
            if (!vm.SaveModalModel.name) {
                toastr.error('Please give a name to the request.');
                angular.element('#saveModalName').focus();
                return;
            }
            if (!vm.SaveModalModel.selectedFolder) {
                toastr.error('Select a folder to save this request');
                return;
            }
            if (vm.SaveModalModel.inEdit) {
                var req = vm.SaveModalModel.req;
                req.name = vm.SaveModalModel.name;
                req.description = vm.SaveModalModel.description;
                vm.toSave = req;
                vm.toSave._modified = new Date().getTime();
                saveRequest(true); //update = true
                return;
            }
            vm.toSave.name = vm.SaveModalModel.name;
            vm.toSave.description = vm.SaveModalModel.description;
            vm.toSave._parent = vm.SaveModalModel.selectedFolder;
            for (var i = 0; i < vm.Folders.length; i++) {
                if (vm.Folders[i]._id === vm.SaveModalModel.selectedFolder && vm.Folders[i].requests) {
                    var requests = vm.Folders[i].requests;
                    for (var j = 0; j < requests.length; j++) {
                        if (requests[j].name.toLowerCase() === vm.SaveModalModel.name.toLowerCase()) {
                            toastr.error('A request with the same name is already in the folder');
                            return;
                        }
                    }
                }
            }
            saveRequest();
        }

        function saveRequest(update) {
            var toSave = angular.copy(vm.toSave);
            if ($rootScope.userData && $rootScope.userData.UID) {
                toSave.owner = $rootScope.userData.UID;
            }
            lMenuService.upsertReq(toSave, false, update).then(function (saved) {
                var found = false;
                var update = vm.AllReqs[vm.toSave._id] ? true : false;

                for (var i = 0; i < vm.Folders.length; i++) {
                    var folder = vm.Folders[i];
                    if (folder._id === vm.toSave._parent) {
                        vm.Folders[i].expand = true;

                        if (vm.Folders[i].requests) {
                            if (update) {
                                for (var x = 0; x < vm.Folders[i].requests; x++) {
                                    var req = vm.Folders[i].requests[x];
                                    if (req._id === vm.toSave._id) {
                                        vm.Folders[i].requests[x] = vm.toSave;
                                        break;
                                    }
                                }
                            } else {
                                vm.Folders[i].requests.unshift(vm.toSave);
                            }
                        } else {
                            vm.Folders[i].requests = [vm.toSave];
                        }
                        vm.AllReqs[vm.toSave._id] = vm.toSave;
                        break;
                    } else if (folder.children && folder.children.length > 0) {
                        //loop through the child folders if pesent
                        for (var j = 0; j < folder.children.length; j++) {
                            if (folder.children[j]._id === vm.toSave._parent) {
                                vm.Folders[i].children[j].expand = true;
                                if (vm.Folders[i].children[j].requests) {
                                    if (update) {
                                        for (var x = 0; x < vm.Folders[i].children[j].requests; x++) {
                                            var req = vm.Folders[i].children[j].requests[x];
                                            if (req._id === vm.toSave._id) {
                                                vm.Folders[i].children[j].requests[x] = vm.toSave;
                                                break;
                                            }
                                        }
                                    } else {
                                        vm.Folders[i].children[j].requests.unshift(vm.toSave);
                                    }
                                } else {
                                    vm.Folders[i].children[j].requests = [vm.toSave];
                                }
                                found = true;
                                vm.AllReqs[vm.toSave._id] = vm.toSave;
                                break;
                            }
                        }
                    }
                    if (found) {
                        vm.Folders[i].expand = true;
                        break;
                    }
                }
                $rootScope.$broadcast('tabSaved', { tabId: vm.saveTabId, newId: saved[0], name: vm.toSave.name });
                closeSaveReqModal();
                vm.toSave = {};
                vm.SaveModalModel = {
                    name: '',
                    description: '',
                    selectedFolder: null
                };
                if (update) {
                    toastr.info('Request Updated');
                } else {
                    toastr.success('Request Saved');
                }

            }, function (e) {
                toastr.error('Failed to save request. ' + e.message);
            });
        }

        function initAddReqToSuit(req) {
            if (req.type === 'ws') {
                toastr.error('Adding websocket requests to Test Suites is not yet supported');
                return;
            }
            //model, items, dispName, tree, children, disableParent
            vm.treeSelector.init('', vm.PROJECTS, 'name', true, 'suits', true);
            console.log(vm.PROJECTS);

            vm.menuModal.showTreeSelector = true;
            vm.menuModal.show('Select Test Suite');

            vm.menuModal.listener = $rootScope.$on('treeSelected', function (e, args) {
                addReqToSuit(args.selectedVal, req);
            });
        }

        function addReqToSuit(selectedSuit, req, addAtIndex) {
            if (req.type === 'ws') {
                toastr.error('Adding websocket requests to Test Suits is not yet supported');
                return;
            }
            var copiedReq = angular.copy(req);
            angular.forEach(vm.PROJECTS, function (proj, projId) {
                var suits = proj.suits;
                angular.forEach(suits, function (suit, suitId) {
                    if (suitId === selectedSuit) {
                        if (addAtIndex !== undefined) {
                            suit.reqs.splice(addAtIndex, 0, copiedReq)
                        } else if (suit.reqs && suit.reqs.length >= 0) {
                            suit.reqs.push(copiedReq);
                        } else {
                            suit.reqs = [copiedReq];
                        }
                        /*if(suit.reqObjs && suit.reqObjs.length >=0){
                         suit.reqObjs.push(req);
                         }else{
                         suit.reqObjs = [req];
                         }*/
                        updateSuit([suit]).then(function (data) {
                            toastr.success('Request added to suite "' + suit.name + '"');
                        }, function () {
                            toastr.error('Failed to add Request');
                        });
                        vm.menuModal.reset();
                    }
                });
            });
        }

        function initCopyMove(req, folder, action) {
            //model, items, dispName, tree, children, disableParent
            vm.treeSelector.init('', vm.Folders, 'name', true, 'children', false);

            vm.menuModal.showTreeSelector = true;
            vm.menuModal.show('Select Folder');

            vm.menuModal.listener = $rootScope.$on('treeSelected', function (e, args) {
                copyMoveReq(req, folder, action, args.selectedVal);
            });
        }

        function copyMoveReq(req, folder, action, selectedFolder) {
            var append = action === 'move' ? ' new' : ' copy';
            var reqToCopy = angular.copy(req);

            if (!selectedFolder) { //if selected folderid is not provided consider it as copy
                selectedFolder = folder._id;
                action = 'duplicate';
            }

            if (selectedFolder === folder._id && action !== 'duplicate') {
                toastr.error('The request is already in the folder "' + folder.name + '"');
                vm.menuModal.reset();
                return;
            }
            var duplicate = false;
            do {
                if (duplicate) {
                    reqToCopy.name = reqToCopy.name + append;
                }
                duplicate = checkDuplicateReq(selectedFolder, reqToCopy.name);

            } while (duplicate);

            reqToCopy._parent = selectedFolder;
            var ts = new Date().getTime();

            (function () {
                if (action === 'copy' || action === 'duplicate') {
                    reqToCopy._id = ts + '-' + s12();
                    reqToCopy._time = ts;
                    reqToCopy._modified = ts;
                    return lMenuService.upsertReq(reqToCopy);
                } else if (action === 'move') {
                    reqToCopy._modified = ts;
                    return lMenuService.upsertReq(reqToCopy, false, true);
                }
            }()).then(function () {
                var str;
                switch (action) {
                    case 'copy':
                        str = 'Request copied.';
                        break;
                    case 'move':
                        removeReqFromFolder(reqToCopy._id, folder._id);
                        str = 'Request moved.';
                        break;
                    case 'duplicate':
                        str = 'Duplicate created in folder "' + folder.name + '"';
                        break;
                }
                toastr.success(str);
                addReqToFolder(reqToCopy, selectedFolder);
            }, function () {
                toastr.success('Failed to ' + action + ' request.');
            });

            vm.menuModal.reset();
        }

        function checkDuplicateReq(inFolder, name) {
            for (var i = 0; i < vm.Folders.length; i++) {
                if (vm.Folders[i]._id === inFolder) {
                    if (vm.Folders[i].requests && vm.Folders[i].requests.length > 0) {
                        if (Utils.doesExist(vm.Folders[i].requests, name, 'name')) {
                            return true;
                        }
                    }
                } else if (vm.Folders[i].children && vm.Folders[i].children.length > 0) {
                    for (var j = 0; j < vm.Folders[i].children.length; j++) {
                        if (vm.Folders[i].children[j]._id === inFolder) {
                            if (vm.Folders[i].children[j].requests && vm.Folders[i].children[j].requests.length > 0) {
                                if (Utils.doesExist(vm.Folders[i].children[j].requests, name, 'name'))
                                    return true;
                            }
                        }
                    }
                }
            }
            return false;
        }

        function deleteReq(reqId, folderId) {
            var q = $q.defer();
            //no need to remove the req from the suit, they are independent 
            lMenuService.deleteReq(reqId).then(function () {
                removeReqFromFolder(reqId, folderId);
                $rootScope.$broadcast('reqDeleted', { tabId: reqId });
                q.resolve();
            });
            return q.promise;
        }

        function removeReqFromFolder(reqId, folderId) {
            for (var i = 0; i < vm.Folders.length; i++) {
                if (vm.Folders[i]._id === folderId) {
                    for (var j = 0; j < vm.Folders[i].requests.length; j++) {
                        if (vm.Folders[i].requests[j]._id === reqId) {
                            vm.Folders[i].requests.splice(j, 1);
                            break;
                        }
                    }
                    break;
                } else if (vm.Folders[i].children && vm.Folders[i].children.length > 0) {
                    for (var j = 0; j < vm.Folders[i].children.length; j++) {
                        if (vm.Folders[i].children[j]._id === folderId) {
                            for (var k = 0; k < vm.Folders[i].children[j].requests.length; k++) {
                                if (vm.Folders[i].children[j].requests[k]._id === reqId) {
                                    vm.Folders[i].children[j].requests.splice(k, 1);
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }

        function addReqToFolder(req, folderId) {
            for (var i = 0; i < vm.Folders.length; i++) {
                if (vm.Folders[i]._id === folderId) {
                    if (vm.Folders[i].requests) {
                        vm.Folders[i].requests.push(req);
                    } else {
                        vm.Folders[i].requests = [req];
                    }
                    vm.Folders[i].expand = true;
                    vm.AllReqs[req._id] = req;
                    break;
                } else if (vm.Folders[i].children && vm.Folders[i].children.length > 0) {
                    for (var j = 0; j < vm.Folders[i].children.length; j++) {
                        if (vm.Folders[i].children[j]._id === folderId) {
                            if (vm.Folders[i].children[j].requests) {
                                vm.Folders[i].children[j].requests.push(req);
                            } else {
                                vm.Folders[i].children[j].requests = [req];
                            }
                            vm.Folders[i].children[j].expand = true;
                            vm.AllReqs[req._id] = req;
                            break;
                        }
                    }
                }
            }
        }

        function deleteFolder(folder, recursive) {
            var q = $q.defer();
            var reqPromises = [];
            var reqs = folder.requests;
            if (reqs) {
                for (var i = 0; i < reqs.length; i++) {
                    console.log('delete req ' + reqs[i].name + ' under ' + folder.name);
                    var promise = deleteReq(reqs[i]._id, folder._id);
                    reqPromises.push(promise);
                }
            }

            $q.all(reqPromises).then(function () {
                var folderPromises = [];
                if (folder.children) {
                    for (var j = 0; j < folder.children.length; j++) {
                        console.log('process sub folder' + folder.children[j].name);
                        var prom = deleteFolder(folder.children[j], true);
                        folderPromises.push(prom);
                    }
                }
                $q.all(folderPromises).then(function () {
                    lMenuService.deleteFolder(folder._id).then(function () {
                        if (!recursive) {
                            console.log('need to remove from vm');
                            for (var x = 0; x < vm.Folders.length; x++) {
                                if (vm.Folders[x]._id === folder._id) {
                                    vm.Folders.splice(x, 1);
                                    break;
                                } else {
                                    for (var y = 0; y < vm.Folders[x].children.length; y++) {
                                        if (vm.Folders[x].children[y]._id === folder._id) {
                                            vm.Folders[x].children.splice(y, 1);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        q.resolve();
                    });
                });
            });
            return q.promise;
        }

        function downloadFolder(folder) {
            var data = {
                TYPE: 'Folder',
                value: folder
            };
            FileSystem.download(folder.name + '.folder.apic.json', JSON.stringify(data, null, '\t'));
        }

        function initReqEdit(req) {
            vm.SaveModalModel = {
                name: req.name,
                description: req.description,
                selectedFolder: req._parent,
                inEdit: true,
                req: req
            };
            $scope.modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'modules/saveRequest/saveRequestModal.html',
                scope: $scope
                //size: 'lg'
            });
            $scope.modalInstance.opened.then(function () {
                $timeout(function () {
                    angular.element('#saveModalName').focus();
                }, 500);
            });
        }

        function initFolderToSuit(folder) {
            //model, items, dispName, tree, children, disableParent
            vm.treeSelector.init('', vm.PROJECTS, 'name', true, 'children', false);

            vm.menuModal.showTreeSelector = true;
            vm.menuModal.show('Select Test Project');

            vm.menuModal.listener = $rootScope.$on('treeSelected', function (e, args) {
                if (args.selectedVal.indexOf('demo') > 0) {
                    toastr.error('Can\'t add test suite to APIC\'s auto-generated demo projects. Please select a different project or create a new one.')
                    return;
                }
                convertFolderToSuit(folder, args.selectedVal);
                vm.menuModal.reset();
            });
        }

        function convertFolderToSuit(folder, projId) {
            //console.log(folder, projId);
            var ts = Date.now();
            var suit = {
                _id: ts + '-' + s12(),
                _created: ts,
                _modified: ts,
                name: folder.name,
                projId: projId,
                reqs: []
            };

            if (folder.requests) {
                for (var i = 0; i < folder.requests.length; i++) {
                    var req = folder.requests[i];
                    delete req.fromProject;
                    suit.reqs.push(req);
                }
            }
            if (folder.children && folder.children.length > 0) {
                for (var f = 0; f < folder.children.length; f++) {
                    // convertFolderToSuit(folder.children[i], projId);
                    var cf = folder.children[f];
                    for (var i = 0; i < cf.requests.length; i++) {
                        var req = cf.requests[i];
                        delete req.fromProject;
                        suit.reqs.push(req);
                    }
                }
            }

            if (checkDuplicateSuit(projId, suit.name)) {
                suit.name = suit.name + '-' + s4();
            }
            lMenuService.createSuit(suit).then(function (id) {
                if (id && vm.PROJECTS[suit.projId]) {
                    if (vm.PROJECTS[suit.projId].suits) {
                        vm.PROJECTS[suit.projId].suits[suit._id] = suit;
                    } else {
                        vm.PROJECTS[suit.projId].suits = {};
                        vm.PROJECTS[suit.projId].suits[suit._id] = suit;
                    }
                    vm.PROJECTS[suit.projId].expanded = true;
                    vm.activeTab = 2;
                    toastr.success('Test Suite "' + suit.name + '" created');
                }
            }, function () {
                toastr.error('Failed to create suite');
            });
        }
        /************* Save Modal END**************/


        /************* Menu Modal**************/

        vm.menuModal = {
            showFlag: false,
            msg: 'Menu',
            show: showModal,
            hide: hideModal,
            reset: resetModal,
            showTreeSelector: false,
            listener: null
        };
        vm.treeSelector = {
            model: '',
            items: [],
            displayName: 'name',
            tree: false,
            children: '',
            disableParent: false,
            resetTreeSel: resetTreeSel,
            init: initTreeSel
        };
        function showModal(msg) {
            vm.menuModal.showFlag = true;
            vm.menuModal.msg = msg;
        }

        function hideModal() {
            vm.menuModal.showFlag = false;
            vm.menuModal.msg = 'Menu';
            if (vm.menuModal.listener && typeof vm.menuModal.listener === 'function') {
                vm.menuModal.listener();
            }
        }
        function resetModal() {
            vm.menuModal.showTreeSelector = false;
            hideModal();
            resetTreeSel();
        }

        function initTreeSel(model, items, dispName, tree, children, disableParent) {
            resetTreeSel();
            vm.treeSelector.model = model;
            vm.treeSelector.items = items;
            vm.treeSelector.displayName = dispName;
            vm.treeSelector.tree = tree;
            vm.treeSelector.children = children;
            vm.treeSelector.disableParent = disableParent;
        }

        function resetTreeSel() {
            vm.treeSelector.model = '';
            vm.treeSelector.items = [];
            vm.treeSelector.displayName = 'name';
            vm.treeSelector.tree = false;
            vm.treeSelector.children = '';
            vm.treeSelector.disableParent = false;
        }

        /************* Menu Modal End**************/


        //*****************************************//
        //************ test tab *******************//
        //*****************************************//

        vm.newProj = {
            name: '',
            showForm: false
        };
        vm.newSuit = {
            show: false,
            name: '',
            parentId: null,
            parentName: ''
        };
        vm.PROJECTS = {};
        vm.noProjects = false;

        vm.showNewProjForm = showNewProjForm;
        vm.getAllProjs = getAllProjs;
        vm.createProj = createProj;
        vm.deleteProject = deleteProject;
        vm.showNewSuitForm = showNewSuitForm;
        vm.createSuit = createSuit;
        vm.deleteSuit = deleteSuit;
        vm.removeReqFromSuit = removeReqFromSuit;
        vm.duplicateReqInSuit = duplicateReqInSuit;
        vm.openSuitReq = openSuitReq;
        vm.showReqSelector = showReqSelector;
        vm.openSuit = openSuit;
        vm.exportSuit = exportSuit;
        vm.importTestSuit = importTestSuit;
        vm.exportTestProj = exportTestProj;
        vm.importTestProject = importTestProject;

        function showNewProjForm() {
            vm.newProj.name = '';
            vm.newProj.showForm = true;
            $rootScope.focus('#newProjName');
        }

        function getAllProjs() {
            vm.PROJECTS = {};
            lMenuService.getAllProj().then(function (projs) {
                if (projs && projs.length > 0) {
                    for (var i = 0; i < projs.length; i++) {
                        var proj = projs[i];
                        vm.PROJECTS[proj._id] = proj;
                    }
                    processSuits();
                } else {
                    vm.noProjects = true;
                }
            }, function () {
                toastr.error('Failed to get list of projects.');
            });
        }

        function processSuits() {
            lMenuService.getAllSuits().then(function (suits) {
                if (suits && suits.length) {
                    for (var i = 0; i < suits.length; i++) {
                        var suit = suits[i];
                        if (vm.PROJECTS[suit.projId]) {
                            if (vm.PROJECTS[suit.projId]['suits']) {
                                vm.PROJECTS[suit.projId]['suits'][suit._id] = suit;
                            } else {
                                vm.PROJECTS[suit.projId]['suits'] = {};
                                vm.PROJECTS[suit.projId]['suits'][suit._id] = suit;
                            }
                        }
                    }
                }
            }, function () {
                toastr.error('Failed to get list of suites.');
            });
        }

        function createProj() {
            var allow = true;
            angular.forEach(vm.PROJECTS, function (val) {
                if (val.name.toLowerCase() === vm.newProj.name.toLowerCase()) {
                    allow = false;
                }
            });
            if (allow) {
                var project = {
                    name: vm.newProj.name
                };
                if ($rootScope.userData && $rootScope.userData.UID) {
                    project.owner = $rootScope.userData.UID;
                }

                lMenuService.createProj(project).then(function (id) {
                    vm.PROJECTS[id[0]] = project;
                    toastr.success('Project "' + vm.newProj.name + '" created');
                    vm.newProj.showForm = false;
                    vm.newProj.name = '';
                    vm.noProjects = false;
                }, function () {
                    toastr.error('Failed to create project');
                });
            } else {
                toastr.error('Project with name "' + vm.newProj.name + '" already exists.');
                $rootScope.focus('#newProjName');
            }
        }

        function deleteProject(projId) {
            if (projId && vm.PROJECTS[projId]) {
                var proj = vm.PROJECTS[projId];
                var promises = [];

                if (proj.suits) {
                    angular.forEach(proj.suits, function (suit) {
                        var promise = lMenuService.deleteSuit(suit._id);
                        promises.push(promise);
                    });
                }

                $q.all(promises).then(function () {
                    lMenuService.deleteProj(projId).then(function () {
                        delete vm.PROJECTS[projId];
                        toastr.success('Project deleted.');
                    }, function () {
                        toastr.error('Failed to delete Project');
                    });
                }, function () {
                    toastr.error('Failed to delete Test suits for the project. Aborting...');
                });
            }
        }

        function showNewSuitForm(proj) {
            proj.expanded = true;
            vm.newSuit.show = true;
            vm.newSuit.name = '';
            vm.newSuit.parentId = proj._id;
            $rootScope.focus('#newSuitName');
        }

        function createSuit() {
            var ts = new Date().getTime();
            /*var allow = true;
             if (vm.PROJECTS[vm.newSuit.parentId].suits) {
             angular.forEach(vm.PROJECTS[vm.newSuit.parentId].suits, function (suit) {
             if (suit.name.toLowerCase() === vm.newSuit.name.toLowerCase()) {
             allow = false;
             }
             });
             }*/
            if (checkDuplicateSuit(vm.newSuit.parentId, vm.newSuit.name)) {
                toastr.error('Test suit "' + vm.newSuit.name + '" already exists.');
                return;
            }
            var suit = {
                name: vm.newSuit.name,
                projId: vm.newSuit.parentId
            };
            if ($rootScope.userData && $rootScope.userData.UID) {
                suit.owner = $rootScope.userData.UID;
            }
            if (vm.PROJECTS[suit.projId] && vm.PROJECTS[suit.projId].team) {
                suit.team = vm.PROJECTS[suit.projId].team;
            }
            lMenuService.createSuit(suit).then(function (id) {
                if (id && vm.PROJECTS[suit.projId]) {
                    if (vm.PROJECTS[suit.projId].suits) {
                        vm.PROJECTS[suit.projId].suits[suit._id] = suit;
                    } else {
                        vm.PROJECTS[suit.projId].suits = {};
                        vm.PROJECTS[suit.projId].suits[suit._id] = suit;
                    }
                    vm.newSuit.show = false;
                    toastr.success('Test Suite "' + suit.name + '" created');
                }
            }, function () {
                toastr.error('Failed to create suite');
            });
        }

        function checkDuplicateSuit(projId, suitName) {
            var duplicate = false;
            if (vm.PROJECTS[projId].suits) {
                angular.forEach(vm.PROJECTS[projId].suits, function (suit) {
                    if (suit.name.toLowerCase() === suitName.toLowerCase()) {
                        duplicate = true;
                    }
                });
            }
            return duplicate;
        }

        function deleteSuit(suitId, projId) {
            if (suitId) {
                lMenuService.deleteSuit(suitId).then(function () {
                    toastr.success('Suit deleted');
                    if (projId) {
                        delete vm.PROJECTS[projId].suits[suitId];
                    }
                }, function () {
                    toastr.error('Failed to delete Suite');
                });
            }
        }

        function removeReqFromSuit(suit, reqId, index) {
            if (suit.reqs[index] && suit.reqs[index]._id === reqId) {
                suit.reqs.splice(index, 1);
                updateSuit([suit]).then(function () {
                    //suit.reqs.splice(index,1);
                    toastr.success('Request Removed');
                }, function () {
                    toastr.error('Failed to remove reuqest');
                });
            }
        }

        function duplicateReqInSuit(suit, req) {
            console.log(suit, req);
            if (!suit.reqs)
                suit.reqs = [];
            var newReq = angular.copy(req);
            newReq.name = newReq.name + ' Copy';
            suit.reqs.push(newReq);
            updateSuit([suit]).then(function () {
                toastr.success('Request Copied');
            }, function () {
                toastr.error('Failed to copy request');
            });
        }

        function openSuitReq(reqId, suit, index) {
            openSuit(suit, reqId, index);
        }

        function updateSuit(suits) {
            if (!suits.length) {
                var q = $q.defer();
                q.resolve();
                return q.promise;
            }
            var suitsToSave = [];
            var ts = new Date().getTime();
            for (var i = 0; i < suits.length; i++) {
                var suitToSave = {
                    _id: suits[i]._id,
                    name: suits[i].name,
                    projId: suits[i].projId,
                    _created: suits[i]._created,
                    _modified: ts,
                    reqs: suits[i].reqs,
                    env: suits[i].env,
                    owner: suits[i].owner,
                    team: suits[i].team
                };
                suitsToSave.push(suitToSave);
            }

            return lMenuService.updateSuit(suitsToSave).then(function (data) {
                return data;
            }, function () {
                toastr.error('Failed to update suit');
            });
        }

        function showReqSelector(suitId, addAtIndex) {
            //model, items, dispName, tree, children, disableParent
            vm.treeSelector.init('', vm.AllReqs, 'name', false, '', false);
            //vm.treeSelector.init('',vm.Folders, 'name', true, 'requests',true);
            vm.menuModal.showTreeSelector = true;
            vm.menuModal.show('Select Request');

            vm.menuModal.listener = $rootScope.$on('treeSelected', function (e, args) {
                if (vm.AllReqs[args.selectedVal]) {
                    addReqToSuit(suitId, vm.AllReqs[args.selectedVal], addAtIndex);
                }
            });
        }

        function openSuit(suit, reqIdToOpen, index) {
            suit.expanded = 'opened';
            if (reqIdToOpen && index !== undefined) {
                suit.reqIdToOpen = reqIdToOpen + '###' + index;
            } else {
                delete suit.reqIdToOpen;
            }
            $rootScope.$broadcast('OpenSuitTab', suit);
        }

        function exportSuit(suit, withEnv) {
            var suiteToSave = angular.copy(suit);
            delete suiteToSave.owner;
            delete suiteToSave.team;
            if (withEnv && suiteToSave.env && $rootScope.ENVS) {
                suiteToSave.envVars = $rootScope.ENVS.filter(function (env) {
                    return env._id === suiteToSave.env
                })[0].vals;
            } else {
                console.log('Selected to export with environment but current suite doesn\'t use any environment');
            }
            var data = {
                TYPE: 'APICSuite',
                value: suiteToSave
            };
            if (data.value)
                FileSystem.download(suit.name + '.suit.apic.json', JSON.stringify(data));
        }

        function importTestSuit(proj) {
            FileSystem.readFile().then(function (file) {
                var data = null;
                try {
                    data = JSON.parse(file.data);
                } catch (e) {
                    toastr.error('Import failed. Invalid file format');
                }
                if (!data)
                    return;

                if (data.TYPE === 'APICSuite') {
                    if (Validator.testSuit(data, true) === true) {
                        if (!vm.PROJECTS[proj._id]) {
                            toastr.error('Selected project doesn\'t esist');
                        } else {
                            //find if a suit with same name exists in the project
                            var suitName = data.value.name, orgSuit = data.value.name;
                            var duplicate = false, count = 0;

                            do {
                                if (duplicate) {
                                    count++;
                                    suitName = orgSuit + ' new' + count;
                                }
                                duplicate = checkDuplicateSuit(proj._id, suitName);

                            } while (duplicate);
                            data.value.name = suitName;
                        }
                        var ts = new Date().getTime();
                        data.value._id = ts + Math.random().toString(16).substring(2);
                        data.value._created = ts;
                        data.value._modified = ts;
                        data.value.projId = proj._id;
                        delete data.value.team;
                        delete data.value.owner;
                        if ($rootScope.userData && $rootScope.userData.UID) {
                            data.value.owner = $rootScope.userData.UID;
                        }

                        return lMenuService.createSuit(data.value).then(function (d) {
                            toastr.success('Suite imported');
                            if (!vm.PROJECTS[proj._id].suits) {
                                vm.PROJECTS[proj._id].suits = {};
                            }
                            vm.PROJECTS[proj._id].suits[data.value._id] = data.value;
                        }, function (e) {
                            toastr.error('Failed to update suite');
                        });
                    } else {
                        toastr.error('Selected file doesn\'t contain valid Test Suite information');
                    }
                } else {
                    toastr.error('Selected file doesn\'t contain valid Test Suite information');
                }
            }, function () {
                toastr.error('Failed to import Suite');
            });
        }

        function exportTestProj(proj) {
            delete proj.owner;
            delete proj.team;
            if (!proj.suits || Object.keys(proj.suits).length < 1) {
                toastr.error('This project doesn\'t have any test suites');
                return;
            }

            angular.forEach(proj.suits, function (suit, id) {
                delete suit.owner;
                delete suit.team;
                delete suit.env;
            });

            var data = {
                TYPE: 'APICTestProject',
                value: proj
            };
            FileSystem.download(proj.name + '.testProject.apic.json', JSON.stringify(data));
        }

        function importTestProject() {
            FileSystem.readFile().then(function (file) {
                var data = null;
                try {
                    data = JSON.parse(file.data);
                } catch (e) {
                    toastr.error('Import failed. Invalid file format');
                }
                if (!data)
                    return;

                if (data.TYPE === 'APICTestProject') {
                    if (Validator.testProj(data, true) === true) {
                        console.log(data);
                        var suitsObj = data.value.suits;

                        //create the project first
                        var ts = Date.now();
                        var project = {
                            name: data.value.name,
                            _id: ts + '-' + s12(),
                            _created: ts,
                            _modified: ts
                        };
                        angular.forEach(vm.PROJECTS, function (proj) {
                            if (proj.name.toLowerCase() === project.name.toLowerCase()) {
                                project.name = project.name + '-' + s4();
                            }
                        });
                        lMenuService.createProj(project).then(function (id) {
                            vm.PROJECTS[project._id] = project;
                            //create suits for this project
                            angular.forEach(suitsObj, function (suit) {
                                console.log(suit)
                                suit._id = ts + '-' + s12();
                                suit._created = ts;
                                suit._modified = ts;
                                suit.projId = project._id;

                                lMenuService.createSuit(suit).then(function (id) {
                                    if (id && vm.PROJECTS[suit.projId]) {
                                        if (vm.PROJECTS[suit.projId].suits) {
                                            vm.PROJECTS[suit.projId].suits[suit._id] = suit;
                                        } else {
                                            vm.PROJECTS[suit.projId].suits = {};
                                            vm.PROJECTS[suit.projId].suits[suit._id] = suit;
                                        }
                                    }
                                }, function () {
                                    toastr.error('Failed to import suite');
                                });
                            });
                            toastr.success('Project "' + project.name + '" imported');
                        }, function () {
                            toastr.error('Failed to import project');
                        });

                    } else {
                        toastr.error('Selected file doesn\'t contain valid Test Project information');
                    }
                } else {
                    toastr.error('Selected file doesn\'t contain valid Test Project information');
                }
            }, function () {
                toastr.error('Failed to import Project');
            });
        }

        $rootScope.$on('FoldersChanged', function (e, data) {
            getAllFolders();
            if (data) {
                if (data.type === 'reqUpdated') {
                    var reqs = data.reqs;
                    for (var i = 0; i < reqs.length; i++) {
                        $rootScope.$emit('reqUpdated', reqs[i]);
                    }
                } else if (data.type === 'reqDeleted') {
                    var ids = data.reqsIds;
                    for (var i = 0; i < ids.length; i++) {
                        $rootScope.$broadcast('reqDeleted', { tabId: ids[i] });
                    }
                }

            }
        });

        $rootScope.$on('TestProjCreated', function (e, projs) {
            for (var i = 0; i < projs.length; i++) {
                vm.PROJECTS[projs[i]._id] = projs[i];
                vm.noProjects = false;
            }
        });

        $rootScope.$on('TestProjDeleted', function (e, ids) {
            for (var i = 0; i < ids.length; i++) {
                delete vm.PROJECTS[ids[i]];
                //TODO: Close tab if suit of this project are opened
            }
        });

        $rootScope.$on('TestSuitUpdated', function (e, suits) {
            if (suits) {
                for (var i = 0; i < suits.length; i++) {
                    var projId = suits[i].projId;
                    if (!vm.PROJECTS[projId].suits) {
                        vm.PROJECTS[projId].suits = {};
                    }
                    if (vm.PROJECTS[projId].suits[suits[i]._id]) {
                        //Existing: individual assignment is required to that the changes will reflect in opened tabs
                        vm.PROJECTS[projId].suits[suits[i]._id].name = suits[i].name;
                        vm.PROJECTS[projId].suits[suits[i]._id].env = suits[i].env;
                        vm.PROJECTS[projId].suits[suits[i]._id]._modified = suits[i]._modified;
                        vm.PROJECTS[projId].suits[suits[i]._id].reqs = suits[i].reqs;
                    } else {//new suit
                        vm.PROJECTS[projId].suits[suits[i]._id] = suits[i];
                    }
                }
            } else {
                getAllProjs();
            }
        });

        $rootScope.$on('DuplicateSuitReq', function (e, arg) {
            duplicateReqInSuit(arg.suit, arg.req);
        });

        $rootScope.$on('RemoveSuitReq', function (e, arg) {
            removeReqFromSuit(arg.suit, arg.reqId, arg.index);
        });

        $rootScope.$on('AddRequestToSuit', function (e, arg) {
            showReqSelector(arg.suitId, arg.addAtIndex)
        })

        var TestSuitDeletedLis = $rootScope.$on('TestSuitDeleted', function (e, ids) {
            for (var i = 0; i < ids.length; i++) {
                angular.forEach(vm.PROJECTS, function (proj) {
                    if (proj.suits[ids[i]]) {
                        delete proj.suits[ids[i]];
                        //TODO: Close tab if suit is opened// done in rootController
                    }
                });
            }
        });

        var saveSuitLis = $rootScope.$on('saveSuit', function (e, suit) {
            updateSuit([suit]).then(function (data) {
                toastr.success('Suit Updated');
            }, function () {
                toastr.error('Update Failed');
            });
        });

        var refreshLeftMenuLis = $rootScope.$on('refreshLeftMenu', function () {
            getAllFolders();
            getAllProjs();
        });

        var refreshProjectReqsLis = $rootScope.$on('refreshProjectReqs', function (e, args) {
            if (args) {
                switch (args.type) {
                    case 'delete':
                        for (var i = 0; i < vm.ProjectsTree.length; i++) {
                            if (vm.ProjectsTree[i]._id === args.projId) {
                                var proj = vm.ProjectsTree.splice(i, 1)[0];

                                // Mark all open tabs as unsaved
                                if (proj.requests) {
                                    for (var j = 0; j < proj.requests.length; j++) {
                                        $rootScope.$broadcast('reqDeleted', { tabId: proj.requests[j]._id });
                                    }
                                }
                                if (proj.children) {
                                    for (var k = 0; k < proj.children.length; k++) {
                                        if (proj.children[k].requests) {
                                            for (var l = 0; l < proj.children[k].requests.length; l++) {
                                                $rootScope.$broadcast('reqDeleted', { tabId: proj.children[k].requests[l]._id });
                                            }
                                        }
                                    }
                                }
                                break;
                            }
                        };
                        break;
                    case 'add':
                        getProjectReqs(args.projId).then(function (proj) {
                            vm.ProjectsTree.push(proj);
                        })
                        break;
                    case 'update':
                        getProjectReqs(args.projId).then(function (proj) {
                            for (var i = 0; i < vm.ProjectsTree.length; i++) {
                                if (vm.ProjectsTree[i]._id === args.projId) {
                                    vm.ProjectsTree[i] = proj
                                    break;
                                }
                            };
                        })
                        break;
                }
            } else {
                getProjectReqsTree()
            }
        });

        var updateEndpointLis = $rootScope.$on('updateEndpoint', function (e, arg) {
            for (var i = 0; i < vm.ProjectsTree.length; i++) {
                if (vm.ProjectsTree[i]._id === arg.projId) {
                    var proj = vm.ProjectsTree[i], found = false;
                    if (proj.requests) {
                        for (var j = 0; j < proj.requests.length; j++) {
                            if (proj.requests[j]._id === arg.tabId) {
                                proj.requests[j] = angular.extend(proj.requests[j], arg.delta);
                                found = true;
                                break;
                            }
                        }
                    }
                    if (!found && proj.children) {
                        for (var k = 0; k < proj.children.length; k++) {
                            if (proj.children[k].requests) {
                                for (var l = 0; l < proj.children[k].requests.length; l++) {
                                    if (proj.children[k].requests[l]._id === arg.tabId) {
                                        proj.children[k].requests[l] = angular.extend(proj.children[k].requests[l], arg.delta);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    break;
                }
            }

        });

        $scope.$on('$destroy', function () {
            updateEndpointLis();
            refreshProjectReqsLis();
            refreshLeftMenuLis();
            saveSuitLis();
            TestSuitDeletedLis();
        });
        //************ test tab *******************//
    }
})();
