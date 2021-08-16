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
import { RequestsService } from '../services/requests.service';
import { environment } from 'src/environments/environment';
import { MigrationService } from '../services/migration.service';
import { ThemesService } from '../services/themes.service';
import { ReqHistoryService } from '../services/reqHistory.service';
import { SuiteService } from '../services/suite.service';
import { HttpService } from '../services/http.service';
import { first } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { IntroComponent } from '../components/intro/intro.component';

@Injectable()
export class AppBootstrap {
    // static httpClient = new HttpClient(new HttpXhrBackend({ build: () => new XMLHttpRequest() }));

    constructor(private httpClient: HttpClient,
        private httpService: HttpService,
        private migrationService: MigrationService,
        private apiProjectService: ApiProjectService,
        private envService: EnvService,
        private reqService: RequestsService,
        private suiteService: SuiteService,
        private themeService: ThemesService,
        private dialog: MatDialog,
        private reqHistoryService: ReqHistoryService) {

    }

    async init() {
        const newVersion = environment.VERSION, oldVersion = LocalStore.get(LocalStore.VERSION);

        //check if the dummy user is registered, otherwise add a dummy user.
        this.addDummyUser();

        //do firstRun
        await this.doFirstRunIfRequired();

        this.migrationService.migrate(newVersion, oldVersion);

        //check if APIC was updated, and show notification
        // this.checkIfUpdated();

        //apply theme
        this.themeService.applyCurrentTheme();

        //read all data from index DB
        this.readAllDbs();
    }

    private async addDummyUser() {
        //check if the dummy user is registered, otherwise add a dummy user.
        this.httpService.addDummyUser()
            .pipe(first())
            .subscribe(respData => {
                LocalStore.set(LocalStore.USER_ID, respData.id);
            });
    }

    async doFirstRunIfRequired() {
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
            this.dialog.open(IntroComponent,
                {
                    disableClose: true,
                    width: '100vw',
                    height: '100vh', maxWidth: '100vw'
                });
        }
    }

    async readAllDbs() {
        return await Promise.all([
            this.apiProjectService.loadApiProjs(),
            this.envService.getAllEnvs(),
            this.reqService.loadFolders(),
            this.reqService.loadRequests(),
            this.reqHistoryService.refresh(),
            this.suiteService.loadTestProjects(),
            this.suiteService.loadTestSuites()
        ])

    }

    // checkIfUpdated() {
    //     let version = LocalStore.get(LocalStore.VERSION) || '0.0.0';
    //     if (MigrationService.isVersionHigher(environment.VERSION, version)) {
    //         Utils.notify('APIC Updated', `Apic has been updated to a new version ${environment.VERSION}.`, 'https://apic.app/changelog.html');
    //     }
    //     LocalStore.set(LocalStore.VERSION, environment.VERSION);
    // }
}



