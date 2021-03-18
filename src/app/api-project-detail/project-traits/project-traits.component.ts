import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { Toaster } from 'src/app/services/toaster.service';
import Utils from '../../utils/helpers';
import apic from '../../utils/apic';

@Component({
    selector: 'app-project-traits',
    templateUrl: './project-traits.component.html'
})
export class ProjectTraitsComponent implements OnInit {
    @Input() selectedPROJ: ApiProject;
    @Input() updateApiProject: Function;
    @Output() projectUpdated = new EventEmitter<any>();

    traitForm: FormGroup;
    selectedTrait: string = 'NEW';
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
        this.buildEmptyTrait();
    }

    ngOnInit(): void {
        this.addDefaultResponse();
    }

    selectTrait(traitId: string) {
        console.log('selecting trait: ', traitId);
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
                    this.handleTraitSelect(traitId);
                })
                .catch(() => {
                    console.log('Selected to keep the changes');
                });
        } else {
            this.handleTraitSelect(traitId);
        }
    }

    private buildEmptyTrait() {
        this.traitForm = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(100)]],
            folder: [''],
            summary: ['', Validators.maxLength(100)],
            queryParams: [undefined],
            headers: [undefined],
            pathParams: [undefined],
            responses: [[]]
        });
        this.selectedName = 'Create new trait';
    }

    private handleTraitSelect(traitId: string) {
        this.selectedTrait = traitId;
        if (traitId === 'NEW') {
            this.buildEmptyTrait();
        } else {
            const selectedTrait = Object.assign({}, this.selectedPROJ.traits[traitId]);
            let { name, summary, folder, queryParams, headers, pathParams, responses } = selectedTrait
            if (!folder) folder = '';
            this.traitForm.patchValue({ name, summary, folder, queryParams, headers, pathParams, responses: [...responses] });
            this.selectedName = name;
            this.traitForm.markAsPristine();
            this.traitForm.markAsUntouched();
        }
        this.addDefaultResponse();
    }

    deleteTrait(traitId: string) {
        if (!traitId || !this.selectedPROJ.folders) return;

        const project: ApiProject = Utils.deepCopy(this.selectedPROJ);

        this.confirmService
            .confirm({
                confirmTitle: 'Delete Confirmation',
                confirm: `Do you want to delete the trait '${project.traits[traitId].name}'?`,
                confirmOk: 'Delete',
                confirmCancel: 'Cancel',
            })
            .then(() => {
                delete project.traits[traitId];

                this.updateApiProject(project).then(
                    () => {
                        this.toaster.success('Trait deleted.');
                        this.traitForm.markAsPristine();
                        this.selectTrait('NEW');
                        this.projectUpdated.next({ trait: traitId });
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
        const trait = this.traitForm.value;

        if (this.checkExistingTrait(trait.name) && !this.isEditing() && !allowDup) {
            this.toaster.error('Trait ' + trait.name + ' already exists');
            return;
        }

        if (!this.selectedPROJ.traits) {
            this.selectedPROJ.traits = {};
        }
        if (this.isEditing()) {
            trait._id = this.selectedTrait;
        } else {
            trait._id = new Date().getTime() + apic.s8();
        }
        this.selectedPROJ.traits[trait._id] = trait;

        this.updateApiProject(this.selectedPROJ).then(
            (data) => {
                this.traitForm.markAsPristine();
                this.traitForm.markAsUntouched();
                this.selectedName = trait.name;

                if (this.isEditing()) {
                    this.toaster.success('Trait updated');
                    // addTraitToLeftTree(trait, vm.traitCopy.folder ? vm.traitCopy.folder : 'ungrouped');
                } else {
                    this.toaster.success('Trait created');
                    // addTraitToLeftTree(trait, undefined);
                    this.projectUpdated.next({ folder: trait._id });
                }
                this.selectedTrait = trait._id;
            },
            (e) => {
                console.error('Failed to create/update trait', e, trait);
                this.toaster.error(`Failed to create/update trait: ${e.message}`);
            }
        );
    }

    checkExistingTrait(name) {
        if (!name) return undefined;
        var foundId;
        if (this.selectedPROJ.traits) {
            this.selectedPROJ.traits &&
                Object.keys(this.selectedPROJ.traits).forEach((id) => {
                    if (
                        this.selectedPROJ.traits[id].name.toLowerCase() ===
                        name.toLowerCase()
                    )
                        foundId = id;
                });
        }
        return foundId;
    }

    duplicateTrait(traitId) {
        var toCopy = Utils.deepCopy(this.selectedPROJ.traits[traitId]);
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
            toCopy.nameSpace =
                (numberAtEnd
                    ? toCopy.nameSpace.substring(0, toCopy.nameSpace.length - 1)
                    : toCopy.nameSpace
                ).trim() +
                ' ' +
                counter;
        }
        this.selectedPROJ.traits[toCopy._id] = toCopy;
        this.updateApiProject(this.selectedPROJ).then(() => {
            this.toaster.success('Duplicate Trait ' + toCopy.name + ' created.');
        });
    }

    discardChange() {
        this.traitForm.markAsPristine();
        this.selectTrait(this.selectedTrait);
    }

    isEditing() {
        return !(this.selectedTrait === 'NEW');
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
