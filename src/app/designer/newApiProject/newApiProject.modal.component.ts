import { ApiProjectService } from '../../services/apiProject.service';
import { Toaster } from '../../services/toaster.service';
import { ApiProject } from '../../models/ApiProject.model';
import { Component } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'new-api-project-modal',
    templateUrl: './newApiProject.modal.component.html',
})
export class NewApiProjectModal {
    form: FormGroup;
    flags: any = {
        license: false,
        contact: false
    }


    constructor(fb: FormBuilder, private toaster: Toaster, private apiProjectService: ApiProjectService, public dialogRef: MatDialogRef<NewApiProjectModal>) {
        this.form = fb.group({
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

        });
    }

    async onSubmit() {
        if (!this.form.valid) return;
        const newProject: ApiProject = {
            _id: null,
            ...this.form.value
        }
        console.log(newProject);
        try {
            const id = await this.apiProjectService.addProject(newProject);
            if (id) {
                this.toaster.success('Project created.');
                this.dialogRef.close();
            } else {
                this.toaster.error(`Failed to create project.`);
            }
        } catch (error) {
            this.toaster.error(`Failed to create project: ${error.mesage}`);
        }
    }
}