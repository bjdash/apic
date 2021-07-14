import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { ApiProject, ApiTrait, NewApiTrait } from 'src/app/models/ApiProject.model';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { Toaster } from 'src/app/services/toaster.service';
import apic from '../../../../utils/apic';
import { ApiProjectDetailService } from '../api-project-detail.service';

@Component({
    selector: 'app-project-traits',
    templateUrl: './project-traits.component.html'
})
export class ProjectTraitsComponent implements OnInit, OnDestroy {
    selectedPROJ: ApiProject;
    selectedTrait: ApiTrait = null;
    traitForm: FormGroup;
    editCode: boolean = false;
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
        this.traitForm = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(100)]],
            folder: [''],
            summary: ['', Validators.maxLength(100)],
            queryParams: [undefined],
            headers: [undefined],
            pathParams: [undefined],
            responses: [[]]
        });

        this.apiProjectDetailService.onSelectedProj$
            .pipe(takeUntil(this._destroy))
            .subscribe(project => {
                this.selectedPROJ = project;
                if (this.selectedTrait) {
                    this.handleTraitSelect(this.selectedTrait._id);
                }
            })

        this.route.params
            .pipe(takeUntil(this._destroy))
            .subscribe(({ traitId }) => {
                this.handleTraitSelect(traitId);
            })
    }

    private handleTraitSelect(traitId: string) {
        this.selectedTrait = this.selectedPROJ?.traits?.[traitId];
        if (!this.selectedTrait) {
            if (traitId?.toLocaleLowerCase() !== 'NEW'.toLocaleLowerCase()) {
                // this.toaster.warn('Selected folder doesn\'t exist.');
                this.router.navigate(['../', 'new'], { relativeTo: this.route });
                return;
            } else {
                this.selectedTrait = NewApiTrait;
            }
        }
        let { name, summary, folder, queryParams, headers, pathParams, responses } = this.selectedTrait;
        if (!folder) folder = '';
        this.traitForm.patchValue({ name, summary, folder, queryParams, headers, pathParams, responses: [...responses] });
        this.traitForm.markAsPristine();
        this.traitForm.markAsUntouched();
        this.addDefaultResponse();
    }

    async createTrait(allowDup?: boolean) {
        if (!this.traitForm.valid) return;
        const trait: ApiTrait = { ...this.traitForm.value, _id: this.isEditing() ? this.selectedTrait._id : new Date().getTime() + apic.s8(), };

        if (this.checkExistingTrait(trait.name) && !this.isEditing() && !allowDup) {
            this.toaster.error('Trait ' + trait.name + ' already exists');
            return;
        }

        var projToUpdate: ApiProject = { ...this.selectedPROJ, traits: { ...this.selectedPROJ.traits, [trait._id]: trait } };

        try {
            await this.apiProjService.updateAPIProject(projToUpdate)
            this.traitForm.markAsPristine();
            this.traitForm.markAsUntouched();

            if (this.isEditing()) {
                this.toaster.success('Trait updated');
                this.selectedTrait = trait;
            } else {
                this.toaster.success('Trait created');
                this.router.navigate(['../', trait._id], { relativeTo: this.route })
            }
        } catch (e) {
            console.error('Failed to create/update trait', e, trait);
            this.toaster.error(`Failed to create/update trait: ${e?.message || e || ''}`);
        }
    }

    deleteTrait(traitId: string) {
        if (!traitId || !this.selectedPROJ.traits) return;

        const { [traitId]: traitToRemove, ...remainingTraits } = this.selectedPROJ.traits;
        let project: ApiProject = { ...this.selectedPROJ, traits: remainingTraits }

        this.confirmService
            .confirm({
                confirmTitle: 'Delete Confirmation',
                confirm: `Do you want to delete the trait '${traitToRemove.name}'?`,
                confirmOk: 'Delete',
                confirmCancel: 'Cancel',
            })
            .then(async () => {
                delete project.traits[traitId];
                try {
                    await this.apiProjService.updateAPIProject(project)
                    this.toaster.success('Trait deleted.');
                    this.traitForm.markAsPristine();
                    this.router.navigate(['../', 'new'], { relativeTo: this.route })
                } catch (e) {
                    console.error('Failed to delete trait', e);
                    this.toaster.error(`Failed to delete trait: ${e?.message || e || ''}`);
                }
            });
    }



    checkExistingTrait(name: string) {
        if (!name) return false;

        return this.selectedPROJ?.traits && Object.values(this.selectedPROJ.traits).find((trait: ApiTrait) => trait.name.toLowerCase() ===
            name.toLowerCase()) !== undefined;
    }



    discardChange() {
        this.handleTraitSelect(this.selectedTrait._id);
    }

    isEditing() {
        return !(this.selectedTrait._id === 'NEW');
    }

    setDirty() {
        this.traitForm.markAsDirty();
    }

    addDefaultResponse() {
        if (this.traitForm.controls['responses'].value.length === 0) {
            this.traitForm.patchValue({
                responses: [{
                    code: '200',
                    data: { "type": ["object"] },
                    desc: '',
                    noneStatus: false
                }]
            })
        }
    }

    canDeactivate() {
        return new Promise<boolean>((resolve) => {
            if (this.traitForm.dirty) {
                this.confirmService.confirm({
                    confirmTitle: 'Unsaved data !',
                    confirm: 'Traits view has some unsaved data. Current action will discard any unsave changes.',
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

    ngOnDestroy(): void {
        this._destroy.next(true);
        this._destroy.complete();
    }

    ngOnInit(): void { }
}
