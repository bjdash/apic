import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { ApiModel, ApiProject, NewApiModel } from 'src/app/models/ApiProject.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Toaster } from 'src/app/services/toaster.service';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import apic from '../../utils/apic';
import Utils from '../../utils/helpers';

@Component({
  selector: 'app-project-models',
  templateUrl: './project-models.component.html',
  styleUrls: ['../api-project-detail.component.css'],
})
export class ProjectModelsComponent implements OnInit, OnChanges {
  @Input() selectedPROJ: ApiProject;
  @Input() updateApiProject: Function;
  // @Output() projectUpdated = new EventEmitter<any>();

  modelForm: FormGroup;
  selectedModel: ApiModel = null;
  selectedName: string;

  constructor(
    private fb: FormBuilder,
    private toaster: Toaster,
    private confirmService: ConfirmService
  ) {
    this.modelForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      nameSpace: ['', Validators.maxLength(100)],
      folder: [''],
      data: [{ type: 'object' }],
    });
    this.openNewModel()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.selectedPROJ?.currentValue && this.selectedModel) {
      setTimeout(() => {
        this.openModelById(this.selectedModel._id)
      }, 0);
    }
  }

  ngOnInit(): void { }

  openNewModel() {
    this.openModel(NewApiModel);
  }

  openModelById(modelIdToOpen: string) {
    const modelToOpen: ApiModel = this.selectedPROJ?.models?.[modelIdToOpen] || NewApiModel;
    this.openModel(modelToOpen)
  }

  private openModel(modelToOpen: ApiModel) {
    if (this.modelForm.dirty) {
      this.confirmService
        .confirm({
          confirmTitle: 'Unsaved data !',
          confirm:
            'The Models view has some unsaved data. Do you want to replace it with your current selection?',
          confirmOk: 'Replace',
          confirmCancel: 'No, let me save',
        })
        .then(() => {
          this.handleModelSelect(modelToOpen);
        })
        .catch(() => {
          console.log('Selected to keep the changes');
        });
    } else {
      this.handleModelSelect(modelToOpen);
    }
  }

  private handleModelSelect(modelToOpen: ApiModel) {
    this.selectedModel = { ...modelToOpen };
    const { name, nameSpace, folder, data } = modelToOpen;
    this.modelForm.patchValue({ name, nameSpace, folder, data });
    this.selectedName = name || 'Create new folder';
    this.modelForm.markAsPristine();
    this.modelForm.markAsUntouched();


    // if (modelId === 'NEW') {
    //   this.modelForm.patchValue({ name: '', nameSpace: '', folder: '', data: { type: 'object' } });
    //   this.selectedName = 'Create new Model';
    // } else {
    //   let { name, nameSpace, folder, data } = this.selectedPROJ.models[modelId];
    //   if (!folder) folder = '';
    //   this.modelForm.patchValue({ name, nameSpace, folder, data });
    //   this.selectedName = name;
    //   this.modelForm.markAsPristine();
    //   this.modelForm.markAsUntouched();
    // }
  }

  deleteModel(modelId: string) {
    if (!modelId || !this.selectedPROJ.models) return;

    const { [modelId]: modelToRemove, ...remainingModels } = this.selectedPROJ.models;
    let project: ApiProject = { ...this.selectedPROJ, models: remainingModels }

    this.confirmService
      .confirm({
        confirmTitle: 'Delete Confirmation',
        confirm: `Do you want to delete the model '${modelToRemove.name}'?`,
        confirmOk: 'Delete',
        confirmCancel: 'Cancel',
      })
      .then(() => {
        delete project.models[modelId];

        this.updateApiProject(project).then(
          () => {
            this.toaster.success('Model deleted.');
            this.modelForm.markAsPristine();
            if (modelId === this.selectedModel._id) {
              this.openNewModel();
            }
          },
          (e) => {
            console.error('Failed to delete model', e);
            this.toaster.error(`Failed to delete model: ${e.message}`);
          }
        );
      });
  }

  createModel(allowDup?: boolean) {
    if (!this.modelForm.valid) return;

    const model: ApiModel = { ...this.modelForm.value, _id: this.isEditing() ? this.selectedModel._id : new Date().getTime() + apic.s8() };

    if (this.checkExistingModel(model.name) && !this.isEditing() && !allowDup) {
      this.toaster.error('Model ' + model.name + ' already exists');
      return;
    }

    var projToUpdate: ApiProject = { ...this.selectedPROJ, models: { ...this.selectedPROJ.models, [model._id]: model } };
    this.updateApiProject(projToUpdate).then((data) => {
      this.selectedName = model.name;
      if (this.isEditing()) {
        this.toaster.success('Model updated');
      } else {
        this.toaster.success('Model created');
      }
      this.modelForm.markAsPristine();
      this.modelForm.markAsUntouched();
      this.selectedModel._id = model._id;

    },
      (e) => {
        console.error('Failed to create/update model', e, model);
        this.toaster.error(`Failed to create/update model: ${e.message}`);
      }
    );
  }

  setDefaultNameSpace() {
    if (!this.modelForm.value.nameSpace)
      this.modelForm.patchValue({
        nameSpace: this.modelForm.value.name.replace(/\s/g, '_'),
      });
  }

  checkExistingModel(name: string): boolean {
    if (!name) return false;

    return this.selectedPROJ?.models && Object.values(this.selectedPROJ.models).find((model: ApiModel) => model.name.toLowerCase() ===
      name.toLowerCase()) !== undefined;
  }

  duplicateModel(modelId: string) {
    var toCopy: ApiModel = { ...this.selectedPROJ.models[modelId] };
    toCopy._id = apic.s12();
    while (this.checkExistingModel(toCopy.name)) {
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
    let project: ApiProject = { ...this.selectedPROJ, models: { ...this.selectedPROJ.models, [toCopy._id]: toCopy } }
    this.updateApiProject(project).then(() => {
      this.toaster.success('Duplicate Model ' + toCopy.name + ' created.');
    });
  }

  discardChange() {
    this.modelForm.markAsPristine();
    this.openModel(this.selectedModel);
  }

  isEditing() {
    return !(this.selectedModel._id === 'NEW');
  }

  setDirty() {
    this.modelForm.markAsDirty();
  }
}
