import { BehaviorSubject, Observable } from 'rxjs';
import Ajv from "ajv";
import { Store } from '@ngxs/store';
import { Env } from './../models/Envs.model';
import { EnvsAction } from './../actions/envs.action';
import { Injectable } from '@angular/core';
import iDB from './IndexedDB';
import apic from '../utils/apic';
import LocalStore from './localStore';
import { env } from 'process';
import { SyncService } from './sync.service';
import { StompMessage } from '../models/StompMessage.model';
import { User } from '../models/User.model';
import { UserState } from '../state/user.state';

@Injectable({
  providedIn: 'root'
})
export class EnvService {
  private stateTracker = new BehaviorSubject<any>({});//TODO: is this required?
  private ajv;
  authUser: User;


  constructor(private store: Store, private syncService: SyncService) {
    this.ajv = new Ajv();
    this.store.select(UserState.getAuthUser).subscribe(user => {
      this.authUser = user;
    });
    this.syncService.onEnvMessage$.subscribe(async message => {
      this.onSyncMessage(message);
    })
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

  deleteEnvs(envIds: string[], fromSync?: boolean) {
    return iDB.deleteMany('Environments', envIds).then((data) => {
      if (!fromSync && this.authUser?.UID) {
        this.syncService.prepareAndSync('deleteEnv', envIds);
      }
      this.store.dispatch(new EnvsAction.Delete(envIds));
      return data;
    });
  }

  addEnv(newEnv: Env, fromSync?: boolean) {
    if (!fromSync) {
      const ts = Date.now();
      if (!newEnv.vals) newEnv.vals = [];
      newEnv._created = ts;
      newEnv._modified = ts;
      newEnv._id = ts + '-' + apic.s12();
      if (this.authUser?.UID) {
        newEnv.owner = this.authUser.UID;
      }
    }
    return iDB.insert('Environments', newEnv).then((data) => {
      if (data[0] && this.authUser?.UID && !fromSync) {//added successfully
        this.syncService.prepareAndSync('addEnv', newEnv);
      }
      this.store.dispatch(new EnvsAction.Add([newEnv]));
      //returns id of newly added env
      return data;
    });
  }

  addEnvs(envs: Env[], fromSync?: boolean) {
    if (!fromSync) {
      const ts = Date.now();
      envs.forEach(newEnv => {
        if (!newEnv.vals) newEnv.vals = [];
        newEnv._created = ts;
        newEnv._modified = ts;
        newEnv._id = ts + '-' + apic.s12();
      })
    }

    return iDB.insertMany('Environments', envs).then((data) => {
      if (data[0] && this.authUser?.UID && !fromSync) {//added successfully
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
      if (data && !fromSync && this.authUser?.UID) {
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
      if (updatedIds && !fromSync && this.authUser?.UID) {
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
    return iDB.findById(iDB.TABLES.ENVIRONMENTS, envId).then(function (env) {
      if (!env) return false;
      if (env.proj) {
        return iDB.findById(iDB.TABLES.API_PROJECTS, env.proj.id).then(function (data) {
          if (data) return false;
          return true;
        });
      }
      return true;
    })
  }

  async onSyncMessage(message: StompMessage) {
    if (!message?.action) return;

    if (message.envs?.length > 0) {
      if (message.action === 'add' || message.action === 'update') {
        const resp = await this.updateEnvs(message.envs, true);
        console.info('Sync: added/updated Env', resp)
      }
    } else if (message.idList?.length > 0 && message.action === 'delete') {
      const resp = await this.deleteEnvs(message.idList, true);
      console.info('Sync: deleted env', resp)
    }

    if (message.nonExistant?.envs?.length > 0) {
      const resp = await this.deleteEnvs(message.nonExistant?.envs, true);
      console.info('Sync: deleted env', resp)
    }

    if (message.originalComand?.includes('Fetch:Envs')) {
      iDB.upsert(iDB.TABLES.SETTINGS, {
        _id: 'lastSyncedEnvs',
        time: Date.now()
      });
    }
  }

  //sync any envs those were created before the user even logged in
  async syncEnvs(hardSync: boolean = false) {
    let envs: Env[] = await iDB.read(iDB.TABLES.ENVIRONMENTS);
    envs = apic.removeDemoItems(envs);

    //sync API envs created before login
    const envsBeforeLogin = envs.filter(p => !p.owner);
    if (envsBeforeLogin.length > 0) {
      this.syncService.execute('syncPreLoginData', { envs: envsBeforeLogin })
    }

    //sync any envs we may not have in local and any which is in local and deleted in server
    var localEnvsToSyncWithServer = envs.filter(p => p.owner);

    if (hardSync) {
      this.syncService.fetch('Fetch:Envs');
    } else {
      var lastSyncedTime = await iDB.findById(iDB.TABLES.SETTINGS, 'lastSyncedEnvs')
      this.syncService.fetch('Fetch:Envs', lastSyncedTime?.time, { envs: localEnvsToSyncWithServer.map(p => { return { _id: p._id, _modified: p._modified }; }) })
    }

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
    if (!valid) console.error(validate.errors);
    return valid;
  }
  //TODO
  // clear: clear,
}
