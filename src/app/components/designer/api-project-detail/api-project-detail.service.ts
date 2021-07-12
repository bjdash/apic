import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Store } from "@ngxs/store";
import { BehaviorSubject, Subject } from "rxjs";
import { take } from "rxjs/operators";
import { EnvsAction } from "src/app/actions/envs.action";
import { ApiEndp, ApiProject } from "src/app/models/ApiProject.model";
import { Env } from "src/app/models/Envs.model";
import { ApiRequest } from "src/app/models/Request.model";
import { Toaster } from "src/app/services/toaster.service";
import { EnvState } from "src/app/state/envs.state";
import apic from "src/app/utils/apic";
import { RequestUtils } from "src/app/utils/request.util";
import { TesterTab, TesterTabsService } from "../../tester/tester-tabs/tester-tabs.service";

@Injectable()
export class ApiProjectDetailService {
    constructor(private testerTabService: TesterTabsService, private store: Store, private toaster: Toaster, private router: Router) {

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
        let request: ApiRequest = RequestUtils.endpointToApiRequest(endp, project);
        let tabName = 'Endpoint: '
        if (mock) {
            request.url = 'https://apic.app/mock/' + project.simKey + (project.setting?.basePath || '') + endp.path;
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
}