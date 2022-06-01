import { FileSystem } from './../../../../services/fileSystem.service';
import { Toaster } from './../../../../services/toaster.service';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { ApiProjectState } from 'src/app/state/apiProjects.state';
import { map, take } from 'rxjs/operators';
import { SwaggerService } from 'src/app/services/swagger.service';
import jsyaml from 'js-yaml';
import { Utils } from 'src/app/services/utils.service';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';
import { Env } from 'src/app/models/Envs.model';
import { EnvState } from 'src/app/state/envs.state';

@Component({
  selector: 'project-export-modal',
  templateUrl: './project-export-modal.component.html',
  styleUrls: ['./project-export-modal.component.css']
})
export class ProjectExportModalComponent implements OnInit {
  projToExport: ApiProject;
  format: string = 'json';
  exportObj: any = {};
  exportStr: string = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: { type: string, id: string },
    private store: Store,
    private swaggerService: SwaggerService,
    private fileSystem: FileSystem,
    private utils: Utils,
    private toaster: Toaster) {
    this.store.select(ApiProjectStateSelector.getById)
      .pipe(map(filterFn => filterFn(this.data.id)))
      .pipe(take(1))
      .subscribe(p => {
        if (p) {
          this.projToExport = p;
        } else {
          this.toaster.error('Selected project not found');
        }
      })
  }

  ngOnInit(): void {
    this.prepareForExport();
  }

  async prepareForExport() {
    switch (this.data.type) {
      case 'OAS':
        this.exportObj = this.swaggerService.exportOAS({ ...this.projToExport });
        break;
      case 'OAS3':
        let projEnv: Env;
        if (this.projToExport.setting?.envId) {
          projEnv = await this.store.select(EnvState.getById)
            .pipe(map(filterFn => filterFn(this.projToExport.setting.envId)))
            .pipe(take(1)).toPromise();
        }
        this.exportObj = this.swaggerService.exportOAS3({ ...this.projToExport }, projEnv);
        break;
      case 'RAW':
        this.exportObj = this.swaggerService.exportRAW({ ...this.projToExport }, '');
        break;
    }
    this.jsonToString(this.exportObj);
  }

  jsonToYaml(json) {
    this.exportStr = jsyaml.dump(json);
  }
  jsonToString(json) {
    this.exportStr = JSON.stringify(json, null, '    ');
    //TODO: Better handling of #/definitions/ for $ref
    if (this.data.type === 'OAS3') {
      this.exportStr = this.exportStr.replace(/#\/definitions\//g, '#\/components\/schemas\/')
      this.exportStr = this.exportStr.replace(/#\/responses\//g, '#\/components\/responses\/')
      this.exportStr = this.exportStr.replace(/#\/parameters\//g, '#\/components\/parameters\/')
    }
  }

  download() {
    this.fileSystem.download(this.projToExport.title + '-' + this.data.type + '.apic.' + this.format, this.exportStr);
  }

  copy() {
    this.utils.copyToClipboard(this.exportStr);
  }
}
