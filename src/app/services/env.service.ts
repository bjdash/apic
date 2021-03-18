import { BehaviorSubject, Observable } from 'rxjs';
import Ajv from "ajv";
import { Store } from '@ngxs/store';
import { Env } from './../models/Envs.model';
import { EnvsAction } from './../actions/envs.action';
import { Injectable } from '@angular/core';
import iDB from './IndexedDB';
import User from '../models/User'
import apic from '../utils/apic';
import LocalStore from './localStore';
import { env } from 'process';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class EnvService {
  private stateTracker = new BehaviorSubject<any>({});
  private ajv;

  constructor(private store: Store, private syncService: SyncService) {
    this.ajv = new Ajv()
  }

  getState(): Observable<any> {
    return this.stateTracker.asObservable();
  }

  async getAllEnvs() {
    const projects = await iDB.read('Environments');
    this.store.dispatch(new EnvsAction.Refresh(projects));
    //populate last selected env
    this.store.dispatch(new EnvsAction.Select(LocalStore.get(LocalStore.LAST_SELECTED_ENV)))
    return projects;
  }

  deleteEnv(envId, fromSync?: boolean) {
    return iDB.delete('Environments', envId).then((data) => {
      if (!fromSync) {
        this.syncService.prepareAndSync('deleteEnv', envId);
      }
      this.store.dispatch(new EnvsAction.Delete(envId));
      return data;
    });
  }

  addEnv(newEnv: Env, fromSync?: boolean) {
    const ts = Date.now();
    if (!newEnv.vals) newEnv.vals = [];
    newEnv._created = ts;
    newEnv._modified = ts;
    newEnv._id = ts + '-' + apic.s12();
    return iDB.insert('Environments', newEnv).then((data) => {
      if (data[0] && User.userData.UID && !fromSync) {//added successfully
        this.syncService.prepareAndSync('addEnv', newEnv);
      }
      this.store.dispatch(new EnvsAction.Add([newEnv]));
      //returns id of newly added env
      return data;
    });
  }

  addEnvs(envs: Env[], fromSync?: boolean) {
    const ts = Date.now();
    envs.forEach(newEnv => {
      if (!newEnv.vals) newEnv.vals = [];
      newEnv._created = ts;
      newEnv._modified = ts;
      newEnv._id = ts + '-' + apic.s12();
    })

    return iDB.insertMany('Environments', envs).then((data) => {
      console.log(data);
      if (data[0] && User.userData.UID && !fromSync) {//added successfully
        this.syncService.prepareAndSync('addEnv', envs);
      }
      this.store.dispatch(new EnvsAction.Add(envs));
      //returns id of newly added env
      return data;
    });
  }

  updateEnv(env: Env, fromSync?: boolean) {
    env._modified = Date.now();
    return iDB.upsert('Environments', env).then((data) => {
      if (data && !fromSync) {
        var envsToSync = apic.removeDemoItems(env); //returns a list
        if (envsToSync.length > 0) {
          this.syncService.prepareAndSync('updateEnv', envsToSync);
        }
      }
      this.store.dispatch(new EnvsAction.Update([env]));

      //TODO
      // $rootScope.$emit('envUpdated');
      // this.stateTracker.next({ env });
      return data;
    });
  }

  updateEnvs(envs: Env[], fromSync?: boolean) {
    return iDB.upsertMany('Environments', envs).then((updatedIds) => {
      if (updatedIds && !fromSync) {
        var envsToSync = apic.removeDemoItems(envs); //returns a list
        if (envsToSync.length > 0) {
          this.syncService.prepareAndSync('updateEnv', envsToSync);
        }
      }
      this.store.dispatch(new EnvsAction.Update(envs));

      //TODO
      // $rootScope.$emit('envUpdated');
      // this.stateTracker.next({ env });
      return updatedIds;
    });
  }

  canDelete(envId) {
    return iDB.findByKey('Environments', '_id', envId).then(function (env) {
      if (!env) return false;
      if (env.proj) {
        return iDB.findByKey('ApiProjects', '_id', env.proj.id).then(function (data) {
          if (data) return false;
          return true;
        });
      }
      return true;
    })
  }

  validateImportData(importData): boolean {
    const schema = {
      "type": "object",
      "properties": {
        "TYPE": {
          "type": "string",
          "enum": ["Environment"]
        },
        "value": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "vals": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "key": { "type": "string" },
                    "val": { "type": "string" }
                  },
                  "required": ["key"]
                }
              },
              "_created": {
                "type": ["string", "integer"]
              },
              "_modified": {
                "type": ["string", "integer"]
              },
              "_id": { "type": "string" },
              "proj": {
                "type": "object",
                "properties": {
                  "id": { "type": "string" },
                  "name": { "type": "string" }
                },
                "required": ["id", "name"]
              }
            },
            "required": ["name", "vals"]
          }
        }
      },
      "required": ["TYPE", "value"]
    }
    const validate = this.ajv.compile(schema);
    const valid = validate(importData);
    if (!valid) console.log(validate.errors);
    return valid;
  }
  //TODO
  // clear: clear,
}
