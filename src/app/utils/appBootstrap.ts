import { AuthInterceptor } from './AuthInterceptor';
import { Utils } from '../services/utils.service';
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
import { RequestsService } from '../services/requests.service';
import { environment } from 'src/environments/environment';
import { MigrationService } from '../services/migration.service';

@Injectable()
export class AppBootstrap {
    // static httpClient = new HttpClient(new HttpXhrBackend({ build: () => new XMLHttpRequest() }));

    constructor(private httpClient: HttpClient,
        private migrationService: MigrationService,
        private authService: AuthService) {

    }

    async init() {
        //Init window.APP
        window['APP'] = {
            VERSION: environment.VERSION,
            PLATFORM: environment.PLATFORM,
            IS_ELECTRON: Utils.isElectron(),
            TYPE: Utils.getAppType()
        };
        const newVersion = environment.VERSION, oldVersion = LocalStore.get(LocalStore.VERSION);

        //check if the dummy user is registered, otherwise add a dummy user.
        this.addDummyUser();

        //check if the user is logged in
        this.initLoggedinUser();

        //do firstRun
        await this.doFirstRunIfRequired();

        this.migrationService.migrate(newVersion, oldVersion);

        //check if APIC was updated, and show notification
        this.checkUpdate();
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

    private initLoggedinUser() {
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

    private async doFirstRunIfRequired() {
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

            await Promise.all(promises);
            //mark first run complete
            LocalStore.set(LocalStore.FIRST_RUN, true);

        }
    }

    private checkUpdate() {
        //TODO:

    }
}



