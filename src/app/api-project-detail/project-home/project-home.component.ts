import { ApiProjectState } from 'src/app/state/apiProjects.state';
import { EnvState } from './../../state/envs.state';
import { Env } from './../../models/Envs.model';
import { EnvService } from './../../services/env.service';
import { ApiProjectService } from './../../services/apiProject.service';
import { Toaster } from './../../services/toaster.service';
import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { map, take } from 'rxjs/operators';
import { UserState } from 'src/app/state/user.state';
import { User } from 'src/app/models/User.model';
import { MatTabChangeEvent } from '@angular/material/tabs';

@Component({
    selector: 'app-project-home',
    templateUrl: './project-home.component.html',
    styleUrls: ['../api-project-detail.component.css']
})
export class ProjectHomeComponent implements OnInit, OnChanges {
    @Input() selectedPROJ: ApiProject;
    @Input() updateApiProject: Function;
    // @Input() openExportModal: Function;
    @Output() changeStageEmitter = new EventEmitter<number>();
    @Output() onExport: EventEmitter<any> = new EventEmitter();

    projDetailForm: FormGroup;
    authUser: User;
    projEnv: Env = null; //auto generated env for this project
    flags = {
        editProj: false,
        loadSecDefTab: false,
        secDefChanged: false,
        settingsChanged: false
    }

    constructor(
        private store: Store,
        private toaster: Toaster,
        private router: Router,
        fb: FormBuilder,
        private apiProjectService: ApiProjectService,
        private envService: EnvService) {

        this.store.select(UserState.getAuthUser).subscribe(user => {
            this.authUser = user;
        });

        this.projDetailForm = fb.group({
            title: ['', Validators.required],
            version: ['', Validators.required],
            description: [''],
            termsOfService: [''],
            license: fb.group({
                name: [''],
                url: ['']
            }),
            contact: fb.group({
                name: [''],
                url: [''],
                email: ['']
            })
        })
    }
    ngOnChanges(changes: SimpleChanges): void {
        if (changes.hasOwnProperty('selectedPROJ')) {
            this.selectedPROJ = changes.selectedPROJ.currentValue;
            this.selectProject()
        }
    }

    selectProject() {
        // vm.leftTree = {};
        // vm.responses = [];
        this.resetProjInfoEdit();
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

    deleteProj() {
        if (this.selectedPROJ.owner && this.authUser?.UID !== this.selectedPROJ.owner) {
            this.toaster.error('You can\'t delete this Project as you are not the owner. If you have permission you can edit it though.');
            return;
        }
        var id = this.selectedPROJ._id;
        this.apiProjectService.deleteAPIProjects([id]).then(() => {

            if (this.selectedPROJ.setting?.envId) {
                this.envService.deleteEnvs([this.selectedPROJ.setting.envId])
            }

            this.router.navigate(['/designer']);
            this.toaster.success('Project deleted');
        }, () => {
            this.toaster.error('Failed to delete project');
        });
    }

    saveProjEdit() {
        if (!this.projDetailForm.valid) return;
        const formValue = this.projDetailForm.value;
        let envUpdateRequired = false;

        if (this.selectedPROJ.title !== formValue.title && this.selectedPROJ.setting) envUpdateRequired = true;

        var toSave: ApiProject = { ...this.selectedPROJ, ...formValue };

        this.updateApiProject(toSave).then(() => {
            this.flags.editProj = false;
            this.toaster.success('Project details updated');
            if (envUpdateRequired) {
                this.projEnv.name = toSave.title + '-env';
                this.projEnv.proj.name = toSave.title;
                this.envService.updateEnv(this.projEnv);
            }
        });
    }




    changeStage(name) {
        this.changeStageEmitter.emit(name);
    }

    resetProjInfoEdit() {
        this.projDetailForm.patchValue({
            title: this.selectedPROJ.title,
            version: this.selectedPROJ.version,
            description: this.selectedPROJ.description,
            termsOfService: this.selectedPROJ.termsOfService,
            license: {
                name: this.selectedPROJ.license ? this.selectedPROJ.license.name : '',
                url: this.selectedPROJ.license ? this.selectedPROJ.license.url : ''
            },
            contact: {
                name: this.selectedPROJ.contact ? this.selectedPROJ.contact.name : '',
                url: this.selectedPROJ.contact ? this.selectedPROJ.contact.url : '',
                email: this.selectedPROJ.contact ? this.selectedPROJ.contact.email : ''
            }
        });
    }

    openExportModal(type, id) {
        this.onExport.emit([type, id])
    }

    ngOnInit(): void {
        this.selectProject();
    }

    tabChange(event: MatTabChangeEvent) {
        if (event.index === 1) this.flags.loadSecDefTab = true
    }

    secDefChanged(status) {
        this.flags.secDefChanged = status?.dirty;
    }
    settingsChanged(status) {
        this.flags.settingsChanged = status?.dirty;
    }

    tabContentModified(status, tab) {
        this.flags[tab] = status?.dirty;
    }
}
