import { EnvService } from './../../../services/env.service';
import { Env } from './../../../models/Envs.model';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { Toaster } from 'src/app/services/toaster.service';
import jsyaml from 'js-yaml';
import { ImportExportService } from 'src/app/services/importExport.service';
import { Store } from '@ngxs/store';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { ERROR_CODES, ENTITIES } from 'src/app/utils/constants';
interface ConflictResponse {
  type: 'override' | 'keepBoth',
  project: ApiProject
}
@Component({
  selector: 'app-import-project',
  templateUrl: './import-project.component.html',
  styleUrls: ['./import-project.component.css']
})
export class ImportProjectComponent implements OnInit {
  form: FormGroup;
  projToImport: ApiProject;
  flags: {
    impType: 'json' | 'yaml',
    inConflict: boolean,
    conflictResolve: (value?: ConflictResponse | PromiseLike<ConflictResponse>) => void
    conflictReject: (value?: ConflictResponse | PromiseLike<ConflictResponse>) => void
  } = {
      impType: 'json',
      inConflict: false,
      conflictResolve: null,
      conflictReject: null
    }


  constructor(fb: FormBuilder,
    private toaster: Toaster,
    private apiProjectService: ApiProjectService,
    private envService: EnvService,
    private dialogRef: MatDialogRef<ImportProjectComponent>,
    private swaggerService: ImportExportService,
    private store: Store,
    private cd: ChangeDetectorRef) {
    this.form = fb.group({
      type: ['file'],
      file: [''],
      text: [''],
      groupby: ['tag']
    });
  }

  ngOnInit(): void {
  }

  async onSubmit() {
    this.flags.inConflict = false;
    const formValue = { ...this.form.value };
    if (formValue.type === 'file' && !formValue.file) {
      this.toaster.error('Please browse a Swagger/OAS or APIC project file to import');
      return;
    }
    if (formValue.type === 'text' && !formValue.text) {
      this.toaster.error('Please type a Swagger/OAS or APIC project file content to import');
      return;
    }
    let importData;
    try {
      importData = JSON.parse(formValue.type === 'file' ? formValue.file : formValue.text);
    } catch (e) {
      try {
        importData = jsyaml.load(formValue.type === 'file' ? formValue.file : formValue.text);
      } catch (e) {
        this.toaster.error('Import failed. Invalid file format');
      }
    }

    if (!importData) return;

    if (importData.TYPE === 'APIC Api Project') {
      if (await this.apiProjectService.isImportValid(importData)) {
        this.projToImport = this.sanitizeProjImport(importData.value);
      } else {
        this.toaster.error('Selected file doesn\'t contain valid Project information');
        return;
      }
    } else if (importData.swagger === '2.0') {
      this.projToImport = this.sanitizeProjImport(this.swaggerService.importOAS2(importData, { groupby: formValue.groupby }));
    } else if (importData.openapi) {
      let importStr = JSON.stringify(importData)
        .replace(/#\/components\/schemas\//g, '#\/definitions\/')
        .replace(/#\/components\/responses\//g, '#\/responses\/')
        .replace(/#\/components\/parameters\//g, '#\/parameters\/');
      this.projToImport = this.sanitizeProjImport(this.swaggerService.importOAS3(JSON.parse(importStr), { groupby: formValue.groupby }))
    } else {
      this.toaster.error('Selected file doesn\'t contain valid Project information');
      return;
    }
    if (!this.projToImport.setting) this.projToImport.setting = {};

    let newProj: ApiProject;
    let conflictResp: ConflictResponse;
    try {
      newProj = await this.apiProjectService.addProject(this.projToImport, false);
    } catch (e) {
      if (e.message === ERROR_CODES.get(ERROR_CODES.ESISTS, ENTITIES.APIProject)) {
        conflictResp = await this.resolveNameConflict();
        newProj = conflictResp.project;
      }
    }

    let newEnvId;
    if (conflictResp?.type === 'override') {
      newEnvId = newProj.setting?.envId;
    } else {
      var newEnv: Env = {
        name: newProj.title + '-env',
        vals: [{
          key: 'host', val: newProj.setting.host, readOnly: true
        }, {
          key: 'basePath', val: newProj.setting.basePath, readOnly: true
        }, {
          key: 'scheme', val: newProj.setting.protocol + '://', readOnly: true
        }],
        _id: null, _created: null, _modified: null,
        proj: {
          id: (newProj._id),
          name: newProj.title
        }
      };
      newEnvId = (await this.envService.addEnv(newEnv))._id;
    }

    newProj = { ...newProj, setting: { ...newProj.setting, envId: newEnvId } }
    try {
      await this.apiProjectService.updateAPIProject(newProj);
      this.toaster.success(`Project "${newProj.title}" imported`);
      this.dialogRef.close();
    } catch (e) {
      this.toaster.error(`Import failed.${e?.message || e || ''}`);
    }
  }

  async resolveNameConflict(): Promise<ConflictResponse> {
    this.flags.inConflict = true;
    return new Promise((resolve, reject) => {
      this.flags.conflictResolve = resolve;
      this.flags.conflictReject = reject;
    })
  }

  async overrideImport() {
    try {
      let project = await this.apiProjectService.replaceExisting(this.projToImport);
      this.flags.conflictResolve({ type: 'override', project })
    } catch (e) {
      this.flags.conflictReject(e)
    }
  }

  async keepBoth() {
    try {
      let project = await this.apiProjectService.addProject(this.projToImport, true);
      this.flags.conflictResolve({ type: 'keepBoth', project })
    } catch (e) {
      this.flags.conflictReject(e)
    }
  }

  sanitizeProjImport(project: ApiProject): ApiProject {
    delete project.owner;
    delete project.team;
    delete project.simKey;
    delete project.publishedId;
    if (project.setting) {
      delete project.setting.envId
    }
    return project;
  }

  onFileChange(event) {
    const reader = new FileReader();

    if (event.target.files && event.target.files.length) {
      const [file] = event.target.files;

      reader.onloadend = (e) => {
        if (e.target.readyState === FileReader.DONE) { // DONE == 2
          this.form.patchValue({
            file: e.target.result
          });
          // need to run CD since file load runs outside of zone
          this.cd.markForCheck();
        }
      };
      reader.readAsBinaryString(file);
    }
  }

}
