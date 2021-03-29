import { Toaster } from './../../services/toaster.service';
import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import Helpers from '../../utils/helpers';
import apic from '../../utils/apic';
import { ConfirmService } from 'src/app/directives/confirm.directive';

@Component({
    selector: 'app-project-folder',
    templateUrl: './project-folder.component.html',
    styleUrls: ['../api-project-detail.component.css']
})
export class ProjectFolderComponent implements OnInit {
    @Input() selectedPROJ: ApiProject;
    @Input() updateApiProject: Function;
    @Output() projectUpdated = new EventEmitter<any>();//TODO:remove this

    folderForm: FormGroup;
    selectedFolder: string = 'NEW';
    selectedName: string

    constructor(private fb: FormBuilder, private toaster: Toaster, private confirmService: ConfirmService) {
        this.folderForm = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(30)]],
            desc: ['', Validators.maxLength(400)]
        });
        this.selectedName = 'Create new folder';
    }

    ngOnInit(): void {
    }

    isEditing() {
        return !(this.selectedFolder === 'NEW');
    }

    createFolder() {
        if (!this.folderForm.valid) return;

        const folder = this.folderForm.value;

        if (this.checkExistingFolder(folder.name) && !this.isEditing()) {
            this.toaster.error(`Folder ${folder.name} already exists`);
            return;
        }
        if (!this.selectedPROJ.folders) {
            this.selectedPROJ.folders = {};
        }
        if (this.isEditing()) { //editing folder
            folder._id = this.selectedFolder;
            this.selectedPROJ.folders[folder._id].name = folder.name;
            this.selectedPROJ.folders[folder._id].desc = folder.desc;
        } else {
            folder._id = new Date().getTime() + apic.s8();
            this.selectedPROJ.folders[folder._id] = Helpers.deepCopy(folder);
        }
        this.updateApiProject(this.selectedPROJ).then((data) => {
            this.folderForm.markAsPristine();
            this.folderForm.markAsUntouched();
            this.selectedName = folder.name;
            if (this.isEditing()) {
                this.toaster.success('Folder updated');
            } else {
                this.toaster.success('Folder created');
                // this.projectUpdated.next({ folder: folder._id });
            }
            this.selectedFolder = folder._id;
        }, (e) => {
            console.error('Failed to create/update folder', e, folder)
            this.toaster.error(`Failed to create/update folder: ${e.message}`);
        });
    }

    selectFolder(folderId: string) {
        console.log('selecting folder: ', folderId);
        if (this.folderForm.dirty) {
            this.confirmService.confirm({
                confirmTitle: 'Unsaved data !',
                confirm: 'The Folders view has some unsaved data. Do you want to replace it with your current selection?',
                confirmOk: 'Replace',
                confirmCancel: 'No, let me save'
            }).then(() => {
                this.handleFolderSelect(folderId);
            }).catch(() => {
                console.log('Selected to keep the changes');
            })
        } else {
            this.handleFolderSelect(folderId);
        }
    }

    private handleFolderSelect(folderId: string) {
        this.selectedFolder = folderId;
        if (folderId === 'NEW') {
            this.folderForm.patchValue({
                name: '',
                desc: ''
            });
            this.selectedName = 'Create new folder';
        } else {
            const { name, desc } = this.selectedPROJ.folders[folderId];
            this.folderForm.patchValue({ name, desc });
            this.selectedName = name;
            this.folderForm.markAsPristine();
            this.folderForm.markAsUntouched();
        }
    }

    deleteFolder(id) {
        if (!id || !this.selectedPROJ.folders)
            return;

        const project: ApiProject = Helpers.deepCopy(this.selectedPROJ);

        this.confirmService.confirm({
            confirmTitle: 'Delete Confirmation',
            confirm: `Do you want to delete the folder '${project.folders[id].name}'?`,
            confirmOk: 'Delete',
            confirmCancel: 'Cancel'
        }).then(() => {

            delete project.folders[id];
            //TODO: test this
            project.endpoints && Object.values(project.endpoints).forEach((endp: any) => {
                if (endp.folder === id) endp.folder = '';
            })
            project.models && Object.values(project.models).forEach((model: any) => {
                if (model.folder === id) model.folder = '';
            })
            project.traits && Object.values(project.traits).forEach((trait: any) => {
                if (trait.folder === id) trait.folder = '';
            })

            this.updateApiProject(project).then(() => {
                this.toaster.success('Folder deleted.');
                this.folderForm.markAsPristine();
                this.selectFolder('NEW');
                // this.projectUpdated.next({ folder: id });
            }, (e) => {
                console.log('Failed to delete folder', e);
                this.toaster.error(`Failed to delete folder: ${e.message}`);
            });
        })

    }

    private checkExistingFolder(name) {
        if (!name)
            return undefined;
        var foundId;
        if (this.selectedPROJ.folders) {
            this.selectedPROJ.folders && Object.keys(this.selectedPROJ.folders).forEach(id => {
                if (this.selectedPROJ.folders[id].name.toLowerCase() === name.toLowerCase())
                    foundId = id;
            })
        }
        return foundId;
    }

}
