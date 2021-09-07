import { Toaster } from './../../../../services/toaster.service';
import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ApiProject, ApiFolder, NewApiFolder, ApiModel, ApiEndp, ApiTrait } from 'src/app/models/ApiProject.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import apic from '../../../../utils/apic';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { Utils } from 'src/app/services/utils.service';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, Subject, zip } from 'rxjs';
import { Store } from '@ngxs/store';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';
import { take, takeUntil } from 'rxjs/operators';
import { User } from 'src/app/models/User.model';
import { ApiProjectDetailService } from '../api-project-detail.service';
import { ApiProjectService } from 'src/app/services/apiProject.service';

@Component({
    selector: 'app-project-folder',
    templateUrl: './project-folder.component.html',
    styleUrls: ['../api-project-detail.component.scss']
})
export class ProjectFolderComponent implements OnInit, OnDestroy {
    selectedPROJ: ApiProject;
    authUser: User;
    selectedFolder: ApiFolder = null;
    folderForm: FormGroup;
    private _destroy: Subject<boolean> = new Subject<boolean>();

    constructor(
        private fb: FormBuilder,
        private toaster: Toaster,
        private confirmService: ConfirmService,
        private apiProjService: ApiProjectService,
        private apiProjectDetailService: ApiProjectDetailService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.folderForm = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(30)]],
            desc: ['', Validators.maxLength(400)]
        });

        this.apiProjectDetailService.onSelectedProj$
            .pipe(takeUntil(this._destroy))
            .subscribe(project => {
                this.selectedPROJ = project;
                if (this.selectedFolder) {
                    this.handleFolderSelect(this.selectedFolder._id);
                }
            })

        this.route.params
            .pipe(takeUntil(this._destroy))
            .subscribe(({ folderId }) => {
                this.handleFolderSelect(folderId);
            })
    }

    private handleFolderSelect(folderId: string) {
        this.selectedFolder = this.selectedPROJ?.folders?.[folderId];
        if (!this.selectedFolder) {
            if (folderId?.toLocaleLowerCase() !== 'NEW'.toLocaleLowerCase()) {
                // this.toaster.warn('Selected folder doesn\'t exist.');
                this.router.navigate(['../', 'new'], { relativeTo: this.route });
                return;
            } else {
                this.selectedFolder = NewApiFolder;
            }
        }
        const { name, desc } = this.selectedFolder;
        this.folderForm.patchValue({ name, desc });
        this.folderForm.markAsPristine();
        this.folderForm.markAsUntouched();
    }

    async createFolder() {
        if (!this.folderForm.valid) return;

        const folder: ApiFolder = { _id: this.isEditing() ? this.selectedFolder._id : new Date().getTime() + apic.s8(), ...this.folderForm.value };

        if (this.checkExistingFolder(folder.name) && !this.isEditing()) {
            this.toaster.error(`Folder ${folder.name} already exists`);
            return;
        }

        var projToUpdate: ApiProject = { ...this.selectedPROJ, folders: { ...this.selectedPROJ.folders, [folder._id]: folder } };
        try {
            await this.apiProjService.updateAPIProject(projToUpdate)
            this.folderForm.markAsPristine();
            this.folderForm.markAsUntouched();
            if (this.isEditing()) {
                this.toaster.success('Folder updated.');
                this.selectedFolder = folder;
            } else {
                this.router.navigate(['../', folder._id], { relativeTo: this.route })
                this.toaster.success('Folder created.');
            }
        } catch (e) {
            console.error('Failed to create/update folder', e, folder)
            this.toaster.error(`Failed to create/update folder: ${e?.message || e || ''}`);
        }
    }

    deleteFolder(id: string) {
        if (!id || !this.selectedPROJ.folders)
            return;

        const { [id]: folderToRemove, ...remainingFolders } = this.selectedPROJ.folders;
        let project: ApiProject = { ...this.selectedPROJ, folders: remainingFolders }

        this.confirmService.confirm({
            confirmTitle: 'Delete Confirmation',
            confirm: `Do you want to delete the folder '${this.selectedPROJ.folders[id].name}'?`,
            confirmOk: 'Delete',
            confirmCancel: 'Cancel'
        }).then(async () => {

            delete project.folders[id];
            if (project.endpoints) {
                let updatedEndps: ApiEndp[] = Object.values(project.endpoints).map((endp: ApiEndp) => {
                    return { ...endp, folder: endp.folder === id ? '' : endp.folder }
                })
                project = { ...project, endpoints: Utils.arrayToObj(updatedEndps, '_id') };
            }
            if (project.models) {
                let updatedModels: ApiModel[] = Object.values(project.models).map((model: ApiModel) => {
                    return { ...model, folder: model.folder === id ? '' : model.folder }
                })
                project = { ...project, models: Utils.arrayToObj(updatedModels, '_id') };
            }

            if (project.traits) {
                let updatedTraits: ApiTrait[] = Object.values(project.traits).map((trait: ApiTrait) => {
                    return { ...trait, folder: trait.folder === id ? '' : trait.folder }
                })
                project = { ...project, traits: Utils.arrayToObj(updatedTraits, '_id') };
            }

            try {
                await this.apiProjService.updateAPIProject(project)
                this.toaster.success('Folder deleted.');
                this.folderForm.markAsPristine();
                this.router.navigate(['../', 'new'], { relativeTo: this.route })
            } catch (e) {
                console.error('Failed to delete folder', e);
                this.toaster.error(`Failed to delete folder: ${e?.message || e || ''}`);
            }
        })

    }

    private checkExistingFolder(name: string) {
        if (!name)
            return undefined;
        var foundId: string;
        if (this.selectedPROJ.folders) {
            this.selectedPROJ.folders && Object.keys(this.selectedPROJ.folders).forEach(id => {
                if (this.selectedPROJ.folders[id].name.toLowerCase() === name.toLowerCase())
                    foundId = id;
            })
        }
        return foundId;
    }

    canDeactivate() {
        return new Promise<boolean>((resolve) => {
            if (this.folderForm.dirty) {
                this.confirmService.confirm({
                    confirmTitle: 'Unsaved data !',
                    confirm: 'Folders view has some unsaved data. Current action will discard any unsave changes.',
                    confirmOk: 'Discard',
                    confirmCancel: 'No, let me save'
                }).then(() => {
                    resolve(true)
                }).catch(() => {
                    resolve(false)
                })
            } else {
                resolve(true)
            }
        })
    }

    isEditing() {
        return !(this.selectedFolder._id === 'NEW');
    }

    ngOnDestroy(): void {
        this._destroy.next(true);
        this._destroy.complete();
    }

    ngOnInit(): void {
    }
}
