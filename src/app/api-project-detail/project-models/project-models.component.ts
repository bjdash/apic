import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApiProject } from 'src/app/models/ApiProject.model';
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
export class ProjectModelsComponent implements OnInit {
  @Input() selectedPROJ: ApiProject;
  @Input() updateApiProject: Function;
  @Output() projectUpdated = new EventEmitter<any>();

  modelForm: FormGroup;
  selectedModel: string = 'NEW';
  selectedName: string;

  constructor(
    private fb: FormBuilder,
    private toaster: Toaster,
    private confirmService: ConfirmService
  ) {
    console.log('In Project folder view');
    this.modelForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      nameSpace: ['', Validators.maxLength(100)],
      folder: [''],
      data: [{ type: 'object' }],
    });
    this.selectedName = 'Create new model';
  }

  ngOnInit(): void { }

  selectModel(modelId: string) {
    console.log('selecting model: ', modelId);
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
          this.handleModelSelect(modelId);
        })
        .catch(() => {
          console.log('Selected to keep the changes');
        });
    } else {
      this.handleModelSelect(modelId);
    }
  }

  private handleModelSelect(modelId: string) {
    this.selectedModel = modelId;
    if (modelId === 'NEW') {
      this.modelForm.patchValue({ name: '', nameSpace: '', folder: '', data: { type: 'object' } });
      this.selectedName = 'Create new Model';
    } else {
      let { name, nameSpace, folder, data } = this.selectedPROJ.models[modelId];
      if (!folder) folder = '';
      this.modelForm.patchValue({ name, nameSpace, folder, data });
      this.selectedName = name;
      this.modelForm.markAsPristine();
      this.modelForm.markAsUntouched();
    }
  }

  deleteModel(modelId: string) {
    if (!modelId || !this.selectedPROJ.folders) return;

    const project: ApiProject = Utils.deepCopy(this.selectedPROJ);

    this.confirmService
      .confirm({
        confirmTitle: 'Delete Confirmation',
        confirm: `Do you want to delete the model '${project.models[modelId].name}'?`,
        confirmOk: 'Delete',
        confirmCancel: 'Cancel',
      })
      .then(() => {
        delete project.models[modelId];

        this.updateApiProject(project).then(
          () => {
            this.toaster.success('Model deleted.');
            this.modelForm.markAsPristine();
            this.selectModel('NEW');
            this.projectUpdated.next({ model: modelId });
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
    console.log(this.modelForm.value);
    const model = this.modelForm.value;

    if (this.checkExistingModel(model.name) && !this.isEditing() && !allowDup) {
      this.toaster.error('Model ' + model.name + ' already exists');
      return;
    }

    if (!this.selectedPROJ.models) {
      this.selectedPROJ.models = {};
    }
    if (this.isEditing()) {
      model._id = this.selectedModel;
    } else {
      model._id = new Date().getTime() + apic.s8();
    }
    this.selectedPROJ.models[model._id] = model;

    this.updateApiProject(this.selectedPROJ).then(
      (data) => {
        this.modelForm.markAsPristine();
        this.modelForm.markAsUntouched();
        this.selectedName = model.name;

        if (this.isEditing()) {
          this.toaster.success('Model updated');
          // addModelToLeftTree(model, vm.modelCopy.folder ? vm.modelCopy.folder : 'ungrouped');
        } else {
          this.toaster.success('Model created');
          // addModelToLeftTree(model, undefined);
          this.projectUpdated.next({ folder: model._id });
        }
        this.selectedModel = model._id;
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

  checkExistingModel(name) {
    if (!name) return undefined;
    var foundId;
    if (this.selectedPROJ.models) {
      this.selectedPROJ.models &&
        Object.keys(this.selectedPROJ.models).forEach((id) => {
          if (
            this.selectedPROJ.models[id].name.toLowerCase() ===
            name.toLowerCase()
          )
            foundId = id;
        });
    }
    return foundId;
  }

  duplicateModel(modelId) {
    var toCopy = Utils.deepCopy(this.selectedPROJ.models[modelId]);
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
    this.selectedPROJ.models[toCopy._id] = toCopy;
    this.updateApiProject(this.selectedPROJ).then(() => {
      this.toaster.success('Duplicate Model ' + toCopy.name + ' created.');
    });
  }

  discardChange() {
    this.modelForm.markAsPristine();
    this.selectModel(this.selectedModel);
  }

  isEditing() {
    return !(this.selectedModel === 'NEW');
  }

  setDirty() {
    this.modelForm.markAsDirty();
  }
}
