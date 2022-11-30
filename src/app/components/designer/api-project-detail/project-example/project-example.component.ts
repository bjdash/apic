import { Component, OnInit } from '@angular/core';

import { ApiExample, ApiProject, NewApiExample } from 'src/app/models/ApiProject.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Toaster } from 'src/app/services/toaster.service';
import { ConfirmService } from 'src/app/directives/confirm.directive'; import apic from '../../../../utils/apic';
import { ApiProjectService } from 'src/app/services/apiProject.service'; import { ApiProjectDetailService } from '../api-project-detail.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
    selector: 'app-project-example',
    templateUrl: './project-example.component.html',
    styleUrls: ['../api-project-detail.component.scss']
})

export class ProjectExampleComponent {
    selectedPROJ: ApiProject;
    selectedExample: ApiExample = null;
    exampleForm: FormGroup;
    flags = {
        mode: 'json'
    }
    constructor(
        private fb: FormBuilder,
        private toaster: Toaster,
        private confirmService: ConfirmService,
        private apiProjService: ApiProjectService,
        private apiProjectDetailService: ApiProjectDetailService,
        private route: ActivatedRoute,
        private router: Router
    ) {

        this.exampleForm = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z0-9\-\_]+$/)]],
            summary: [[]],
            folder: [''],
            description: [''],
            valueInline: [''],
            valueExternal: [''],
            value$ref: [''],
            valueType: ['inline']
        });

        this.apiProjectDetailService.onSelectedProj$
            .pipe(untilDestroyed(this))
            .subscribe(project => {
                this.selectedPROJ = project;
                if (this.selectedExample) {
                    this.handleExampleSelect(this.selectedExample._id);
                }
            })

        this.route.params
            .pipe(untilDestroyed(this))
            .subscribe(({ exampleId }) => {
                this.handleExampleSelect(exampleId);
            })

    }

    private handleExampleSelect(exampleId: string) {
        this.selectedExample = this.selectedPROJ?.examples?.[exampleId];
        if (!this.selectedExample) {
            if (exampleId?.toLocaleLowerCase() !== 'NEW'.toLocaleLowerCase()) {
                // this.toaster.warn('Selected folder doesn\'t exist.');
                this.router.navigate(['../', 'new'], { relativeTo: this.route });
                return;
            } else {
                this.selectedExample = NewApiExample;
            }
        }

        const { name, summary, folder, description, value, valueType } = this.selectedExample;
        let patchvalue = { name, summary, folder, description, valueType, valueInline: '', valueExternal: '', value$ref: '' }

        if (valueType == '$ref') {
            patchvalue.value$ref = value;
        } else if (valueType === 'inline') {
            if (typeof value === 'string') {
                this.flags.mode = 'text'
                patchvalue.valueInline = value;
            } else {
                patchvalue.valueInline = JSON.stringify(value, undefined, '\t');
                this.flags.mode = 'json'
            }
        } else if (valueType === 'external') {
            patchvalue.valueExternal = value;
        }

        this.exampleForm.patchValue(patchvalue);
        this.exampleForm.markAsPristine();
        this.exampleForm.markAsUntouched();
    }

    async createExample(allowDup?: boolean) {
        if (!this.exampleForm.valid) return;
        let { name, summary, folder, description, valueType, valueInline, valueExternal, value$ref } = this.exampleForm.value;
        const example: ApiExample = {
            _id: this.isEditing() ? this.selectedExample._id : new Date().getTime() + apic.s8(),
            name,
            summary,
            folder,
            description,
            valueType
        };

        if (this.checkExistingExample(example.name) && !this.isEditing() && !allowDup) {
            this.toaster.error(`Example ${example.name} already exists`);
            return;
        }

        switch (example.valueType) {
            case 'inline':
                if (this.flags.mode === 'json') {
                    try {
                        example.value = JSON.parse(valueInline)
                    } catch (e) {
                        this.toaster.error(`Invalid JSON value ${e.message}`);
                        return;
                    }
                } else {
                    example.value = valueInline
                }
                break;
            case 'external':
                example.value = valueExternal;
                break;
            case '$ref':
                example.value = value$ref;
                break;
        }

        var projToUpdate: ApiProject = { ...this.selectedPROJ, examples: { ...this.selectedPROJ.examples, [example._id]: example } };
        try {
            await this.apiProjService.updateAPIProject(projToUpdate);
            this.exampleForm.markAsPristine();
            this.exampleForm.markAsUntouched();
            if (this.isEditing()) {
                this.toaster.success('Example updated.');
                this.selectedExample = example;
            } else {
                this.router.navigate(['../', example._id], { relativeTo: this.route });
                this.toaster.success('Example created.');;
            }
        } catch (e) {
            console.error('Failed to create/update example', e, example);
            this.toaster.error(`Failed to create / update example: ${e?.message || e || ''} `);
        }
    }

    deleteExample(exampleId: string) {
        if (!exampleId || !this.selectedPROJ.examples) return;

        const { [exampleId]: exampleToRemove, ...remainingExamples } = this.selectedPROJ.examples;
        let project: ApiProject = { ...this.selectedPROJ, examples: remainingExamples }

        this.confirmService
            .confirm({
                confirmTitle: 'Delete Confirmation',
                confirm: `Do you want to delete the example '${exampleToRemove.name}'?`,
                confirmOk: 'Delete',
                confirmCancel: 'Cancel'
            })
            .then(async () => {
                delete project.examples[exampleId];
                try {
                    await this.apiProjService.updateAPIProject(project)
                    this.toaster.success('Example deleted.');
                    this.exampleForm.markAsPristine();
                    this.router.navigate(['../', 'new'], { relativeTo: this.route })
                } catch (e) {
                    console.error('Failed to delete example', e);
                    this.toaster.error(`Failed to delete example: ${e?.message || e || ''}`);
                }
            });
    }

    canDeactivate() {
        return new Promise<boolean>((resolve) => {
            if (this.exampleForm.dirty) {
                this.confirmService.confirm({
                    confirmTitle: 'Unsaved data !',
                    confirm: 'Examples view has some unsaved data.Current action will discard any unsave changes.',
                    confirmOk: 'Discard',
                    confirmCancel: 'No, let me save'
                })
                    .then(() => {
                        resolve(true)
                    }).catch(() => {
                        resolve(false)
                    })
            } else {
                resolve(true)
            }
        })
    }

    checkExistingExample(name: string): boolean {
        if (!name) return false;
        return this.selectedPROJ?.examples && Object.values(this.selectedPROJ.examples).find((example: ApiExample) => example.name.toLowerCase() === name.toLowerCase()) !== undefined;
    }

    discardChange() {
        this.handleExampleSelect(this.selectedExample._id);
    }

    isEditing() {
        return !(this.selectedExample._id === 'NEW');
    }

    setDirty() {
        this.exampleForm.markAsDirty();
    }

}
