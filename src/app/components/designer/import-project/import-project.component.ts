import { EnvService } from './../../../services/env.service';
import { Env } from './../../../models/Envs.model';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { Toaster } from 'src/app/services/toaster.service';
import jsyaml from 'js-yaml';
import { SwaggerService } from 'src/app/services/swagger.service';
import { Store } from '@ngxs/store';
import { map, take } from 'rxjs/operators';
import helpers from 'src/app/utils/helpers';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';
import { ApiProject } from 'src/app/models/ApiProject.model';

@Component({
  selector: 'app-import-project',
  templateUrl: './import-project.component.html',
  styleUrls: ['./import-project.component.css']
})
export class ImportProjectComponent implements OnInit {
  form: FormGroup;
  flags = {
    impType: 'json'
  }


  constructor(fb: FormBuilder,
    private toaster: Toaster,
    private apiProjectService: ApiProjectService,
    private envService: EnvService,
    private dialogRef: MatDialogRef<ImportProjectComponent>,
    private swaggerService: SwaggerService,
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

    var project: ApiProject;
    if (importData.TYPE === 'APIC Api Project') {
      if (this.apiProjectService.validateImportData(importData)) {
        project = this.sanitizeProjImport(importData.value);
      } else {
        this.toaster.error('Selected file doesn\'t contain valid Project information');
        return;
      }
    } else if (importData.swagger === '2.0') {
      project = this.sanitizeProjImport(this.swaggerService.importOAS2(importData, { groupby: formValue.groupby }));
    } else {
      this.toaster.error('Selected file doesn\'t contain valid Project information');
      return;
    }
    if (!project.setting) project.setting = {};

    const newProj = await this.apiProjectService.addProject(project, true);

    var newEnv: Env = {
      name: project.title + '-env',
      vals: [{
        key: 'host', val: project.setting.host, readOnly: true
      }, {
        key: 'basePath', val: project.setting.basePath, readOnly: true
      }, {
        key: 'scheme', val: project.setting.protocol, readOnly: true
      }],
      _id: null, _created: null, _modified: null,
      proj: {
        id: (newProj._id),
        name: project.title
      }
    };
    const newEnvId = await this.envService.addEnv(newEnv);
    project = { ...project, setting: { ...project.setting, envId: newEnvId } }
    try {
      await this.apiProjectService.updateAPIProject(project);
      this.toaster.success(`Project "${newProj.title}" imported`);
      this.dialogRef.close();
    } catch (e) {
      this.toaster.error(`Import failed.${e?.message || e || ''}`);
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
