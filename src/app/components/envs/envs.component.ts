import { EnvService } from '../../services/env.service';
import { Toaster } from '../../services/toaster.service';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSelectionListChange } from '@angular/material/list';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { first, map, take, takeUntil } from 'rxjs/operators';
import { Env } from '../../models/Envs.model';
import { EnvState } from '../../state/envs.state';
import { FileSystem } from '../../services/fileSystem.service';
import { env } from 'process';
import { User } from '../../models/User.model';
import { UserState } from '../../state/user.state';
import { KeyVal } from '../../models/KeyVal.model';
import { Utils } from '../../services/utils.service';
import { EnvsAction } from '../../actions/envs.action';
import { AuthService } from 'src/app/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { SharingComponent } from '../sharing/sharing.component';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { Team } from 'src/app/models/Team.model';
import { SharingService } from 'src/app/services/sharing.service';

@Component({
  selector: 'app-envs',
  templateUrl: './envs.component.html',
  styleUrls: ['./envs.component.scss']
})
export class EnvsComponent implements OnInit, OnDestroy {
  @Select(EnvState.getAll) envs$: Observable<Env[]>;
  @Select(EnvState.getInMemEnv) inMem$: Observable<{ [key: string]: string }>;
  envsList: Env[] = [];

  @ViewChild('addEnvInput') addEnvInput: ElementRef;
  @ViewChild('editEnvInput') editEnvInput: ElementRef;
  authUser: User;
  private destroy: Subject<boolean> = new Subject<boolean>();

  inMemEnvId = 'in-mem';
  inMemEnvs: KeyVal[];
  selectedEnvId: string[] = [this.inMemEnvId];
  selectedEnv: Env = null;
  teams: { [key: string]: Team } = {};

  bulkSelectIds = {
    export: []
  };
  selectAll = {
    export: false,
    share: false,
    unshare: false
  };

  newEnvNameModel: string = '';
  editEnvNameModel: string = '';

  flags = {
    editName: false,
    pendingSave: false,
    unsharingId: '',
    showAddEnv: false
  }

  constructor(
    private store: Store,
    private toaster: Toaster,
    private envService: EnvService,
    private fileSystem: FileSystem,
    private authService: AuthService,
    private confirmService: ConfirmService,
    private sharing: SharingService,
    private dialog: MatDialog) {
    this.store.select(UserState.getAuthUser).pipe(takeUntil(this.destroy)).subscribe(user => {
      this.authUser = user;
    });
    this.sharing.teams$
      .subscribe(teams => {
        this.teams = Utils.arrayToObj(teams, 'id');
      })
  }

