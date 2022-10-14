import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { ApiEndp, ApiFolder, ApiModel, ApiProject, NewApiEndp } from 'src/app/models/ApiProject.model';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import apic from 'src/app/utils/apic';
import { ApiProjectDetailService } from '../api-project-detail.service';

@Component({
  selector: 'app-api-builder',
  templateUrl: './api-builder.component.html',
  styleUrls: []
})
export class ApiBuilderComponent implements OnInit, OnDestroy {
  selectedPROJ: ApiProject;
  private _destroy: Subject<boolean> = new Subject<boolean>();
  form: FormGroup;

  constructor(fb: FormBuilder, private confirmService: ConfirmService, private apiProjectDetailService: ApiProjectDetailService, private apiProjService: ApiProjectService, private toaster: Toaster) {
    this.form = fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      path: ['', [Validators.required, Validators.maxLength(100)]],
      input: [{ "type": "object" }],
      output: [{ "allOf": [{ "$ref": "#/definitions/<input_from_above>" }, { "type": "object", "properties": { "id": { "type": "string" } } }] }]
    });

    this.apiProjectDetailService.onSelectedProj$
      .pipe(takeUntil(this._destroy))
      .subscribe(project => {
        this.selectedPROJ = project;
      })
  }

  ngOnDestroy(): void {
    this._destroy.next(true);
    this._destroy.complete();
  }

  ngOnInit(): void {
  }

  async generateApis() {
    if (this.form.invalid) {
      return;
    }
    //create folder with name
    let formValue: { name: string, path: string, input: any, output: any } = this.form.value
    if (!formValue.path.startsWith('/')) {
      this.toaster.error('path should start with a /');
      return
    }

    let folder = this.generateFolder(formValue.name);
    let inpModel = this.generateModel(folder._id, formValue.name, formValue.input, 'Input');
    let outModel = this.generateModel(folder._id, formValue.name, formValue.output, 'Output');
    let endps = this.generateEndpoints(folder._id, formValue.name, formValue.path, inpModel, outModel);

    const projToUpdate: ApiProject = {
      ...this.selectedPROJ,
      folders: { ...this.selectedPROJ.folders, [folder._id]: folder },
      models: { ...this.selectedPROJ.models, [inpModel._id]: inpModel, [outModel._id]: outModel },
      endpoints: { ...this.selectedPROJ.endpoints, ...endps }
    }
    try {
      await this.apiProjService.updateAPIProject(projToUpdate)
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.toaster.success('APIs generated.')
    } catch (e) {
      console.error('Failed to generate APIs', e, projToUpdate);
      this.toaster.error(`Failed to create/update model: ${e?.message || e || ''}`);
    }

  }

  generateFolder(name: string): ApiFolder {
    var folder: ApiFolder = {
      _id: Date.now() + apic.s8(),
      name: name,
      desc: 'This folder contains all resources related to ' + name
    };
    if (Utils.objectValues(this.selectedPROJ.folders).find(folder => folder.name === name)) {
      folder.name = name + apic.s4();
    }
    return folder
  }
  generateModel(folderId: string, name: string, schema: any, type: 'Input' | 'Output'): ApiModel {
    //if all of input is selected, replace the placeholder $ref with actual input
    if (type === 'Output' && schema.allOf?.length > 0) {
      schema.allOf.forEach(ref => {
        if (ref.$ref === '#/definitions/<input_from_above>') {
          ref.$ref = `#/definitions/input_${name}`
        }
      })
    }
    var model: ApiModel = {
      _id: Date.now() + apic.s8(),
      name: `${type} ${name}`,
      folder: folderId,
      nameSpace: `${type.toLowerCase()}_${name}`,
      data: schema
    };
    return model
  }
  generateEndpoints(folderId: string, name: string, path: string, inModel: ApiModel, outModel: ApiModel): { [key: string]: ApiEndp } {
    //create post req
    var postEndp: ApiEndp = Utils.clone(NewApiEndp);
    postEndp._id = Date.now() + apic.s8();
    postEndp.method = 'post';
    postEndp.summary = 'Create ' + name;
    postEndp.description = postEndp.summary;
    postEndp.path = path;
    postEndp.folder = folderId;
    postEndp.tags = [name];
    postEndp.responses = [{
      code: '201',
      data: { $ref: `#/definitions/${outModel.nameSpace}` },
      examples: [],
      desc: 'Returns response 201 with the details of the newly created ' + name
    }];
    postEndp.body = {
      type: 'raw',
      data: { $ref: `#/definitions/${inModel.nameSpace}` }
    }

    //Create list GET req
    var getEndp: ApiEndp = Utils.clone(NewApiEndp);
    getEndp._id = Date.now() + apic.s8();
    getEndp.method = 'get';
    getEndp.summary = `Get list of ${name}s`;
    getEndp.description = getEndp.summary;
    getEndp.path = path;
    getEndp.folder = folderId;
    getEndp.tags = [name];
    getEndp.responses = [{
      code: '200',
      data: { type: "array", items: { $ref: `#/definitions/${outModel.nameSpace}` } },
      examples: [],
      desc: `Returns 200 with list of ${name}s`
    }];

    //create GET by Id req
    var getIdEndp: ApiEndp = Utils.clone(NewApiEndp);
    getIdEndp._id = Date.now() + apic.s8();
    getIdEndp.method = 'get';
    getIdEndp.summary = `Get detail of ${name} by ${name}Id`;
    getIdEndp.description = getIdEndp.summary;
    getIdEndp.path = `${path}/{${name.toLowerCase()}Id}`;
    getIdEndp.folder = folderId;
    getIdEndp.tags = [name];
    getIdEndp.pathParams = {
      type: "object",
      required: [`${name}Id`],
      properties: {
        [`${name}Id`]: {
          type: "string"
        }
      }
    }
    getIdEndp.responses = [{
      code: '200',
      data: { $ref: `#/definitions/${outModel.nameSpace}` },
      examples: [],
      desc: 'Returns 200 with the detail of ' + name + ' for the specified ' + name.toLowerCase() + 'Id'
    }];

    //create UPDATE by Id req
    var putEndp: ApiEndp = Utils.clone(NewApiEndp);
    putEndp._id = Date.now() + apic.s8();
    putEndp.method = 'put';
    putEndp.summary = `Update  ${name} details by ${name}Id`;
    putEndp.description = putEndp.summary;
    putEndp.path = `${path}/{${name.toLowerCase()}Id}`;
    putEndp.folder = folderId;
    putEndp.tags = [name];
    putEndp.pathParams = {
      type: "object",
      required: [`${name}Id`],
      properties: {
        [`${name}Id`]: {
          type: "string"
        }
      }
    }
    putEndp.responses = [{
      code: '200',
      data: { $ref: `#/definitions/${outModel.nameSpace}` },
      examples: [],
      desc: 'Returns 200 with the detail of updated ' + name
    }];
    putEndp.body = {
      type: 'raw',
      data: { $ref: `#/definitions/${inModel.nameSpace}` }
    }

    //create Delete by Id req
    var delEndp: ApiEndp = Utils.clone(NewApiEndp);
    delEndp._id = Date.now() + apic.s8();
    delEndp.method = 'delete';
    delEndp.summary = `Delete  ${name} by ${name}Id`;
    delEndp.description = delEndp.summary;
    delEndp.path = `${path}/{${name.toLowerCase()}Id}`;
    delEndp.folder = folderId;
    delEndp.tags = [name];
    delEndp.pathParams = {
      type: "object",
      required: [`${name}Id`],
      properties: {
        [`${name}Id`]: {
          type: "string"
        }
      }
    }
    delEndp.responses = [{
      code: '200',
      data: { $ref: `#/definitions/${outModel.nameSpace}` },
      examples: [],
      desc: 'Returns 200 with the detail of updated ' + name
    }];

    return {
      [postEndp._id]: postEndp,
      [getEndp._id]: getEndp,
      [getIdEndp._id]: getIdEndp,
      [putEndp._id]: putEndp,
      [delEndp._id]: delEndp
    }
  }

  getPathFromName() {
    if (!this.form.controls['path'].dirty) {
      this.form.patchValue({ path: `/${this.form.value.name}s` })
    }
  }
  canDeactivate() {
    return new Promise<boolean>((resolve) => {
      if (this.form.dirty) {
        this.confirmService.confirm({
          confirmTitle: 'Unsaved data!',
          confirm: 'API builder view has some unsaved data. Current action will discard any unsave changes.',
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

  setDirty() {
    this.form.markAsDirty();
  }
}
