import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Store } from "@ngxs/store";
import { BehaviorSubject, Subject } from "rxjs";
import { take } from "rxjs/operators";
import { EnvsAction } from "src/app/actions/envs.action";
import { ConfirmService } from "src/app/directives/confirm.directive";
import { ApiEndp, ApiProject } from "src/app/models/ApiProject.model";
import { Env } from "src/app/models/Envs.model";
import { ReqFolder } from "src/app/models/ReqFolder.model";
import { ApiRequest } from "src/app/models/Request.model";
import { RequestsService } from "src/app/services/requests.service";
import { Toaster } from "src/app/services/toaster.service";
import { Utils } from "src/app/services/utils.service";
import { EnvState } from "src/app/state/envs.state";
import apic from "src/app/utils/apic";
import { RequestUtils } from "src/app/utils/request.util";
import { TesterTab, TesterTabsService } from "../../tester/tester-tabs/tester-tabs.service";

@Injectable()
export class ApiProjectDetailService {
    constructor(
        private testerTabService: TesterTabsService,
        private store: Store,
        private toaster: Toaster,
        private requestsService: RequestsService,
        private router: Router,
        private confirmService: ConfirmService
    ) {

    }

    private _onExportProj = new Subject<any>();
    onExportProj$ = this._onExportProj.asObservable();
    exportProj(type, id) {
        this._onExportProj.next([type, id]);
    }

    onSelectedProj$ = new BehaviorSubject<ApiProject>(null);
    selectProj(proj: ApiProject) {
        this.onSelectedProj$.next(proj);
    }

    async runEndp(endpId: string, project: ApiProject, mock = false) {
        let endp: ApiEndp = project.endpoints[endpId];
        let request: ApiRequest = RequestUtils.endpointToApiRequest(endp, project, mock);
        let tabName = 'Endpoint: '
        if (mock) {
            tabName = 'Mock: '
        }

        let tab: TesterTab = {
            action: 'add', type: 'req', name: tabName + endp.summary, data: request, id: 'new_tab:' + apic.s8()
        };
        this.router.navigate(['/', 'tester'])
        setTimeout(() => {
            this.testerTabService.addTab(tab);
        }, 0);
        //select the environment for this project which is auto created while saving settings.
        if (project.setting?.envId) {
            let selectedEnv: Env = await this.store.select(EnvState.getSelected)
                .pipe(take(1)).toPromise();
            if (selectedEnv?._id !== project.setting?.envId) {
                this.store.dispatch(new EnvsAction.Select(project.setting.envId));
                this.toaster.info('Selected env has been changes to this project\'s environment.')
            }
        }
    }

    async buildRequests(proj: ApiProject) {

        if (!proj.setting?.host) {
            this.toaster.error('This project doesn\'t have the host name set. Please move to the project\'s home and set it under settings.');
            return;
        }
        await this.confirmService.confirm({
            confirmTitle: 'Build Confirmation',
            confirm: `Endpoints are automatically available as requests to run in tester section. Do you still want to build the requests and save it in a folder?`,
            confirmOk: 'Build',
            confirmCancel: 'Cancel',
        });

        try {
            var folder = {
                name: 'Project: ' + proj.title,
                desc: proj.description
            };

            //create parent folder
            let parentFolder = await this.requestsService.createFolder(folder, true);

            //create subfolders if it contains an endpoint & endpoint itself
            let requests: ApiRequest[] = [];
            let subFolders: { [key: string]: ReqFolder } = {};
            let endpoints = Utils.objectValues(proj.endpoints);
            for (const endp of endpoints) {
                //if it belongs to a folder and its not already created then create it
                if (endp.folder && !subFolders[endp.folder]) {
                    var f = proj.folders[endp.folder];
                    var subFolder: ReqFolder = {
                        name: f.name,
                        desc: f.desc,
                        parentId: parentFolder._id
                    };
                    let createdFolder = await this.requestsService.createFolder(subFolder, true);
                    subFolders[f._id] = createdFolder;
                }
                let req: ApiRequest = RequestUtils.endpointToApiRequest(endp, proj);
                if (endp.folder) {
                    req._parent = subFolders[endp.folder]._id;
                } else {
                    req._parent = parentFolder._id;
                }
                requests.push(req);
            }

            await Promise.all(requests.map(async (req) => {
                return await this.requestsService.createRequest(req);
            }));
            this.toaster.success('Requests built. Head to tester section to run the saved request.')
        } catch (e) {
            console.error('Failed to build.', e);
            this.toaster.error(`Failed to build requests: ${e?.message || e || ''}`)
        }

    }
}