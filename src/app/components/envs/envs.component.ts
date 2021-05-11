import { EnvService } from '../../services/env.service';
import { Toaster } from '../../services/toaster.service';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSelectionListChange } from '@angular/material/list';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { first, map, take, takeUntil } from 'rxjs/operators';
import { Env } from '../../models/Envs.model';
import { EnvState } from '../../state/envs.state';
import { AceEditorDirective } from 'ng2-ace-editor';
import { FileSystem } from '../../services/fileSystem.service';
import { env } from 'process';
import { User } from '../../models/User.model';
import { UserState } from '../../state/user.state';
import { KeyVal } from '../../models/KeyVal.model';
import { Utils } from '../../services/utils.service';
import { EnvsAction } from '../../actions/envs.action';

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
  pendingSave: string[] = [];
  bulkSelectIds = {
    export: []
  };
  selectAll = {
    export: false,
    share: false,
    unshare: false
  };

  showAddEnv: boolean = false;
  selectedEnthisodified: boolean = false;
  newEnvNameModel: string = '';
  editEnvNameModel: string = '';

  flags = {
    editName: false,
    pendingSave: false
  }

  constructor(private store: Store, private toaster: Toaster, private envService: EnvService, private fileSystem: FileSystem) {
    this.store.select(UserState.getAuthUser).pipe(takeUntil(this.destroy)).subscribe(user => {
      this.authUser = user;
    });
  }

  ngOnInit(): void {
    this.envs$.pipe(take(1)).subscribe(envs => {
      // this.envsList = envs.map(env => JSON.parse(JSON.stringify(env)))
      this.envsList = JSON.parse(JSON.stringify(envs))
    });
    this.inMem$.pipe(take(1)).subscribe(envsObj => {
      this.inMemEnvs = Utils.objectEntries(envsObj).map(([key, val]) => {
        return { key, val };
      })
    })
  }
  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }

  showAddEnvBox() {
    this.showAddEnv = !this.showAddEnv;
    this.newEnvNameModel = '';
    if (this.showAddEnv) {
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

    if (data.TYPE === 'Environment') {
      if (this.envService.validateImportData(data) === true) {
        var ts = new Date().getTime();
        if (data.value.length > 0) {//collectn of envs
          data.value.forEach((env: Env) => {
            delete env.owner;
            delete env.team;
            delete env.proj;
            env.vals?.forEach(v => delete v.readOnly);
          });
          const ids = await this.envService.addEnvs(data.value);
          ids.forEach(id => this.refreshEnvFromStore(id));
        }
      } else {
        this.toaster.error('Selected file doesn\'t contain valid environment information');
      }
    } else {
      this.toaster.error('Selected file doesn\'t contain valid environment information');
    }
  }

  createNewEnv() {
    this.saveNewEnv(this.newEnvNameModel, [], true);
  }

  async saveNewEnv(newEnvName: string, vals: any[], isCopying: boolean) {
    if (!newEnvName) return;
    for (var i = 0; i < this.envsList.length; i++) {
      if (this.envsList[i].name.toLowerCase() === newEnvName.toLowerCase()) {
        if (isCopying) {
          newEnvName = newEnvName + ' Copy';
          i = -1;
        } else {
          this.toaster.error(`Environment with name "${newEnvName}" already exists.`);
          return;
        }
      }
    }

    var toSave: Env = {
      _id: null, name: newEnvName, vals: [], _created: null, _modified: null
    }
    if (vals) {
      toSave.vals = vals.map(val => Object.assign({}, val));
      if (isCopying) {
        toSave.vals.forEach(val => delete val.readOnly);
      }
    }
    var newEnvId = await this.envService.addEnv(toSave);
    this.toaster.success("Environment created.");
    this.refreshEnvFromStore(newEnvId, true);
    // if (!this.validateKeys())
    //   return;
    // this.flags.showType = 'env';
    // if ($scope.envDetailForm.$dirty) {
    //   this.selectedEnv._modified = new Date().getTime();
    // }
    // this.selectedEnv = env;
    // discardEdit();
    // $scope.envDetailForm.$setPristine();
  }

  refreshEnvFromStore(id, select?: boolean) {
    this.store.select(EnvState.getById)
      .pipe(map(filterFn => filterFn(id)))
      .pipe(take(1))
      .subscribe(newEnv => {
        this.envsList.unshift({ ...newEnv, vals: [...newEnv.vals] });
        if (select) {
          this.selectedEnvId = [newEnv._id];
          this.onEnvSelected(null);
        }
      });
  }

  startEnvEdit() {
    this.flags.editName = true;
    setTimeout(() => {
      (this.editEnvInput.nativeElement as HTMLInputElement).focus();
    })
  }

  saveEnvEdit() {
    if (this.selectedEnv.name !== this.editEnvNameModel) {
      if (this.doesEnvWithSameNameExist(this.editEnvNameModel)) {
        this.toaster.error(`Environment "${this.editEnvNameModel}" is already there.`);
        this.flags.editName = false;
        this.editEnvNameModel = this.selectedEnv.name;
        return;
      }
      this.addToPendingSave(this.selectedEnv._id);
      this.selectedEnv.name = this.editEnvNameModel;
    }
    this.flags.editName = false;
  }

  onEnvSelected(event: MatSelectionListChange) {
    if (this.selectedEnvId[0] === this.inMemEnvId) {

    } else {
      this.selectedEnv = this.envsList.find(env => env._id === this.selectedEnvId[0]);
      this.editEnvNameModel = this.selectedEnv.name;
    }
  }

  addToPendingSave(envId: string) {
    if (this.pendingSave.indexOf(envId) < 0) this.pendingSave.push(envId);
  }

  async saveEnvs() {
    let envsToUpdate = this.envsList.filter(env => this.pendingSave.indexOf(env._id) >= 0);
    if (envsToUpdate.length > 0) {
      try {
        const updatedIds = await this.envService.updateEnvs(envsToUpdate);
        //update inmem envs in state
        this.store.dispatch(new EnvsAction.PatchInMem(Utils.keyValPairAsObject(this.inMemEnvs, true)))
        this.toaster.success('Environments updated.');
      } catch (e) {
        console.error('Failed to update env', e);
        this.toaster.error(`Failed to update enviroment: ${e.message}`);
      }
    } else {
      this.store.dispatch(new EnvsAction.SetInMem(Utils.keyValPairAsObject(this.inMemEnvs, true)))
      this.toaster.success('Environments updated.');
    }
    this.pendingSave = [];
  }


  removeEnvVals(index: number) {
    this.selectedEnv.vals.splice(index, 1);
    this.addToPendingSave(this.selectedEnv._id);
  }

  doesEnvWithSameNameExist(name: String): boolean {
    return this.envsList.find(env => env.name === name) ? true : false
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
    this.envService.deleteEnvs([envId]).then(() => {
      var envName = this.envsList[index].name;
      this.toaster.success(`Environment "${envName}" deleted.`);
      this.envsList.splice(index, 1);
      if (this.envsList.length === 0) {
        this.selectedEnv = null;
      } else if (this.selectedEnv.name.toLowerCase() === envName.toLowerCase()) {
        if (index === 0) {
          this.autoSelectEnv(this.envsList[0]);
        } else {
          this.autoSelectEnv(this.envsList[index - 1]);
        }

      }
    }, () => {
      this.toaster.error('Failed to delete environment');
    });
  }

  autoSelectEnv(env: Env) {
    this.selectedEnv = env;
    this.selectedEnvId = [env._id];
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
}
