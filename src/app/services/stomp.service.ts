import { Injectable } from "@angular/core";
import { RxStomp, RxStompState } from "@stomp/rx-stomp";
import { Message } from "@stomp/stompjs";
import { BehaviorSubject } from "rxjs";
import iDB from './IndexedDB';
import * as SockJS from "sockjs-client/dist/sockjs.min";
import { StompMessage } from "../models/StompMessage.model";
import apic from "../utils/apic";
import { ApicUrls } from "../utils/constants";


export class ApicRxStomp extends RxStomp {
    connectionChange$: BehaviorSubject<ApicRxStompState> = new BehaviorSubject(ApicRxStompState.IDLE);
    onServerMessage$: BehaviorSubject<StompMessage> = new BehaviorSubject(null);
    constructor() {
        super();
    }
}

export enum RxStompAdditionalState {
    IDLE = 4,
    SYNCING = 5
}

export const ApicRxStompState = {
    ...RxStompState, ...RxStompAdditionalState
}

type ApicRxStompState = RxStompState | RxStompAdditionalState;

@Injectable()
export class StompService {
    client: ApicRxStomp;
    private messageQueue: StompMessage[] = [];
    private currentProcessingMessage: StompMessage = null;
    private messageIdsPendingAcknowledgement: any = {};
    private timeoutRef;

    constructor() {
        this.client = new ApicRxStomp();
        this.client.connectionState$.subscribe(this.client.connectionChange$);
        this.client.watch('/user/queue/reply').subscribe((message) => {
            this.onMessage(message);
        });

    }

    connect(authHeaderValue: string) {
        this.client.configure({
            webSocketFactory: () => {
                return new SockJS(ApicUrls.socketUrl);
            },
            connectHeaders: {
                "Auth-Token": authHeaderValue
            },
            debug: (msg: string): void => {
                // console.log(new Date(), msg);
            },
        });
        this.client.activate();


    }

    private send(data: StompMessage) {
        if (this.client?.connected()) {
            var strData = JSON.stringify(data);
            //key starting with $ not supported
            strData = strData.replace(new RegExp('"\\$ref":', 'g'), '"###ref###":').replace(new RegExp('"\\$', 'g'), '"###dlr###');
            this.client.connectionChange$.next(ApicRxStompState.SYNCING);
            this.client.publish({ destination: '/app/execute', body: strData });
            setTimeout(() => {
                this.client.connectionChange$.next(this.client.connectionState$.getValue());
            }, 500);
        }
    }

    //entry point for sending a message
    addtoSendQueue(message: StompMessage) {
        if (!message.opId) message.opId = apic.s12();
        if (message.command) {
            this.messageQueue.push(message);
            this.startProcessingQueue();
        }
    }

    private startProcessingQueue() {
        if (this.currentProcessingMessage === null && this.messageQueue.length > 0) {
            //no message is pending acknowledgement from server, pick one from the queue and process
            this.currentProcessingMessage = this.messageQueue.splice(0, 1)[0];
            if (this.client?.connected()) {
                this.messageIdsPendingAcknowledgement[this.currentProcessingMessage.opId] = this.currentProcessingMessage.command;
                this.send(this.currentProcessingMessage);
                //once the current message is processed and we receive an acknowledgement from server, this.currentProcessingMessage will be cleared and next message from the queue will be picked up
                //if we dont receive acknowledgement after 1 min, clear the current one and send the next message
                clearTimeout(this.timeoutRef);
                this.timeoutRef = setTimeout(() => {
                    this.currentProcessingMessage = null;
                    this.startProcessingQueue();
                }, 20000);
            } else {
                //if socket is not connected, save message in unsynced db if not already saved
                if (this.currentProcessingMessage.opId.indexOf('unsynced-') < 0) {
                    this.saveUnsynced(this.currentProcessingMessage);
                    this.currentProcessingMessage = null;
                }
            }

        }
    }

    private saveUnsynced(data) {
        var commandsToSave = ['addEnv', 'updateEnv', 'deleteEnv', 'addAPIProject', 'updateAPIProject', 'deleteAPIProject', 'deleteAPIReq', 'updateAPIReq', 'addAPIReq', 'addFolder', 'updateFolder', 'deleteFolder', 'deleteTestProj', 'updateTestProj', 'addTestProj', 'addTestSuit', 'updateTestSuit', 'deleteTestSuit'];
        if (commandsToSave.indexOf(data.command) >= 0) {
            var entry = {
                _id: 'unsynced-' + apic.s12() + '-' + apic.s12(),
                data: data,
                time: new Date().getTime()
            };
            iDB.insert(iDB.TABLES.UNSYNCED, entry);
        }
    }

    onMessage(incomingFrame: Message) {
        var messageString = incomingFrame.body;
        messageString = messageString.replace(new RegExp('"###ref###":', 'g'), '"$ref":').replace(new RegExp('"###dlr###', 'g'), '"$');
        try {
            var message: StompMessage = JSON.parse(messageString);
            if (this.currentProcessingMessage?.opId === message.opId) {
                clearTimeout(this.timeoutRef);
                this.currentProcessingMessage = null;
            }
            if (this.messageQueue.length > 0) {
                this.startProcessingQueue();
            }

            if (!this.messageIdsPendingAcknowledgement[message.opId] /*&& !body.own*/) {//request not made by me, so execute as own is not set to true
                // $rootScope.onSocketInbound(body);
                this.client.onServerMessage$.next(message);
            } else {//request was made by me, 
                if (message.own) {//check if its for own
                    // $rootScope.onSocketInbound(body);
                    this.client.onServerMessage$.next(message);
                    //TODO: Move syncing to header and last synced to sync service
                    // var operation = this.messageIdsPendingAcknowledgement[message.opId];
                    // if (operation === 'fetchAll') {
                    //     if (angular.element('#avatar').hasClass('syncing')) {
                    //         angular.element('#avatar').removeClass('syncing').addClass('online');
                    //     }
                    //     if (body.since) { //if operation was fetch all, update last synced time
                    //         console.log('setting last synced', new Date(body.since).toLocaleString());
                    //         iDB.upsert('setting', {
                    //             _id: 'lastSynced',
                    //             time: body.since
                    //         });
                    //     }
                    // }
                    delete this.messageIdsPendingAcknowledgement[message.opId];
                } else if (!message.intrim) {//check if its an intrim result, if intrim-> ignore (meant for others as own is false), if not->clear opId
                    delete this.messageIdsPendingAcknowledgement[message.opId];
                }
                //check if its a reply for unsynced, then delete it from unsynced table
                if (message.opId.indexOf('unsynced-') >= 0) {
                    iDB.delete(iDB.TABLES.UNSYNCED, message.opId);
                    console.log('removing unsynced', message.opId);
                }
            }
        } catch (e) {
            console.log(e);
        }
    }

    syncUnsynced() {
        iDB.readSorted(iDB.TABLES.UNSYNCED, 'time', 'desc').then((unsyncedEntries) => {
            if (!unsyncedEntries) {
                return;
            }
            unsyncedEntries.sort(function (a, b) {
                return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0);
            });

            for (var i = 0; i < unsyncedEntries.length; i++) {
                var entry = unsyncedEntries[i].data;
                this.addtoSendQueue(entry);
            }
        });
    }

    disconnect() {
        if (this.client.connected()) {
            this.client.deactivate();
        }
    }
}