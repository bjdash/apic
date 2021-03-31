import { StompMessage } from './../models/StompMessage.model';
import { StompService } from './stomp.service';
import { Injectable } from "@angular/core";
import { Message } from "@stomp/stompjs";
import { BehaviorSubject } from 'rxjs';
import { Toaster } from './toaster.service';


@Injectable()
export class SyncService {
    onApiProjectMessage$: BehaviorSubject<StompMessage> = null;
    onEnvMessage$: BehaviorSubject<StompMessage> = null;
    onAccountMessage$: BehaviorSubject<StompMessage> = null;

    constructor(private stompService: StompService, private toaster: Toaster) {
        this.onApiProjectMessage$ = new BehaviorSubject(null)
        this.onEnvMessage$ = new BehaviorSubject(null)
        this.onAccountMessage$ = new BehaviorSubject(null)

        this.stompService.client.onServerMessage$.subscribe((message: StompMessage) => {
            this.onServerMessage(message);
        });

        this.stompService.client.connected$.subscribe(() => {
            this.syncUnsynced();
        })
    }

    fetch(command: string, lastSyncedTime?: number, data?: any) {
        var allIds: any = {};
        if (data?.apiProjects) {
            allIds.apiProjects = data.apiProjects;
        }

        if (data?.envs) {
            allIds.envs = data.envs;
        }

        //TODO: DO the same as above
        if (data?.folders) {
            allIds.folders = data.folders;
        }
        if (data?.apiRequests) {
            allIds.apiRequests = data.apiRequests;
        }
        if (data?.testCaseProjects) {
            allIds.testCaseProjects = data.testCaseProjects;
        }
        if (data?.testSuits) {
            allIds.testSuits = data.testSuits;
        }

        var toSend: StompMessage = {
            command: command,
            since: lastSyncedTime ? lastSyncedTime : 0
        };
        toSend = Object.assign(toSend, allIds);
        this.stompService.addtoSendQueue(toSend);
        if (command.includes('fetchAll')) {
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
        if (!message) return;

        switch (message.type) {
            case 'Environments':
            case 'Fetch:Envs':
                this.onEnvMessage$.next(message);
                break;
            case 'APIProjects':
            case 'Fetch:ApiProject':
                this.onApiProjectMessage$.next(message);
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
            case 'All':
                this.onEnvMessage$.next(message);
                this.onApiProjectMessage$.next(message);
                // caseFolders(data);
                // caseAPIReqs(data);
                // caseTestCaseProjects(data);
                // caseTestSuits(data);
                if (message.nonExistant) {
                    //handeled in each corresponding service
                }
                break;
            case 'Account':
                this.onAccountMessage$.next(message);
                break;
            case 'Error':
                this.toaster.error(message.msg);
        }
    }

    onSocketConnected() {
        this.syncUnsynced();
    }
}