  ngOnInit(): void {
    this.envs$
      .pipe(takeUntil(this.destroy))
      .subscribe(envs => {
        this.envsList = envs;
        if (this.selectedEnv?._id) {
          this.onEnvSelected()
        }
      });
    this.inMem$
      .pipe(take(1))
      .subscribe(envsObj => {
        this.inMemEnvs = Utils.objectEntries(envsObj).map(([key, val]) => {
          return { key, val };
        })
      })
  }
  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }

  selectEnv(env: Env, autoSelect = false) {
    this.selectedEnv = { ...env, vals: [...env.vals.map(val => { return { ...val } })] };
    if (autoSelect) {
      this.selectedEnvId = [env._id];
    }
  }

  onEnvSelected() {
    if (this.selectedEnvId[0] === this.inMemEnvId) {

    } else {
      this.selectEnv(this.envsList.find(env => env._id === this.selectedEnvId[0]));
    }
  }

  showAddEnvBox() {
    this.flags.showAddEnv = !this.flags.showAddEnv;
    this.newEnvNameModel = '';
    if (this.flags.showAddEnv) {
      setTimeout(() => {
        (this.addEnvInput.nativeElement as HTMLInputElement).focus();
      })
    }
  }

  async importFromFile() {
    const file: any = await this.fileSystem.readFile();
    var data = null;
    try {
      data = JSON.parse(file.data);
    } catch (e) {
      this.toaster.error('Import failed. Invalid file format');
    }
    if (!data)
      return;

    try {
      if (data.TYPE === 'Environment') {
        if (this.envService.validateImportData(data) === true) {
          if (data.value.length > 0) {//collectn of envs
            let envs: Env[] = data.value.map(e => {
              return {
                name: e.name,
                vals: e.vals
              }
            })
            await Promise.all(envs.map(async (env) => {
              return await this.envService.addEnv(env, true);
            }));
          }
        } else {
          this.toaster.error('Selected file doesn\'t contain valid environment information');
        }
      } else {
        this.toaster.error('Selected file doesn\'t contain valid environment information');
      }
    } catch (e) {
      this.toaster.error(`Failed to import Environment. ${e?.message || e || ''}`);
      console.error('Failed to import env', e)
    }

  }

  async createNewEnv() {
    await this.saveNewEnv(this.newEnvNameModel, []);
    this.flags.showAddEnv = false;
  }

  async saveNewEnv(newEnvName: string, vals: any[]): Promise<Env> {
    if (!newEnvName) return;

    var toSave: Env = {
      _id: null, name: newEnvName, vals: [], _created: null, _modified: null
    }
    if (vals) {
      toSave.vals = vals.map(val => Object.assign({}, val));
      toSave.vals.forEach(val => delete val.readOnly);
    }
    try {
      let newEnv = await this.envService.addEnv(toSave);
      this.toaster.success("Environment created.");
      return newEnv;
    } catch (e) {
      this.toaster.error(`Failed to create Environment. ${e?.message || e || ''}`);
      console.error('Failed to create env', e)
    }
  }


  startEnvNameEdit() {
    this.flags.editName = true;
    this.editEnvNameModel = this.selectedEnv.name;
    setTimeout(() => {
      (this.editEnvInput.nativeElement as HTMLInputElement).focus();
    })
  }

  async saveEnvNameEdit() {
    if (this.selectedEnv.name !== this.editEnvNameModel) {
      let toUpdate: Env = {
        ...this.selectedEnv,
        name: this.editEnvNameModel
      }
      try {
        await this.envService.updateEnv(toUpdate);
        this.toaster.success('Environment renamed.')
      } catch (e) {
        this.toaster.error(`Failed to update Environment. ${e?.message || e || ''}`);
        console.error('Failed to update env', e)
      }
    }
    this.flags.editName = false;
  }

  addNewEnvValue() {
    this.selectedEnv.vals.push({ key: '', val: '' });
    setTimeout(() => {
      let nodes = document.querySelectorAll('#envValsCont .envValsKey');
      if (nodes) {
        (nodes[nodes.length - 1] as HTMLElement).focus()
      }
    }, 0);
  }

  onEnvValueChange($event?) {
    if ($event && $event.target.classList.contains('unchanged-input')) {
      return;
    }
    this.updateSelectedEnv();
  }

  async updateSelectedEnv() {
    let toUpdate: Env = { ...this.selectedEnv };
    try {
      await this.envService.updateEnv(toUpdate);
    } catch (e) {
      this.toaster.error(`Failed to update Environment. ${e?.message || e || ''}`);
      console.error('Failed to update env', e)
    }
  }

  updateInMemEnv($event?) {
    if ($event && $event.target.classList.contains('unchanged-input')) {
      return;
    }
    this.store.dispatch(new EnvsAction.SetInMem(Utils.keyValPairAsObject(this.inMemEnvs, true)))
  }

  removeEnvVals(index: number) {
    this.selectedEnv.vals.splice(index, 1);
    this.updateSelectedEnv()
  }

  async deleteEnv(env, index) {
    if (env.proj) {
      const canDelete = await this.envService.canDelete(env._id);
      if (canDelete) {
        this.deleteEnvById(env._id, index);
      } else {
        this.toaster.error(`This environment is auto generated from the saved settings for API project "${env.proj.name}". This will be auto deleted when the API design project is deleted. To modify \'host\' & \'basePath\', go to the Designer section`);
      }
    } else {
      this.deleteEnvById(env._id, index);
    }
  }

  deleteEnvById(envId: string, index: number) {
    var envName = this.envsList[index].name;
    this.envService.deleteEnvs([envId]).then(() => {
      this.toaster.success(`Environment "${envName}" deleted.`);
      this.envsList.splice(index, 1);
      if (this.envsList.length === 0) {
        this.selectedEnv = null;
      } else if (this.selectedEnv.name.toLowerCase() === envName.toLowerCase()) {
        if (index === 0) {
          this.selectEnv(this.envsList[0], true);
        } else {
          this.selectEnv(this.envsList[index - 1], true);
        }
      }
    }, () => {
      this.toaster.error('Failed to delete environment');
    });
  }

  downloadMultiple() {
    var toDownload = [];
    for (var i = 0; i < this.bulkSelectIds.export.length; i++) {
      if (this.bulkSelectIds.export[i] === this.envsList[i]._id) {
        delete this.envsList[i].owner;
        delete this.envsList[i].team;
        toDownload.push(this.envsList[i]);
      }
    }
    this.downloadEnv(toDownload);
  }

  downloadEnv(toDownload) {
    this.fileSystem.downloadEnv(toDownload);
  }
  selectionToggled(type, id) {
    if (this.bulkSelectIds[type].indexOf(id) < 0) {
      this.bulkSelectIds[type].push(id);
    } else {
      var index = this.bulkSelectIds[type].indexOf(id);
      this.bulkSelectIds[type].splice(index, 1);
    }
    if (this.bulkSelectIds[type].length === this.envsList.length) {
      this.selectAll[type] = true;
    } else {
      this.selectAll[type] = false;
    }
    return;
  }
  toggleAllSelection(type) {
    this.bulkSelectIds[type] = [];
    this.selectAll[type] = !this.selectAll[type];
    if (this.selectAll[type]) {
      for (var i = 0; i < this.envsList.length; i++) {
        var env = this.envsList[i];
        if (type === 'share' /*TODO: && !env.team && $rootScope.userData && env.owner === $rootScope.userData.UID*/) {
          this.bulkSelectIds[type].push(env._id);
        } else if (type === 'unshare' /*TODO: && env.team && $rootScope.userData && env.owner === $rootScope.userData.UID*/) {
          this.bulkSelectIds[type].push(env._id);
        } else if (type === 'export') {
          this.bulkSelectIds[type].push(env._id);
        }
      }
    }
  }

  trackByEnvId(index, env) {
    return env._id;
  }

  trackByIndex(index) {
    return index
  }

  stopPropagation(event) {
    event.stopPropagation();
  }

  shareEnv(env: Env) {
    if (!this.authService.isLoggedIn()) {
      this.toaster.error('You need to login to apic to use this feature.');
      return;
    }
    if (env.proj && env.proj.id) {
      this.confirmService.alert({
        id: 'Share:Env',
        confirmTitle: 'Share Environment',
        confirm: 'This environment is automatically shared when the API project it belongs to is also shared. To share this environment just share the API Project it belongs to.',
        confirmOk: 'Ok'
      });
    } else {
      this.dialog.open(SharingComponent, { data: { objIds: [env._id], type: 'Envs' } });
    }
  }

  unshareEnv(env: Env) {
    if (env.proj && env.proj.id) {
      this.confirmService.alert({
        id: 'Share:Env',
        confirmTitle: 'Share Environment',
        confirm: 'This environment is automatically un-shared when the API project it belongs to is also un-shared. To un-share this environment you need to un-share the API Project it belongs to.',
        confirmOk: 'Ok'
      });
      return;
    }
    this.flags.unsharingId = env._id;
    this.sharing.unshare(env._id, env.team, 'Envs').pipe(first())
      .subscribe(teams => {
        this.flags.unsharingId = '';
        this.toaster.success(`Environment un-shared with team.`);
      }, () => {
        this.flags.unsharingId = '';
      })
  }
}
