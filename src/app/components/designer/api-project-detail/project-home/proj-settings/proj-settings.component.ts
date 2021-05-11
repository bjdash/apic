import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { Env } from 'src/app/models/Envs.model';
import { KeyVal } from 'src/app/models/KeyVal.model';
import { EnvService } from 'src/app/services/env.service';
import { Toaster } from 'src/app/services/toaster.service';
@Component({
  selector: 'app-proj-settings',
  templateUrl: './proj-settings.component.html',
  styleUrls: ['./proj-settings.component.css']
})
export class ProjSettingsComponent implements OnInit, OnChanges {
  @Input() SelectedPROJ: ApiProject;
  @Input() updateApiProject: Function;
  @Input() projEnv: Env = null; //auto generated env for this project
  @Output() onChange = new EventEmitter<any>();

  projSettingsForm: FormGroup;

  constructor(fb: FormBuilder, private toaster: Toaster, private envService: EnvService, private store: Store) {
    this.projSettingsForm = fb.group({
      host: ['', Validators.required],
      basePath: [''],
      protocol: ['http']
    });

    this.projSettingsForm.valueChanges.subscribe(data => {
      this.onChange.next({ dirty: true });
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.SelectedPROJ) {
      setTimeout(() => {
        this.refreshForm();
      }, 0);
    }
  }

  ngOnInit(): void {
    this.refreshForm()
  }

  async saveProjSetting() {
    const settings = this.projSettingsForm.value;
    //if host has /at the end remove it
    if (settings.host.charAt(settings.host.length - 1) === '/') {
      settings.host = settings.host.substring(0, settings.host.length - 1);
    }

    if (!this.projSettingsForm.valid || !settings.host) {
      this.toaster.error('Please enter a valid host name');
      return;
    };
    //find existing env for this project if any, based on find add or update
    var action = this.SelectedPROJ.setting && this.SelectedPROJ.setting.envId ? 'update' : 'add';
    var settingEnvVals = [{
      key: 'host',
      val: settings.host,
      readOnly: true
    }, {
      key: 'basePath',
      val: settings.basePath,
      readOnly: true
    }, {
      key: 'scheme',
      val: settings.protocol + '://',
      readOnly: true
    }];

    let updatedEnvId;
    try {
      if (action === 'add') {
        updatedEnvId = await this.createNewEnv(settingEnvVals);
      } else {
        updatedEnvId = await this.updateEnv(settingEnvVals);
      }

      let projToUpdate: ApiProject = {
        ...this.SelectedPROJ, setting: {
          host: settings.host,
          basePath: settings.basePath,
          protocol: settings.protocol,
          envId: updatedEnvId
        }
      }

      await this.updateApiProject(projToUpdate);
      this.toaster.success('Settings Saved');
    } catch (e) {
      console.error('Failed to save setting', e);
      this.toaster.error(`Failed to save setting: ${e.message}`);
    }
  }

  async createNewEnv(settingEnvVals: KeyVal[]) {
    var newEnv: Env = {
      name: this.SelectedPROJ.title + '-env',
      vals: settingEnvVals,
      proj: {
        id: this.SelectedPROJ._id,
        name: this.SelectedPROJ.title
      },
      owner: this.SelectedPROJ.owner
    };
    if (this.SelectedPROJ.team) {
      newEnv.team = this.SelectedPROJ.team;
    }

    return this.envService.addEnv(newEnv);
  }

  async updateEnv(settingEnvVals: KeyVal[]) {
    var rest = this.projEnv.vals.filter(function (val) {
      return ['host', 'basePath', 'scheme'].indexOf(val.key) < 0
    });
    let envToUpdate: Env = { ...this.projEnv, vals: [...rest, ...settingEnvVals] };

    return this.envService.updateEnv(envToUpdate);
  }

  refreshForm() {
    if (this.SelectedPROJ.setting) {
      this.projSettingsForm.patchValue({ ...this.SelectedPROJ.setting });
      this.projSettingsForm.markAsPristine();
    }
    this.onChange.next({ dirty: false });
  }
}
