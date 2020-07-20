import { Env } from './../models/Envs.model';
import { DeleteEnv, AddEnvs, UpdateEnvs, RefreshEnvs } from './../actions/envs.action';
import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import iDB from './IndexedDB';
import SyncIt from './sync.service'
import User from '../models/User'
import apic from '../utils/apic';

@Injectable({
  providedIn: 'root'
})
export class EnvService {

  constructor(private store: Store) { }
  async getAllEnvs() {
    const projects = await iDB.read('Environments');
    this.store.dispatch(new RefreshEnvs(projects));
    return projects;
  }
  deleteEnv(envId, fromSync?: boolean) {
    return iDB.delete('Environments', envId).then((data) => {
      if (!fromSync) {
        SyncIt.prepareAndSync('deleteEnv', envId);
      }
      this.store.dispatch(new DeleteEnv(envId));
      return data;
    });
  }

  addEnv(newEnv, fromSync?: boolean) {
    return iDB.insert('Environments', newEnv).then((data) => {
      if (data[0] && User.userData.UID && !fromSync) {//added successfully
        SyncIt.prepareAndSync('addEnv', newEnv);
      }
      this.store.dispatch(new AddEnvs([newEnv]));
      return data;
    });
  }

  updateEnv(env: Env, fromSync?: boolean) {
    return iDB.upsert('Environments', env).then((data) => {
      if (data && !fromSync) {
        var envsToSync = apic.removeDemoItems(env); //returns a list
        if (envsToSync.length > 0) {
          SyncIt.prepareAndSync('updateEnv', envsToSync);
        }
      }
      this.store.dispatch(new UpdateEnvs([env]));

      //TODO
      // $rootScope.$emit('envUpdated');
      return data;
    });
  }

  //TODO
  // getAllEnvs: getAllEnvs,
  // deleteEnv: deleteEnv,
  // clear: clear,
  // canDelete: canDelete
}
