import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import Ajv from 'ajv';
import { StompMessage } from '../models/StompMessage.model';
import { User } from '../models/User.model';
import { UserState } from '../state/user.state';
import { SyncService } from './sync.service';
import iDB from './IndexedDB';
import { ApicUrls, SAVED_SETTINGS } from '../utils/constants';
import { SuitesAction } from '../actions/suites.action';
import { TestProject } from '../models/TestProject.model';
import apic from '../utils/apic';
import { Suite, SuiteReq } from '../models/Suite.model';
import { ApiRequest } from '../models/Request.model';
import { BehaviorSubject, Subject } from 'rxjs';
import { SyncModifiedNotification } from '../models/SyncModifiedNotification';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SuiteService {
  authUser: User;
  ajv = null;
  updatedViaSync$: BehaviorSubject<SyncModifiedNotification> = null;
  private _initAddReq = new Subject<any>();
  initAddReq$ = this._initAddReq.asObservable();

  constructor(private store: Store, private syncService: SyncService, private httpClient: HttpClient) {
    this.store.select(UserState.getAuthUser).subscribe(user => {
      this.authUser = user;
    });
    this.syncService.onSuiteMessage$.subscribe(async message => {
      this.onSyncMessage(message);
    });
    this.updatedViaSync$ = new BehaviorSubject(null);
    this.ajv = new Ajv();
  }

  async getTestProjects(): Promise<TestProject[]> {
    const projects: TestProject[] = await iDB.read(iDB.TABLES.TEST_PROJECTS);
    this.store.dispatch(new SuitesAction.Project.Refresh(projects));
    return projects;
  }

  async createTestProjects(projects: TestProject[], fromSync?: boolean) {
    if (!fromSync) {
      var time = new Date().getTime();
      projects.forEach(project => {
        if (this.authUser?.UID) {
          project.owner = this.authUser.UID;
        } else {
          delete project.owner;
        }
        project._id = time + '-' + apic.s12();
        project._created = time;
        project._modified = time;
      })
    }
    let data = await iDB.insertMany(iDB.TABLES.TEST_PROJECTS, projects);
    if (!fromSync && this.authUser?.UID) {//added successfully
      this.syncService.prepareAndSync('addTestProj', projects);
    }
    this.store.dispatch(new SuitesAction.Project.Add(projects));
    return projects;
  }

  async updateTestProject(projects: TestProject[], fromSync?: boolean) {
    if (!fromSync) {
      projects.forEach(f => f._modified = Date.now());
    }
    return iDB.upsertMany(iDB.TABLES.TEST_PROJECTS, projects).then((updatedIds) => {
      if (updatedIds && !fromSync && this.authUser?.UID) {
        var projectsToSync = apic.removeDemoItems(projects); //returns a list
        if (projectsToSync.length > 0) {
          this.syncService.prepareAndSync('updateTestProj', projectsToSync);
        }
      }
      this.store.dispatch(new SuitesAction.Project.Update(projects));
      return updatedIds;
    });
  }

  async deleteTestprojects(ids: string[], fromSync?: boolean) {
    let data = await iDB.deleteMany(iDB.TABLES.TEST_PROJECTS, ids); //data doesnt contain deleted ids
    if (!fromSync && this.authUser?.UID) {
      this.syncService.prepareAndSync('deleteTestProj', ids);
    }
    this.store.dispatch(new SuitesAction.Project.Delete(ids));
    return data;
  }

  async getTestSuites() {
    const suites = await iDB.read(iDB.TABLES.TEST_SUITES);
    this.store.dispatch(new SuitesAction.Suites.Refresh(suites));
    return suites;
  }
  async createTestSuites(suites: Suite[], fromSync?: boolean) {
    if (!fromSync) {
      var time = new Date().getTime();
      suites.forEach(suite => {
        if (this.authUser?.UID) {
          suite.owner = this.authUser.UID;
        } else {
          delete suite.owner;
        }
        suite._id = time + '-' + apic.s12();
        suite._created = time;
        suite._modified = time;
      })
    }
    let data = await iDB.insertMany(iDB.TABLES.TEST_SUITES, suites);
    if (!fromSync && this.authUser?.UID) {//added successfully
      this.syncService.prepareAndSync('addTestSuit', suites);
    }
    this.store.dispatch(new SuitesAction.Suites.Add(suites));
    return suites;
  }
  async updateSuites(suites: Suite[]) {
    suites.forEach(f => f._modified = Date.now());

    return iDB.upsertMany(iDB.TABLES.TEST_SUITES, suites).then((updatedIds) => {
      if (updatedIds && this.authUser?.UID) {
        var projectsToSync = apic.removeDemoItems(suites); //returns a list
        if (projectsToSync.length > 0) {
          this.syncService.prepareAndSync('updateTestSuit', projectsToSync);
        }
      }
      this.store.dispatch(new SuitesAction.Suites.Update(suites));
      return updatedIds;
    });
  }

  //Update the API projects when received via sync message
  async updateSyncedSuites(suites: Suite[]) {
    let updatedIds = await iDB.upsertMany(iDB.TABLES.TEST_SUITES, suites);
    this.updatedViaSync$.next({ type: 'update', ids: updatedIds as string[] });
    this.store.dispatch(new SuitesAction.Suites.Update(suites));
    return updatedIds;
  }

  async deleteSyncedProjects(ids: string[]) {
    await iDB.deleteMany(iDB.TABLES.TEST_SUITES, ids);
    this.updatedViaSync$.next({ type: 'delete', ids });
    this.store.dispatch(new SuitesAction.Suites.Delete(ids));
    return ids;
  }

  async deleteSuites(ids: string[], fromSync?: boolean) {
    let data = await iDB.deleteMany(iDB.TABLES.TEST_SUITES, ids); //data doesnt contain deleted ids
    if (!fromSync && this.authUser?.UID) {
      this.syncService.prepareAndSync('deleteTestSuit', ids);
    }
    this.store.dispatch(new SuitesAction.Suites.Delete(ids));
    return data;
  }

  async onSyncMessage(message: StompMessage) {
    if (!message?.action) return;

    if (message.type == 'TestCaseProjects' || message.type === 'Fetch:TestCaseProjects') {
      if ((message.testCaseProjects?.length > 0)) {
        if (message.action === 'update' || message.action === 'add') {
          let testCaseProjects = await this.updateTestProject(message.testCaseProjects, true);
          console.info('Sync: added/updated testCaseProjects', testCaseProjects)
        }
      } else if (message.idList?.length > 0 && message.action === 'delete') {
        const resp = await this.deleteTestprojects(message.idList, true);
        console.info('Sync: deleted testCaseProjects', resp)
      }

      if (message.nonExistant?.testCaseProjects?.length > 0) {
        const resp = await this.deleteTestprojects(message.nonExistant?.testCaseProjects, true);
        console.info('Sync: deleted testCaseProjects', resp)
      }

      if (message.originalComand?.includes('Fetch:TestCaseProjects')) {
        iDB.upsert(iDB.TABLES.SETTINGS, {
          _id: SAVED_SETTINGS.LAST_SYNCED.TEST_PROJECTS,
          time: Date.now()
        });
      }
    } else if (message.type == 'TestSuits' || message.type == 'Fetch:TestSuits') {
      if ((message.testSuits?.length > 0)) {
        if (message.action === 'update' || message.action === 'add') {
          let reqs = await this.updateSyncedSuites(message.testSuits);
          console.info('Sync: added/updated testSuits', reqs)
        }
      } else if (message.idList?.length > 0 && message.action === 'delete') {
        const resp = await this.deleteSyncedProjects(message.idList);
        console.info('Sync: deleted testSuits', resp)
      }

      if (message.nonExistant?.testSuits?.length > 0) {
        const resp = await this.deleteSyncedProjects(message.nonExistant?.testSuits);
        console.info('Sync: deleted testSuits', resp)
      }

      if (message.originalComand?.includes('Fetch:TestSuits')) {
        iDB.upsert(iDB.TABLES.SETTINGS, {
          _id: SAVED_SETTINGS.LAST_SYNCED.SUITES,
          time: Date.now()
        });
      }
    }
  }

  //sync any testProjects those were created before the user even logged in
  async syncTestProjects(hardSync: boolean = false) {
    let testProjects: TestProject[] = await iDB.read(iDB.TABLES.TEST_PROJECTS);
    testProjects = apic.removeDemoItems(testProjects);

    //sync testProjects created before login
    const testProjectsBeforeLogin = testProjects.filter(p => !p.owner);
    if (testProjectsBeforeLogin.length > 0) {
      this.syncService.execute('syncPreLoginData', { testCaseProjects: testProjectsBeforeLogin })
    }

    //sync any testProjects we may not have in local and any which is in local and deleted in server
    var localProjectsToSyncWithServer = testProjects.filter(p => p.owner);

    if (hardSync) {
      this.syncService.fetch('Fetch:TestCaseProjects');
    } else {
      var lastSyncedTime = await iDB.findById(iDB.TABLES.SETTINGS, SAVED_SETTINGS.LAST_SYNCED.TEST_PROJECTS);
      this.syncService.fetch('Fetch:TestCaseProjects', lastSyncedTime?.time, { testCaseProjects: localProjectsToSyncWithServer.map(p => { return { _id: p._id, _modified: p._modified }; }) })
    }
  }

  //sync any suites those were created before the user even logged in
  async syncTestSuites(hardSync: boolean = false) {
    let suites: Suite[] = await iDB.read(iDB.TABLES.TEST_SUITES);
    suites = apic.removeDemoItems(suites);

    //sync suites created before login
    const suitesBeforeLogin = suites.filter(p => !p.owner);
    if (suitesBeforeLogin.length > 0) {
      this.syncService.execute('syncPreLoginData', { testSuits: suitesBeforeLogin })
    }

    //sync any suites we may not have in local and any which is in local and deleted in server
    var localReqsToSyncWithServer = suites.filter(p => p.owner);

    if (hardSync) {
      this.syncService.fetch('Fetch:TestSuits');
    } else {
      var lastSyncedTime = await iDB.findById(iDB.TABLES.SETTINGS, SAVED_SETTINGS.LAST_SYNCED.SUITES);
      this.syncService.fetch('Fetch:TestSuits', lastSyncedTime?.time, { testSuits: localReqsToSyncWithServer.map(p => { return { _id: p._id, _modified: p._modified }; }) })
    }
  }

  async clearSuites() {
    return await Promise.all([
      iDB.clear(iDB.TABLES.TEST_SUITES),
      iDB.delete(iDB.TABLES.SETTINGS, SAVED_SETTINGS.LAST_SYNCED.SUITES)
    ]);
  }

  async clearTestProjects() {
    return await Promise.all([
      iDB.clear(iDB.TABLES.TEST_PROJECTS),
      iDB.delete(iDB.TABLES.SETTINGS, SAVED_SETTINGS.LAST_SYNCED.TEST_PROJECTS)
    ]);
  }

  duplicateReqInSuit(suite: Suite, req: SuiteReq, index: number) {
    let suiteToUpdate: Suite = { ...suite, reqs: [...suite.reqs] }
    let newReq: SuiteReq = { ...req, name: req.name + ' copy' };
    suiteToUpdate.reqs.splice(index + 1, 0, newReq)
    return this.updateSuites([suiteToUpdate]);
  }

  removeReqFromSuit(suite: Suite, reqId: string, index: number) {
    if (suite.reqs[index]?._id === reqId) {
      let suiteToUpdate: Suite = { ...suite, reqs: [...suite.reqs] }
      suiteToUpdate.reqs.splice(index, 1);
      return this.updateSuites([suiteToUpdate]);
    }
  }

  async loadWau(id: string) {
    let response: any = await this.httpClient.get(ApicUrls.webAccess + id).toPromise();
    return response.resp.url;
  }

  initAddReq(suite: Suite, index: number) {
    this._initAddReq.next([suite, index]);
  }

  validateProjectImportData(importData): boolean {
    const schema = {
      "type": "object",
      "properties": {
        "TYPE": {
          "type": "string",
          "enum": ["APICTestProject"]
        },
        "value": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "suites": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "reqs": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "name": { "type": "string" },
                        "url": { "type": "string" },
                        "method": { "type": "string" }
                      },
                      "required": ["name", "url", "method"]
                    }
                  }
                },
                "required": ["name", "reqs"]
              }
            }
          },
          "required": ["name", "suites"]
        }
      },
      "required": ["TYPE", "value"]
    }
    const validate = this.ajv.compile(schema);
    const valid = validate(importData);
    if (!valid) console.error(validate.errors);
    return valid;
  }

  validateSuiteImportData(importData): boolean {
    const schema = {
      "type": "object",
      "properties": {
        "TYPE": {
          "type": "string",
          "enum": ["APICSuite"]
        },
        "value": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "reqs": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "url": { "type": "string" },
                  "method": { "type": "string" }
                },
                "required": ["name", "url", "method"]
              }
            }
          },
          "required": ["name", "reqs"]
        }
      },
      "required": ["TYPE", "value"]
    }
    const validate = this.ajv.compile(schema);
    const valid = validate(importData);
    if (!valid) console.error(validate.errors);
    return valid;
  }
}
