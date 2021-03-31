import { AuthInterceptor } from './AuthInterceptor';
//@ts-check
import Utils from './helpers'
import { HttpClient, HttpXhrBackend } from '@angular/common/http';
// import TeamService from '../services/TeamsService';
// import TeamsState from '../state/atoms/Teams'
import { ApicUrls, DemoData } from './constants';
import apic from './apic';
import iDB from '../services/IndexedDB';
import { Injectable } from '@angular/core';
import { ApiProjectService } from '../services/apiProject.service';
import { EnvService } from '../services/env.service';
import LocalStore from '../services/localStore';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AppBootstrap {
    // static httpClient = new HttpClient(new HttpXhrBackend({ build: () => new XMLHttpRequest() }));

    constructor(private httpClient: HttpClient, private apiProjectService: ApiProjectService, private envService: EnvService, private authService: AuthService) {

    }

    async init() {
        //Init window.APP
        window['APP'] = {
            VERSION: '2.0.0',
            PLATFORM: 'WEB',
            IS_ELECTRON: Utils.isElectron(),
            TYPE: Utils.getAppType()
        };

        //add addHeader function to XMLHttpRequest prototype
        Utils.initXMLHttpRequest();

        //check if the dummy user is registered, otherwise add a dummy user.
        await this.addDummyUser();

        //check if the user is logged in
        await this.initLoggedinUser();

        //do firstRun
        this.doFirstRun()

        //check if APIC was updated, and show notification
        this.checkUpdate();

        //puts test code snippets in rootScope
    }

    private async addDummyUser() {
        //check if the dummy user is registered, otherwise add a dummy user.
        const userId = LocalStore.get(LocalStore.USER_ID);
        var body = {
            id: apic.uuid(),
            platform: window['APP'].TYPE,
            existing: false
        }
        if (userId) {
            body.id = userId;
            body.existing = true;
        }
        try {
            const respData: any = await this.httpClient.post(ApicUrls.registerDummy, body).toPromise();
            if (respData.resp) {
                LocalStore.set(LocalStore.USER_ID, respData.resp.id);
            }
        } catch (e) {
            console.error('Failed to add dummy user', e);
        }
    }

    private async initLoggedinUser() {
        this.authService.initLoggedinUser();
        // const data = LocalStore.getMany([LocalStore.UID, LocalStore.AUTH_TOKEN]);
        // if (data?.UID && data?.authToken) { //user is logged in
        //     this.authService.refreshFromLocal();
        //     this.authService.connectToSyncServer()

        //     AuthInterceptor.AUTH_HEADER = data.UID + '||' + data.authToken;

        //     // TeamService.getList(true).then(function (data) {
        //     //     const setTeams = useSetRecoilState(TeamsState);
        //     //     if (data && data.resp && data.resp.length) {

        //     //         var teams = {};
        //     //         for (var i = 0; i < data.resp.length; i++) {
        //     //             teams[data.resp[i].id] = data.resp[i].name;
        //     //         }
        //     //         setTeams(() => teams);
        //     //     } else {
        //     //         setTeams(() => { })
        //     //     }
        //     // });

        //     //TODO: 
        //     // ngSockJs.connect({ 'Auth-Token': data.UID + '||' + data.authToken }).then(function () {
        //     //     //get the last synced time
        //     //     //no need to do these. The are handeled once socket is connected onSocketConnected();
        //     //     /*iDB.findByKey('setting', '_id', 'lastSynced').then(function (data){
        //     //         console.log('lastsybced', data);
        //     //         var ts = 0;//new Date().getTime();

        //     //         if(data && data.time){
        //     //             ts = data.time;
        //     //         }
        //     //         //SyncIt.fetch('fetchAll', ts);
        //     //         //SyncIt.syncUnsynced();
        //     //     });*/
        //     // });
        // }
    }

    private async doFirstRun() {
        //detect for first run of APIC
        const firstRun = LocalStore.get(LocalStore.FIRST_RUN);

        if (!firstRun) { //first run
            // TODO: $rootScope.openIntroModal();
            var promises = [];

            var pr1 = iDB.upsert('ApiProjects', DemoData.demoDesignProj), //install Demo design project
                pr2 = iDB.upsert('Environments', DemoData.demoEnv), //add the environment for the project
                //pr3 = iDB.upsert('folders', DemoData.demoFolder), //add Requests folder
                //pr4 = iDB.upsert('savedRequests', DemoData.demoReqs), //add Requests
                pr5 = iDB.upsert('Projects', DemoData.demoTestProj), //create the test project
                pr6 = iDB.upsert('TestSuits', DemoData.demoSuit); //add the test suit

            promises.push(pr1);
            promises.push(pr2);
            // promises.push(pr3);
            // promises.push(pr4);
            promises.push(pr5);
            promises.push(pr6);
            Promise.all(promises).then(() => {
                //TODO: 
                //add the demo environment in rootScope
                // if (!$rootScope.ENVS) {
                //     $rootScope.ENVS = [];
                // }
                // $rootScope.ENVS.push(DemoData.demoEnv);
                //mark first run complete
                LocalStore.set(LocalStore.FIRST_RUN, true);
                this.apiProjectService.getApiProjs();
                this.envService.getAllEnvs();
                //TODO: do get all for others
            });
        }
    }

    private checkUpdate() {

        const version = LocalStore.get(LocalStore.VERSION);
        if (version) {
            if (Utils.isNewVersion(window['APP'].VERSION, version)) {
                Utils.notify('APIC Updated', 'Apic has been updated to a new version (' + window['APP'].VERSION + ').', 'https://apic.app/changelog.html');
            }
        }
        LocalStore.set(LocalStore.VERSION, window['APP'].VERSION);
    }
}



