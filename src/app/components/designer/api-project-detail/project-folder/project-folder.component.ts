import { Toaster } from './../../../../services/toaster.service';
import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ApiProject, ApiFolder, NewApiFolder, ApiModel, ApiEndp, ApiTrait } from 'src/app/models/ApiProject.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import apic from '../../../../utils/apic';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { Utils } from 'src/app/services/utils.service';

@Component({
    selector: 'app-project-folder',
    templateUrl: './project-folder.component.html',
    styleUrls: ['../api-project-detail.component.css']
})
export class ProjectFolderComponent implements OnInit, OnChanges {
    @Input() selectedPROJ: ApiProject;
    @Input() updateApiProject: Function;

    folderForm: FormGroup;
    selectedFolder: ApiFolder = null;
    selectedName: string

    constructor(private fb: FormBuilder, private toaster: Toaster, private confirmService: ConfirmService) {
        this.folderForm = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(30)]],
            desc: ['', Validators.maxLength(400)]
        });
        this.openNewFolder()
    }
    ngOnChanges(changes: SimpleChanges): void {
        if (changes.selectedPROJ?.currentValue && this.selectedFolder) {
            setTimeout(() => {
                this.openFolderById(this.selectedFolder._id)
            }, 0);
        }
    }

    ngOnInit(): void {
    }

    isEditing() {
        return !(this.selectedFolder._id === 'NEW');
    }

    createFolder() {
        if (!this.folderForm.valid) return;

        const folder: ApiFolder = { _id: this.isEditing() ? this.selectedFolder._id : new Date().getTime() + apic.s8(), ...this.folderForm.value };

        if (this.checkExistingFolder(folder.name) && !this.isEditing()) {
            this.toaster.error(`Folder ${folder.name} already exists`);
            return;
        }

        var projToUpdate: ApiProject = { ...this.selectedPROJ, folders: { ...this.selectedPROJ.folders, [folder._id]: folder } };
        this.updateApiProject(projToUpdate).then((data) => {
            this.selectedName = folder.name;
            if (this.isEditing()) {
                this.toaster.success('Folder updated');
            } else {
                this.toaster.success('Folder created');
            }
            this.folderForm.markAsPristine();
            this.folderForm.markAsUntouched();
            this.selectedFolder._id = folder._id;
        }, (e) => {
            console.error('Failed to create/update folder', e, folder)
            this.toaster.error(`Failed to create/update folder: ${e.message}`);
        });
    }

    openNewFolder() {
        this.openFolder(NewApiFolder);
    }

    openFolderById(folderIdToOpen: string) {
        const folderToOpen: ApiFolder = this.selectedPROJ?.folders?.[folderIdToOpen] || NewApiFolder;
        this.openFolder(folderToOpen)
    }

    private openFolder(folderToOpen: ApiFolder) {
        if (this.folderForm.dirty) {
            this.confirmService.confirm({
                confirmTitle: 'Unsaved data !',
                confirm: 'The Folders view has some unsaved data. Do you want to replace it with your current selection?',
                confirmOk: 'Replace',
                confirmCancel: 'No, let me save'
            }).then(() => {
                this.handleFolderSelect(folderToOpen);
            }).catch(() => {
                console.info('Selected to keep the changes');
            })
        } else {
            this.handleFolderSelect(folderToOpen);
        }
    }

    private handleFolderSelect(folderToOpen: ApiFolder) {
        this.selectedFolder = { ...folderToOpen };
        const { name, desc } = folderToOpen;
        this.folderForm.patchValue({ name, desc });
        this.selectedName = name || 'Create new folder';
        this.folderForm.markAsPristine();
        this.folderForm.markAsUntouched();
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
        }).then(() => {

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

            this.updateApiProject(project).then(() => {
                this.toaster.success('Folder deleted.');
                this.folderForm.markAsPristine();
                this.openFolder(NewApiFolder);
            }, (e) => {
                console.error('Failed to delete folder', e);
                this.toaster.error(`Failed to delete folder: ${e.message}`);
            });
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

}
