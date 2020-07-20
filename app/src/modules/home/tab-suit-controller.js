//@ts-check
(function () {
    'use strict';
    angular.module('app.home')
        .controller('SuitTabCtrl', SuitTabCtrl);

    SuitTabCtrl.$inject = ['$scope', '$rootScope', 'toastr', 'Utils', 'Runner', 'FileSystem', 'Const', '$http', 'Reporter', 'apicURLS'];
    function SuitTabCtrl($scope, $rootScope, toastr, Utils, Runner, FileSystem, Const, $http, Reporter, apicURLS) {
        var runner;
        $scope.testTab = true;
        var vm = this;
        vm.methods = Const.http_methodes;
        vm.methodsWithBody = Const.with_body;

        vm.curEnv = {
            name: 'No Environment'
        };
        vm.suit;
        vm.suitReqCopy;
        vm.run = {
            count: 1,
            countCopy: 1,
            showLogs: true,
            logs: '',
            multiRun: false,
            results: [],
            stats: resetStats()
        };
        vm.ctrls = {
            aborted: false,
            editReq: false,
            type: 'suitReq', //harReq - for editing HAR imported req
            editSuitName: false,
            running: undefined,
            showReqs: true,
            showLogs: true,
            webAccess: false,
            req_opened_box: '',
            useGlobalEnv: true,
            saveGlobalEnv: true,
            hideRes: false,
            reqSortOptn: {
                handle: '.grip',
                update: function () {
                    updateSuit();
                }
            },
            harPanel: false,
            harImportType: 'file'
        };
        vm.har = {
            file: '',
            requests: []
        }
        vm.reqCount = 0;
        vm.runCounter = 0;
        vm.selectedReq = 0;

        vm.scriptType = '';
        vm.reqScript = '';

        vm.respCodes = [
            { code: '200' }
        ];
        vm.selectedResp = vm.respCodes[0];

        vm.runSuit = runSuit;
        vm.abortRun = abortRun;
        vm.selectEnv = selectEnv;
        vm.downloadLog = downloadLog;
        vm.updateSuit = updateSuit;
        //vm.enableReqSorting = enableReqSorting;
        //vm.discardSorting = discardSorting;
        //vm.saveSortOrder = saveSortOrder;
        vm.editSuitReq = editSuitReq;
        vm.discardReqEdit = discardReqEdit;
        vm.saveSuitReq = saveSuitReq;
        vm.saveResult = saveResult;
        vm.downloadReport = downloadReport;
        vm.changeSuitName = changeSuitName;
        vm.addCodeSnip = addCodeSnip;
        vm.duplicateReqInSuit = duplicateReqInSuit;
        vm.removeReqFromSuit = removeReqFromSuit;
        vm.loadWAU = loadWAU;
        vm.addBlankReq = addBlankReq;
        vm.addSavedReq = addSavedReq;
        vm.processHarFile = processHarFile;
        vm.addRequestsToSuit = addRequestsToSuit;
        vm.getPrevReq = getPrevReq;
        vm.getNextReq = getNextReq;


        init();
        function init() {
            if (!$rootScope.loadSuit) {
                toastr.error('Unexpected error occured');
                return;
            }
            var reqIdToOpen;
            if ($rootScope.loadSuit.reqIdToOpen) {
                reqIdToOpen = $rootScope.loadSuit.reqIdToOpen;
                delete $rootScope.loadSuit.reqIdToOpen;
            }
            vm.suit = $rootScope.loadSuit;
            vm.suitNameCopy = vm.suit.name;
            $rootScope.loadSuit = null;

            if (reqIdToOpen && vm.suit.reqs && vm.suit.reqs.length) {
                reqIdToOpen = reqIdToOpen.split('###');
                reqIdToOpen[1] = parseInt(reqIdToOpen[1]);
                if (vm.suit.reqs[reqIdToOpen[1]] && vm.suit.reqs[reqIdToOpen[1]]._id === reqIdToOpen[0]) {
                    editSuitReq(vm.suit.reqs[reqIdToOpen[1]], reqIdToOpen[1], 'suitReq');
                }
            }

            //select previous selected env
            if (vm.suit.env && $rootScope.ENVS) {
                for (var i = 0; i < $rootScope.ENVS.length; i++) {
                    if ($rootScope.ENVS[i]._id === vm.suit.env) {
                        selectEnv($rootScope.ENVS[i], true);
                        break;
                    }
                }
            }

            if (vm.suit.harImportReqs) {
                var reqsToImport = vm.suit.harImportReqs;
                delete vm.suit.harImportReqs;
                vm.ctrls.harPanel = true;
                vm.ctrls.harImportType = 'auto'
                processHarEntries(reqsToImport);
            }
        }

        function updateSuit(suit) {
            if (!suit) suit = vm.suit;
            // if(vm.ctrls.editSuit){
            //     toastr.warning('You are editing requests. Please save your changes before doing this operation.')
            //     return false;
            // }
            $rootScope.$emit('saveSuit', suit);
            return true;
        }

        function resetStats() {
            return {
                testsTotal: 0,
                testsFailed: 0,
                testsPassed: 0,
                reqsTotal: 0,
                reqsPassed: 0,
                reqsFailed: 0
            }
        }

        function runSuit(firstRun) {
            vm.ctrls.aborted = false;
            if (vm.run.multiRun) {
                addLog('Suite run count is ' + vm.run.count);
                if (vm.run.count > 1000) {
                    toastr.error('Currently a run upto 1000 times is supported.');
                    vm.run.count = 1000;
                    addLog('Run count was greater than 1000. Using default count 1000.');
                }
            } else {
                vm.run.count = 1;
            }
            if (!vm.run.count || vm.run.count < 1) {
                vm.run.count = 1;
                addLog('Run count was undefined or less than 1. Using default count 1.');
            }
            if (firstRun) {
                resetLog();
                vm.run.countCopy = vm.run.count;
            }

            if (vm.curEnv._id) {
                addLog('Selected environment: ' + vm.curEnv.name);
            } else {
                addLog('Selected environment: None');
            }

            addLog('Preparing for run.');
            vm.reqCount = vm.suit.reqs.length;
            addLog('Total number of requests: ' + vm.reqCount + '. Disabled requests will be skipped.');
            vm.runCounter = 0;

            vm.run.results = [];
            vm.run.stats = resetStats();

            for (var i = 0; i < vm.reqCount; i++) {
                var req = {};
                req._id = vm.suit.reqs[i]._id;
                req.name = vm.suit.reqs[i].name;
                req.url = vm.suit.reqs[i].url;
                req.method = vm.suit.reqs[i].method;
                req.disabled = vm.suit.reqs[i].disabled;

                vm.run.results.push(req);

                ////prepare requests
                if (vm.suit.reqs[i].Body) {
                    vm.suit.reqs[i].data = vm.suit.reqs[i].Body.rawData || vm.suit.reqs[i].data;
                }
            }

            vm.ctrls.running = true;
            vm.run.countCopy--;
            runSingleReq(vm.runCounter, vm.ctrls.useGlobalEnv ? Object.assign({}, $rootScope.xtraEnv, vm.curEnv.vals) : vm.curEnv.vals);
        }

        function runSingleReq(index, newEnv) {
            if (vm.ctrls.aborted || index >= vm.suit.reqs.length) {
                finishRun();
                return;
            }
            var req = angular.copy(vm.suit.reqs[index]);
            if (req.disabled) {
                addLog('Skipping disabled request: ' + req.name);
                vm.runCounter++;
                runSingleReq(vm.runCounter, newEnv);
                return;
            }
            if (!req.env)
                req.env = {};
            req.env.vals = newEnv;
            addLog('----------------------------');
            addLog('Running request:' + req.name);
            addLog('URL:' + req.url);
            runner = new Runner();
            runner.run(Utils.getReqV2(req)).then(reqComplete);
        }

        function reqComplete(respObj) {
            vm.run.stats.reqsTotal++;
            if (respObj.logs) {
                addLog(respObj.logs, true);
            }
            vm.run.results[vm.runCounter].status = 'complete';
            vm.run.results[vm.runCounter].response = respObj.response;
            vm.run.results[vm.runCounter].time = respObj.response.timeTaken >= 1000 ? (respObj.response.timeTaken / 1000) + ' s' : respObj.response.timeTaken + ' ms';
            ;
            vm.run.results[vm.runCounter].url = respObj.request.url;
            vm.run.results[vm.runCounter].tests = {
                cases: respObj.tests,
                passed: Utils.getTestsCountByType(respObj.tests, true),
                failed: Utils.getTestsCountByType(respObj.tests, false)
            };
            vm.run.results[vm.runCounter].tests.total = vm.run.results[vm.runCounter].tests.passed + vm.run.results[vm.runCounter].tests.failed;
            vm.run.stats.testsTotal += vm.run.results[vm.runCounter].tests.total;
            vm.run.stats.testsFailed += vm.run.results[vm.runCounter].tests.failed;
            vm.run.stats.testsPassed += vm.run.results[vm.runCounter].tests.passed;
            if (vm.run.results[vm.runCounter].tests.failed) {
                vm.run.stats.reqsFailed++;
            } else {
                vm.run.stats.reqsPassed++;
            }

            addLog('Status: ' + vm.run.results[vm.runCounter].response.status + ' ' + vm.run.results[vm.runCounter].response.statusText);
            addLog('Time taken: ' + vm.run.results[vm.runCounter].time);
            addLog('Tests >>>');
            for (var i = 0; i < vm.run.results[vm.runCounter].tests.cases.length; i++) {
                addLog(vm.run.results[vm.runCounter].tests.cases[i].name + ' : ' + vm.run.results[vm.runCounter].tests.cases[i].success);
            }
            var newEnv = respObj.env.vals;
            newEnv = angular.merge(newEnv, respObj.xtraEnv);
            if (vm.ctrls.saveGlobalEnv) {
                Utils.updateInMemEnv(respObj.xtraEnv);
            }
            if (vm.runCounter < vm.reqCount - 1) {
                vm.runCounter++;
                runSingleReq(vm.runCounter, newEnv);
            } else {
                vm.runCounter++;
                finishRun();
            }
        }

        function finishRun() {
            addLog('Run completed');
            vm.ctrls.running = false;
            if (vm.run.countCopy > 0) {
                runSuit();
            }
        }

        function abortRun() {
            runner.abort();
            vm.ctrls.running = undefined; //to hide the result panel
            vm.ctrls.aborted = true;
        }

        function addLog(msg, force) {
            if (!vm.run.showLogs && !force)
                return;
            vm.run.logs += '\r\n ' + msg;
        }

        function resetLog() {
            vm.run.logs = '';
        }

        function selectEnv(env, softSelect) {
            if (env) {
                vm.curEnv.name = env.name;
                vm.curEnv._id = env._id;
                vm.curEnv.vals = Utils.processEnv(env.vals);
            } else {
                vm.curEnv.name = 'No Environment';
                vm.curEnv._id = undefined;
                vm.curEnv.vals = undefined;
            }
            if (!softSelect) {
                vm.suit.env = vm.curEnv._id;
                updateSuit(vm.suit);
            }
        }

        function downloadLog() {
            if (vm.run.logs === '') {
                toastr.error('No logs to download');
                return;
            }
            var ts = new Date().getTime();
            FileSystem.download('log-' + ts + '.log', vm.run.logs);
        }

        // function enableReqSorting() {
        //     vm.suitReqCopy = angular.copy(vm.suit.reqs);
        //     vm.ctrls.editSuit = true;
        //     vm.ctrls.showReqs = true;
        // }

        // function discardSorting() {
        //     vm.suit.reqs = angular.copy(vm.suitReqCopy);
        //     vm.ctrls.editSuit = false;
        // }

        // function saveSortOrder() {
        //     vm.ctrls.editSuit = false;
        //     var newOrder = [];
        //     for (var i = 0; i < vm.suit.reqs.length; i++) {
        //         newOrder.push(vm.suit.reqs[i]);
        //         //console.log(vm.suit.reqs[i]);
        //     }
        //     vm.suit.reqs = newOrder;
        //     //console.log('save suit', vm.suit);
        //     updateSuit(vm.suit);
        // }

        function editSuitReq(req, index, type) {
            if (!req) {
                return;
            }
            vm.selectedReq = req;
            vm.selectedReqIndex = index;
            vm.selectedReqCopy = angular.copy(vm.selectedReq);
            //if req edit panel is already open, refresh it
            if (vm.ctrls.editReq) {
                $scope.$broadcast('RefreshRequest');
            } else {
                vm.ctrls.editReq = true;
            }
            vm.ctrls.editReqType = type;
        }

        function discardReqEdit() {
            if (vm.ctrls.editReqType === 'harReq') {
                vm.har.requests[vm.selectedReqIndex] = vm.selectedReqCopy;
            } else {
                vm.suit.reqs[vm.selectedReqIndex] = vm.selectedReqCopy;
            }
            vm.ctrls.editReq = false;

        }

        function saveSuitReq(request, partial) {
            if (vm.ctrls.editReqType === 'harReq') {
                if (!partial) {
                    vm.har.requests[vm.selectedReqIndex] = request;
                } else {
                    delete request.tabId;
                    vm.har.requests[vm.selectedReqIndex] = angular.merge(vm.selectedReqCopy, request);
                }
            } else {
                if (!partial) {
                    vm.suit.reqs[vm.selectedReqIndex] = request;
                } else {
                    delete request.tabId;
                    vm.suit.reqs[vm.selectedReqIndex] = angular.merge(vm.selectedReqCopy, request);
                }
                updateSuit(vm.suit);
            }
            vm.selectedReqCopy = angular.copy(request);
        }

        function saveResult() {
            toastr.info('Coming Soon');
        }

        function downloadReport() {
            console.log(vm.run);
            Reporter.suitReport(vm.run, vm.suit.name).then(function (data) {
                FileSystem.download(vm.suit.name + '-apic_report.html', data);
            }, function (e) {
                console.log(e);
                toastr.error('Couldn\'t download report. Please try again later.');
            });;
        }

        function changeSuitName() {
            vm.suit.name = vm.suitNameCopy;
            updateSuit(vm.suit);
            vm.ctrls.editSuitName = false;
        }

        function addCodeSnip(code) {
            var separator = vm.reqScript ? '\n' : '';
            vm.reqScript += separator + code;
        }

        function duplicateReqInSuit(req) {
            $rootScope.$emit('DuplicateSuitReq', { suit: vm.suit, req: req });
        }

        function removeReqFromSuit(reqId, index) {
            $rootScope.$emit('RemoveSuitReq', { suit: vm.suit, reqId: reqId, index: index });
        }

        function loadWAU() {
            if (vm.suit._id.indexOf('-demo') > 0) {
                vm.WAU = 'https://apic.app/api/webAccess/APICSuite/123456abcdef-testsuite-demo?token=apic-demo-suite';
                return;
            }
            if (!$rootScope.checkLogin()) return;
            vm.ctrls.webAccess = true;
            $http.get(apicURLS.webAccess + vm.suit._id).then(function (resp) {
                if (resp.data) {
                    if (resp.data.status === 'ok') {
                        vm.WAU = resp.data.resp.url;
                    } else {
                        toastr.error(resp.data.desc);
                    }
                } else {
                    toastr.error('Failed to load web access URL.');
                }
                vm.ctrls.webAccess = false;
            }, function () {
                toastr.error('Failed to load web access URL.');
                vm.ctrls.webAccess = false;
            });
        }

        function addBlankReq(index) {
            var blankReq = {
                _id: s12(),
                url: '(blank)',
                prescript: '//add your pre request scripts here. \n',
                postscript: '//add your test scripts here. \n',
                name: '(blank request)',
                method: 'GET',
                description: '(blank)',
                data: '',
                Req: {
                    headers: [{ key: '', val: '' }],
                    url_params: [{ key: '', val: '' }],
                },
                body: {
                    formData: [{ key: '', val: '' }],
                    xForms: [{ key: '', val: '' }]
                }
            }

            vm.suit.reqs.splice(index, 0, blankReq);
            updateSuit(vm.suit);
        }

        function addSavedReq(addAtIndex) {
            $rootScope.$emit('AddRequestToSuit', { suitId: vm.suit._id, addAtIndex: addAtIndex });
        }

        function processHarFile(event) {
            var fileChooser = event.target.querySelector('input#harImportFile');
            console.log('Processing har file..')
            if (!fileChooser.value) {
                toastr.error('Please a HAR file to import');
                return;
            }
            FileSystem.readFile(fileChooser.files).then(function (file) {
                try {
                    var harData = JSON.parse(file.data);
                    var entries = harData.log.entries;
                    processHarEntries(entries);
                    console.log(vm.har.requests)
                } catch (e) {
                    console.log('HAR import failed.', e);
                    toastr.error('Import Failed. Please make sure you are importing a valid HAR file. ' + e.message);
                }
            }, function () {
                toastr.error('Import Failed. Couldn\'t read file');
            });
        }

        function processHarEntries(entries) {
            vm.har.requests = [];
            entries.forEach(function (entry) {
                var apicReq;
                try {
                    apicReq = Utils.harToApicReq(entry);
                } catch (e) {
                    console.log('Failed to parse HAR request', e);
                    toastr.error('Failed to parse one HAR request. ' + e.message);
                }
                if (apicReq) {
                    vm.har.requests.push(apicReq);
                }
            })
        }

        function addRequestsToSuit(requests) {
            vm.suit.reqs = vm.suit.reqs.concat(requests);
            updateSuit(vm.suit);
        }

        function getPrevReq() {
            if (vm.ctrls.editReqType === 'suitReq') {
                return vm.suit.reqs[vm.selectedReqIndex - 1];
            } else {
                return vm.har.requests[vm.selectedReqIndex - 1];
            }
        }

        function getNextReq() {
            if (vm.ctrls.editReqType === 'suitReq') {
                return vm.suit.reqs[vm.selectedReqIndex + 1];
            } else {
                return vm.har.requests[vm.selectedReqIndex + 1];
            }
        }

        $scope.$on('openSuitReq', function (e, args) {
            if (args.suitId === vm.suit._id && vm.suit.reqs && !vm.ctrls.editReq) {
                if (args.reqIdToOpen && vm.suit.reqs && vm.suit.reqs.length) {
                    var reqIdToOpen = args.reqIdToOpen.split('###');
                    reqIdToOpen[1] = parseInt(reqIdToOpen[1]);
                    if (vm.suit.reqs[reqIdToOpen[1]] && vm.suit.reqs[reqIdToOpen[1]]._id === reqIdToOpen[0]) {
                        editSuitReq(vm.suit.reqs[reqIdToOpen[1]], reqIdToOpen[1], 'suitReq');
                    }

                }
            }
        });

    }
})();