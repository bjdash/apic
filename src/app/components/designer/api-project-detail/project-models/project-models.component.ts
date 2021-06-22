import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { ApiModel, ApiProject, NewApiModel } from 'src/app/models/ApiProject.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Toaster } from 'src/app/services/toaster.service';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import apic from '../../../../utils/apic';
import { Subject } from 'rxjs';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { ApiProjectDetailService } from '../api-project-detail.service';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-project-models',
  templateUrl: './project-models.component.html',
  styleUrls: ['../api-project-detail.component.css'],
})
export class ProjectModelsComponent implements OnInit, OnDestroy {
  selectedPROJ: ApiProject;
  selectedModel: ApiModel = null;
  modelForm: FormGroup;
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
    this.modelForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      nameSpace: ['', Validators.maxLength(100)],
      folder: [''],
      data: [{ type: 'object' }],
    });

    this.apiProjectDetailService.onSelectedProj$
      .pipe(takeUntil(this._destroy))
      .subscribe(project => {
        this.selectedPROJ = project;
        if (this.selectedModel) {
          this.handleModelSelect(this.selectedModel._id);
        }
      })

    this.route.params
      .pipe(takeUntil(this._destroy))
      .subscribe(({ modelId }) => {
        this.handleModelSelect(modelId);
      })
  }



  private handleModelSelect(modelId: string) {
    this.selectedModel = this.selectedPROJ?.models?.[modelId];
    if (!this.selectedModel) {
      if (modelId?.toLocaleLowerCase() !== 'NEW'.toLocaleLowerCase()) {
        // this.toaster.warn('Selected folder doesn\'t exist.');
        this.router.navigate(['../', 'new'], { relativeTo: this.route });
        return;
      } else {
        this.selectedModel = NewApiModel;
      }
    }
    const { name, nameSpace, folder, data } = this.selectedModel;
    this.modelForm.patchValue({ name, nameSpace, folder, data });
    this.modelForm.markAsPristine();
    this.modelForm.markAsUntouched();

  }

  createModel(allowDup?: boolean) {
    if (!this.modelForm.valid) return;

    const model: ApiModel = { ...this.modelForm.value, _id: this.isEditing() ? this.selectedModel._id : new Date().getTime() + apic.s8() };

    if (this.checkExistingModel(model.name) && !this.isEditing() && !allowDup) {
      this.toaster.error('Model ' + model.name + ' already exists');
      return;
    }

    var projToUpdate: ApiProject = { ...this.selectedPROJ, models: { ...this.selectedPROJ.models, [model._id]: model } };
    this.apiProjService.updateAPIProject(projToUpdate).then((data) => {
      this.modelForm.markAsPristine();
      this.modelForm.markAsUntouched();
      if (this.isEditing()) {
        this.toaster.success('Model updated.');
        this.selectedModel = model;
      } else {
        this.router.navigate(['../', model._id], { relativeTo: this.route })
        this.toaster.success('Model created.');;
      }
    },
      (e) => {
        console.error('Failed to create/update model', e, model);
        this.toaster.error(`Failed to create/update model: ${e.message}`);
      }
    );
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
        this.apiProjService.updateAPIProject(project).then(
          () => {
            this.toaster.success('Model deleted.');
            this.modelForm.markAsPristine();
            this.router.navigate(['../', 'new'], { relativeTo: this.route })
          },
          (e) => {
            console.error('Failed to delete model', e);
            this.toaster.error(`Failed to delete model: ${e.message}`);
          }
        );
      });
  }

  canDeactivate() {
    return new Promise<boolean>((resolve) => {
      if (this.modelForm.dirty) {
        this.confirmService.confirm({
          confirmTitle: 'Unsaved data !',
          confirm: 'Models view has some unsaved data. Current action will discard any unsave changes.',
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

  discardChange() {
    this.handleModelSelect(this.selectedModel._id);
  }

  isEditing() {
    return !(this.selectedModel._id === 'NEW');
  }

  setDirty() {
    this.modelForm.markAsDirty();
  }

  ngOnDestroy(): void {
    this._destroy.next(true);
    this._destroy.complete();
  }

  ngOnInit(): void { }


}
