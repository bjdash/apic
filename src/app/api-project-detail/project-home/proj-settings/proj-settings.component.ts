import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { pipe, Subject } from 'rxjs';
import { map, take, takeUntil, timeout } from 'rxjs/operators';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { Env } from 'src/app/models/Envs.model';
import { KeyVal } from 'src/app/models/KeyVal.model';
import { EnvService } from 'src/app/services/env.service';
import { Toaster } from 'src/app/services/toaster.service';
import { EnvState } from 'src/app/state/envs.state';
import Utils from '../../../utils/helpers'

@Component({
  selector: 'app-proj-settings',
  templateUrl: './proj-settings.component.html',
  styleUrls: ['./proj-settings.component.css']
})
export class ProjSettingsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() SelectedPROJ: ApiProject;
  @Input() updateApiProject: Function;
  @Output() onChange = new EventEmitter<any>();

  private destroy: Subject<boolean> = new Subject<boolean>();
  projEnv: Env = null; //auto generated env for this project

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
  ngOnDestroy(): void {
    this.destroy.next(true);
    this.destroy.complete();
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
    console.log(this.projSettingsForm, this);
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
      console.log(e);
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
      this.store.select(EnvState.getById)
        .pipe(map(filterFn => filterFn(this.SelectedPROJ.setting.envId)))
        // .pipe(take(1))
        .pipe(takeUntil(this.destroy))
        .subscribe(env => { this.projEnv = env });
    }
    this.onChange.next({ dirty: false });
  }
}
