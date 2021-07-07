import { EnvState } from './../../../../state/envs.state';
import { Env } from './../../../../models/Envs.model';
import { EnvService } from './../../../../services/env.service';
import { Toaster } from './../../../../services/toaster.service';
import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { map, take, takeUntil } from 'rxjs/operators';
import { UserState } from 'src/app/state/user.state';
import { User } from 'src/app/models/User.model';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Observable, Subject, Subscription, zip } from 'rxjs';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { ApiProjectDetailService } from '../api-project-detail.service';
import { MatDialog } from '@angular/material/dialog';
import { SharingComponent } from 'src/app/components/sharing/sharing.component';
import { Team } from 'src/app/models/Team.model';
import { SharingService } from 'src/app/services/sharing.service';
import { Utils } from 'src/app/services/utils.service';

@Component({
    selector: 'app-project-home',
    templateUrl: './project-home.component.html',
    styleUrls: ['../api-project-detail.component.css']
})
export class ProjectHomeComponent implements OnInit, OnDestroy {
    selectedPROJ: ApiProject;
    authUser: User;
    teams: { [key: string]: Team } = {};
    private _destroy: Subject<boolean> = new Subject<boolean>();
    private projEnv$: Subscription;
    projEnv: Env = null; //auto generated env for this project
    flags = {
        editProj: false,
        loadSecDefTab: false,
        secDefChanged: false,
        settingsChanged: false,
        infoChanged: false
    }

    constructor(
        private toaster: Toaster,
        private dialog: MatDialog,
        private store: Store,
        private router: Router,
        private sharing: SharingService,
        private apiProjService: ApiProjectService,
        private apiProjectDetailService: ApiProjectDetailService,
        private envService: EnvService) {

        this.apiProjectDetailService.onSelectedProj$
            .pipe(takeUntil(this._destroy))
            .subscribe(proj => {
                if (proj) {
                    this.selectedPROJ = proj;
                    this.processSelectedProj();
                }
            })
        this.store.select(UserState.getAuthUser)
            .pipe(takeUntil(this._destroy))
            .subscribe(user => {
                this.authUser = user;
            });



        this.updateApiProject = this.updateApiProject.bind(this);
    }

    processSelectedProj() {
        if ((!this.projEnv$ || this.projEnv$?.closed) && this.selectedPROJ.setting) {
            this.projEnv$ = this.store.select(EnvState.getById)
                .pipe(map(filterFn => filterFn(this.selectedPROJ.setting.envId)))
                // .pipe(take(1))
                .pipe(takeUntil(this._destroy))
                .subscribe(env => { this.projEnv = env; });
        }
        this.teams = Utils.arrayToObj(this.sharing.teams, 'id');
        // this.selectedPROJEndps = getEndpoints(this.selectedPROJ);
        // vm.responses = DesignerServ.getTraitNamedResponses(this.selectedPROJ);
        // //set security definitions
        // vm.securityDefs = this.selectedPROJ.securityDefinitions || [];
        // //reset selection for folders, models, traits and endpoints
        // setCreate();
        // setCreateModel();
        // setCreateTrait();
        // setCreateEndp();

    }

    async updateApiProject(proj) {
        await this.apiProjService.updateAPIProject(proj);
    }

    openExportModal(type, id) {
        this.apiProjectDetailService.exportProj(type, id)
    }

    ngOnInit(): void {
    }

    ngOnDestroy(): void {
        this._destroy.next(true);
        this._destroy.complete();
    }

    async deleteApiProject() {
        if (this.selectedPROJ.owner && this.authUser?.UID !== this.selectedPROJ.owner) {
            this.toaster.error('You can\'t delete this Project as you are not the owner. If you have permission you can edit it though.');
            return;
        }
        var id = this.selectedPROJ._id;
        try {
            await this.apiProjService.deleteAPIProjects([id]);
            if (this.selectedPROJ.setting?.envId) {
                this.envService.deleteEnvs([this.selectedPROJ.setting.envId])
            }

            this.router.navigate(['/designer']);
            this.toaster.success('Project deleted');
            this._destroy.next(true);
            this._destroy.complete();
        } catch (e) {
            this.toaster.error('Failed to delete project');
        }
    }

    tabChange(event: MatTabChangeEvent) {
        if (event.index === 1) this.flags.loadSecDefTab = true
    }

    tabContentModified(status, tab) {
        this.flags[tab] = status?.dirty;
    }

    share() {
        this.dialog.open(SharingComponent, { data: { objId: this.selectedPROJ._id, type: 'APIProject' } });
    }
    unshare(teamId, objId, type) {

    }
}
