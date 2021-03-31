import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { ApiProject, ApiTrait, NewApiTrait } from 'src/app/models/ApiProject.model';
import { Toaster } from 'src/app/services/toaster.service';
import Utils from '../../utils/helpers';
import apic from '../../utils/apic';

@Component({
    selector: 'app-project-traits',
    templateUrl: './project-traits.component.html'
})
export class ProjectTraitsComponent implements OnInit, OnChanges {
    @Input() selectedPROJ: ApiProject;
    @Input() updateApiProject: Function;
    // @Output() projectUpdated = new EventEmitter<any>();

    traitForm: FormGroup;
    selectedTrait: ApiTrait = null;
    selectedName: string;
    editCode: boolean = false;
    panels = {
        path: true,
        query: true,
        header: true,
        resp: true
    }


    constructor(
        private fb: FormBuilder,
        private toaster: Toaster,
        private confirmService: ConfirmService
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
        this.openNewTrait()
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.selectedPROJ?.currentValue && this.selectedTrait) {
            setTimeout(() => {
                this.openTraitById(this.selectedTrait._id)
            }, 0);
        }
    }

    ngOnInit(): void {
        // this.addDefaultResponse();
    }

    openNewTrait() {
        this.openTrait(NewApiTrait);
    }

    openTraitById(traitIdToOpen: string) {
        const traitToOpen: ApiTrait = this.selectedPROJ?.traits?.[traitIdToOpen] || NewApiTrait;
        this.openTrait(traitToOpen)
    }

    private openTrait(traitToOpen: ApiTrait) {
        if (this.traitForm.dirty) {
            this.confirmService
                .confirm({
                    confirmTitle: 'Unsaved data !',
                    confirm:
                        'The Traits view has some unsaved data. Do you want to replace it with your current selection?',
                    confirmOk: 'Replace',
                    confirmCancel: 'No, let me save',
                })
                .then(() => {
                    this.handleTraitSelect(traitToOpen);
                })
                .catch(() => {
                    console.log('Selected to keep the changes');
                });
        } else {
            this.handleTraitSelect(traitToOpen);
        }
    }

    private handleTraitSelect(traitToOpen: ApiTrait) {
        this.selectedTrait = { ...traitToOpen };
        let { name, summary, folder, queryParams, headers, pathParams, responses } = traitToOpen;
        if (!folder) folder = '';
        this.traitForm.patchValue({ name, summary, folder, queryParams, headers, pathParams, responses: [...responses] });
        this.selectedName = name || 'Create new trait';
        this.traitForm.markAsPristine();
        this.traitForm.markAsUntouched();
        this.addDefaultResponse();
    }

    deleteTrait(traitId: string) {
        if (!traitId || !this.selectedPROJ.folders) return;

        const { [traitId]: traitToRemove, ...remainingTraits } = this.selectedPROJ.traits;
        let project: ApiProject = { ...this.selectedPROJ, traits: remainingTraits }

        this.confirmService
            .confirm({
                confirmTitle: 'Delete Confirmation',
                confirm: `Do you want to delete the trait '${traitToRemove.name}'?`,
                confirmOk: 'Delete',
                confirmCancel: 'Cancel',
            })
            .then(() => {
                delete project.traits[traitId];
                this.updateApiProject(project).then(
                    () => {
                        this.toaster.success('Trait deleted.');
                        this.traitForm.markAsPristine();
                        if (traitId === this.selectedTrait._id) {
                            this.openNewTrait();
                        }
                    },
                    (e) => {
                        console.error('Failed to delete trait', e);
                        this.toaster.error(`Failed to delete trait: ${e.message}`);
                    }
                );
            });
    }

    createTrait(allowDup?: boolean) {
        if (!this.traitForm.valid) return;
        const trait: ApiTrait = { ...this.traitForm.value, _id: this.isEditing() ? this.selectedTrait._id : new Date().getTime() + apic.s8(), };

        if (this.checkExistingTrait(trait.name) && !this.isEditing() && !allowDup) {
            this.toaster.error('Trait ' + trait.name + ' already exists');
            return;
        }

        var projToUpdate: ApiProject = { ...this.selectedPROJ, traits: { ...this.selectedPROJ.traits, [trait._id]: trait } };

        this.updateApiProject(projToUpdate).then(() => {
            this.traitForm.markAsPristine();
            this.traitForm.markAsUntouched();
            this.selectedName = trait.name;

            if (this.isEditing()) {
                this.toaster.success('Trait updated');
            } else {
                this.toaster.success('Trait created');
            }
            this.selectedTrait._id = trait._id;
        }, (e) => {
            console.error('Failed to create/update trait', e, trait);
            this.toaster.error(`Failed to create/update trait: ${e.message}`);
        }
        );
    }

    checkExistingTrait(name: string) {
        if (!name) return false;

        return this.selectedPROJ?.models && Object.values(this.selectedPROJ.traits).find((trait: ApiTrait) => trait.name.toLowerCase() ===
            name.toLowerCase()) !== undefined;
    }

    duplicateTrait(traitId: string) {
        var toCopy: ApiTrait = { ...this.selectedPROJ.traits[traitId] };
        toCopy._id = apic.s12();
        while (this.checkExistingTrait(toCopy.name)) {
            var counter = parseInt(toCopy.name.charAt(toCopy.name.length - 1));
            var numberAtEnd = true;
            if (isNaN(counter)) {
                counter = 0;
                numberAtEnd = false;
            }
            counter++;
            toCopy.name =
                (numberAtEnd
                    ? toCopy.name.substring(0, toCopy.name.length - 1)
                    : toCopy.name
                ).trim() +
                ' ' +
                counter;
        }
        let project: ApiProject = { ...this.selectedPROJ, traits: { ...this.selectedPROJ.traits, [toCopy._id]: toCopy } }
        this.updateApiProject(project).then(() => {
            this.toaster.success('Duplicate Trait ' + toCopy.name + ' created.');
        });
    }

    discardChange() {
        this.traitForm.markAsPristine();
        this.openTrait(this.selectedTrait);
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
}
