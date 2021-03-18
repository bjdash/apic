import { ApiProjectService } from 'src/app/services/apiProject.service';
import { StompMessage } from './../models/StompMessage.model';
import { StompService } from './stomp.service';
import { Injectable } from "@angular/core";
import { Message } from "@stomp/stompjs";


@Injectable()
export class SyncService {
    constructor(private stompService: StompService) {
        this.stompService.client.onServerMessage$.subscribe((message: StompMessage) => {
            this.onServerMessage(message);
        })
    }

    fetch(command, lastSyncedTime, data) {
        var allIds: any = {};
        if (data) {
            if (data.apiProjects) {
                allIds.apiProjects = [];
                for (var i = 0; i < data.apiProjects.length; i++) {
                    if (data.apiProjects[i]._id.indexOf('-demo') < 0) {
                        allIds.apiProjects.push({ _id: data.apiProjects[i]._id, _modified: data.apiProjects[i]._modified });
                    }
                }
            }
            if (data.envs) {
                allIds.envs = [];
                for (var i = 0; i < data.envs.length; i++) {
                    if (data.envs[i]._id.indexOf('-demo') < 0) {
                        allIds.envs.push({ _id: data.envs[i]._id, _modified: data.envs[i]._modified });
                    }
                }
            }
            if (data.folders) {
                allIds.folders = [];
                for (var i = 0; i < data.folders.length; i++) {
                    if (data.folders[i]._id.indexOf('-demo') < 0) {
                        allIds.folders.push({ _id: data.folders[i]._id, _modified: data.folders[i]._modified });
                    }
                }
            }
            if (data.apiRequests) {
                allIds.apiRequests = [];
                for (var i = 0; i < data.apiRequests.length; i++) {
                    if (data.apiRequests[i]._id.indexOf('-demo') < 0) {
                        allIds.apiRequests.push({ _id: data.apiRequests[i]._id, _modified: data.apiRequests[i]._modified });
                    }
                }
            }
            if (data.testCaseProjects) {
                allIds.testCaseProjects = [];
                for (var i = 0; i < data.testCaseProjects.length; i++) {
                    if (data.testCaseProjects[i]._id.indexOf('-demo') < 0) {
                        allIds.testCaseProjects.push({ _id: data.testCaseProjects[i]._id, _modified: data.testCaseProjects[i]._modified });
                    }
                }
            }
            if (data.testSuits) {
                allIds.testSuits = [];
                for (var i = 0; i < data.testSuits.length; i++) {
                    if (data.testSuits[i]._id.indexOf('-demo') < 0) {
                        allIds.testSuits.push({ _id: data.testSuits[i]._id, _modified: data.testSuits[i]._modified });
                    }
                }
            }
        }

        var toSend: StompMessage = {
            command: command,
            since: lastSyncedTime ? lastSyncedTime : 0
        };
        toSend = Object.assign(toSend, allIds);
        this.stompService.addtoSendQueue(toSend);
        if (command === 'fetchAll') {
            //TODO:
            // angular.element('#avatar').removeClass('online offline').addClass('syncing');
        }
    }

    execute(command: string, data: StompMessage) {
        data.command = command;
        this.stompService.addtoSendQueue(data);
    }

    syncUnsynced() {
        this.stompService.syncUnsynced();
    }

    prepareAndSync(action, data?) {
        var outData;
        switch (action) {
            case 'addEnv':
            case 'updateEnv':
                outData = {
                    envs: data instanceof Array ? data : [data]
                };
                this.execute(action, outData);
                break;
            case 'addAPIProject':
            case 'updateAPIProject':
                outData = {
                    apiProjects: data instanceof Array ? data : [data]
                };
                this.execute(action, outData);
                break;
            case 'addFolder':
            case 'updateFolder':
                outData = {
                    folders: data instanceof Array ? data : [data]
                };
                this.execute(action, outData);
                break;
            case 'addAPIReq':
            case 'updateAPIReq':
                outData = {
                    apiRequests: data instanceof Array ? data : [data]
                };
                this.execute(action, outData);
                break;
            case 'addTestProj':
                outData = {
                    testCaseProjects: data instanceof Array ? data : [data]
                };
                this.execute(action, outData);
                break;
            case 'addTestSuit':
            case 'updateTestSuit':
                outData = {
                    testSuits: data instanceof Array ? data : [data]
                };
                this.execute(action, outData);
                break;
            case 'deleteEnv':
            case 'deleteAPIProject':
            case 'deleteFolder':
            case 'deleteAPIReq':
            case 'deleteTestProj':
            case 'deleteTestSuit':
                outData = {
                    idList: data instanceof Array ? data : [data]
                };
                this.execute(action, outData);
                break;
        }
    }

    onServerMessage(message: StompMessage) {
        console.log('Received', message);
        if (!message) return;

        switch (message.type) {
            //     case 'Environments':
            //         caseEnvironments(data);
            //         break;
            case 'APIProjects':
                this.caseAPIProjects(message);
                break;
            //     case 'Folders':
            //         caseFolders(data);
            //         break;
            //     case 'APIRequests':
            //         caseAPIReqs(data);
            //         break;
            //     case 'TestCaseProjects':
            //         caseTestCaseProjects(data);
            //         break;
            //     case 'TestSuits':
            //         caseTestSuits(data);
            //         break;
            //     case 'Team':
            //         caseTeam();
            //         break;
            //     case 'All':
            //         caseEnvironments(data);
            //         caseAPIProjects(data);
            //         caseFolders(data);
            //         caseAPIReqs(data);
            //         caseTestCaseProjects(data);
            //         caseTestSuits(data);
            //         if (data.nonExistant) {
            //             caseNonExistant(data.nonExistant);
            //         }
            //         break;
            //     case 'Account':
            //         if (data.msg === 'logout') {
            //             $rootScope.reconnect();
            //         }
            //         break;
            //     case 'Error':
            //         toastr.error(data.msg);
        }
    }

    onSocketConnected() {
        this.syncUnsynced();
        // iDB.findByKey('setting', '_id', 'lastSynced').then(function (data) {
        //     var ts = 0;//new Date().getTime();
        //     if (data && data.time) {
        //         ts = data.time;
        //     }
        //     DataService.getAllData().then(function (data) {
        //         SyncIt.fetch('fetchAll', ts, data);
        //     });
        // });
    }

    private caseAPIProjects(data: StompMessage) {
        if ((data.apiProjects && data.apiProjects.length > 0) || (data.idList && data.idList.length > 0)) {
            if (data.action === 'update' || data.action === 'add') {
                // this.apiProjectService.updateAPIProjects(data.apiProjects, true).then(function () {
                //     // $rootScope.$emit('ApiProjChanged', data.opId);
                // });
            } else if (data.action === 'delete') {
                // var promises = [];
                // for (var i = 0; i < data.idList.length; i++) {
                //     console.log('deleting', data.idList[i]);
                //     var p = DesignerServ.deleteAPIProject(data.idList[i], true);
                //     promises.push(p);
                // }
                // $q.all(promises).then(function () {
                //     $rootScope.$emit('ApiProjRemoved', data.idList);
                // });
            }
        }
    }
}