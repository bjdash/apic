import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
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
import { SuitesStateSelector } from '../state/suites.selector';
import { first } from 'rxjs/operators';
import { SandboxService } from './tester.service';

@Injectable({
  providedIn: 'root'
})
export class SuiteService {
  authUser: User;
  updatedViaSync$: BehaviorSubject<SyncModifiedNotification> = null;
  private _initAddReq = new Subject<any>();
  initAddReq$ = this._initAddReq.asObservable();
  private _initDevtoolsImport = new Subject<any>();
  initDevtoolsImport$ = this._initDevtoolsImport.asObservable();

  constructor(private store: Store, private syncService: SyncService, private httpClient: HttpClient, private sandboxService:SandboxService) {
    this.store.select(UserState.getAuthUser).subscribe(user => {
      this.authUser = user;
    });
    this.syncService.onSuiteMessage$.subscribe(async message => {
      this.onSyncMessage(message);
    });
    this.updatedViaSync$ = new BehaviorSubject(null);
  }

  async loadTestProjects(): Promise<TestProject[]> {
    const projects: TestProject[] = await iDB.read(iDB.TABLES.TEST_PROJECTS);
    this.store.dispatch(new SuitesAction.Project.Refresh(projects));
    return projects;
  }

  async createTestProject(project: TestProject, addWithSuffix = false): Promise<TestProject> {
    var time = new Date().getTime();
    project._id = time + '-' + apic.s12();
    project._created = time;
    project._modified = time;
    if (this.authUser?.UID) {
      project.owner = this.authUser.UID;
    } else {
      delete project.owner;
    }

    //owner detail has to be set first before this check
    let allProjs = await this.store.select(SuitesStateSelector.getProjectsPartial).pipe(first()).toPromise();
    if (addWithSuffix) {
      let duplicate = false
      do {
        duplicate = allProjs.some(p => p.name.toLocaleLowerCase() == project.name.toLocaleLowerCase() && p.owner === project.owner)
        if (duplicate) {
          project.name += ` ${apic.s4()}`
        }
      } while (duplicate);
    } else if (allProjs.find(p => p.name.toLowerCase() === project.name.toLowerCase() && p.owner === project.owner)) {
      throw new Error('A project with the same name already exists.')
    }

    let data = await iDB.insert(iDB.TABLES.TEST_PROJECTS, project);
    if (this.authUser?.UID) {//added successfully
      this.syncService.prepareAndSync('addTestProj', [project]);
    }
    this.store.dispatch(new SuitesAction.Project.Add([project]));
    return project;
  }

  async updateTestProject(project: TestProject): Promise<TestProject> {
    let allProjs = await this.store.select(SuitesStateSelector.getProjectsPartial).pipe(first()).toPromise();
    if (allProjs.find(p => p.name.toLowerCase() === project.name.toLowerCase() && p._id != project._id && p.owner === project.owner)) {
      throw new Error('A project with the same name already exists.')
    }
    project._modified = Date.now();
    return iDB.upsert(iDB.TABLES.TEST_PROJECTS, project).then((updatedIds) => {
      if (updatedIds && this.authUser?.UID) {
        var projectsToSync = apic.removeDemoItems([project]); //returns a list
        if (projectsToSync.length > 0) {
          this.syncService.prepareAndSync('updateTestProj', projectsToSync);
        }
      }
      this.store.dispatch(new SuitesAction.Project.Update([project]));
      return project;
    });
  }

  async deleteTestproject(id: string, owner: string) {
    if (owner && this.authUser?.UID !== owner) {
      throw new Error('You can\'t delete this Project as you are not the owner.');
    }
    let data = await iDB.delete(iDB.TABLES.TEST_PROJECTS, id); //data doesnt contain deleted ids
    if (this.authUser?.UID) {
      this.syncService.prepareAndSync('deleteTestProj', [id]);
    }
    this.store.dispatch(new SuitesAction.Project.Delete([id]));
    return data;
  }

  async loadTestSuites() {
    const suites = await iDB.read(iDB.TABLES.TEST_SUITES);
    this.store.dispatch(new SuitesAction.Suites.Refresh(suites));
    return suites;
  }
  async createTestSuite(suite: Suite, addWithSuffix?: boolean): Promise<Suite> {
    if (suite.projId?.includes('demo')) {
      throw new Error('Suites can\'t be added to a demo project');
    }
    let suites = await this.store.select(SuitesStateSelector.getSuitesPartial).pipe(first()).toPromise();
    if (addWithSuffix) {
      let duplicate = false
      do {
        duplicate = suites.some(s => s.name.toLocaleLowerCase() == suite.name.toLocaleLowerCase() && s.projId === suite.projId)
        if (duplicate) {
          suite.name += ` ${apic.s4()}`
        }
      } while (duplicate);
    } else if (suites.find(s => s.name.toLowerCase() === suite.name.toLowerCase() && s.projId === suite.projId)) {
      throw new Error('A suite with the same name already exists.')
    }
    var time = new Date().getTime();
    suite._id = time + '-' + apic.s12();
    suite._created = time;
    suite._modified = time;
    if (this.authUser?.UID) {
      suite.owner = this.authUser.UID;
    } else {
      delete suite.owner;
    }

    let data = await iDB.insert(iDB.TABLES.TEST_SUITES, suite);
    if (this.authUser?.UID) {//added successfully
      this.syncService.prepareAndSync('addTestSuit', [suite]);
    }
    this.store.dispatch(new SuitesAction.Suites.Add([suite]));
    return suite;
  }
  async updateSuite(suite: Suite): Promise<Suite> {
    let allSuites = await this.store.select(SuitesStateSelector.getSuitesPartial).pipe(first()).toPromise();
    if (allSuites.find(s => s.name.toLowerCase() === suite.name.toLowerCase() && s.projId === suite.projId && s._id != suite._id)) {
      throw new Error('A suite with the same name already exists.')
    }

    suite._modified = Date.now();
    return iDB.upsert(iDB.TABLES.TEST_SUITES, suite).then((updatedIds) => {
      if (updatedIds && this.authUser?.UID) {
        var suitesToSync = apic.removeDemoItems(suite); //returns a list
        if (suitesToSync.length > 0) {
          this.syncService.prepareAndSync('updateTestSuit', suitesToSync);
        }
      }
      this.store.dispatch(new SuitesAction.Suites.Update([suite]));
      return suite;
    });
  }

  async deleteSuite(id: string, owner: string) {
    if (owner && this.authUser?.UID !== owner) {
      throw new Error('You can\'t delete this suite as you are not the owner.');
    }
    let data = await iDB.delete(iDB.TABLES.TEST_SUITES, id); //data doesnt contain deleted ids
    if (this.authUser?.UID) {
      this.syncService.prepareAndSync('deleteTestSuit', [id]);
    }
    this.store.dispatch(new SuitesAction.Suites.Delete([id]));
    return data;
  }

  //Update the projects & suites when received via sync message
  async updateSyncedProject(projects: TestProject[]) {
    let updatedIds = await iDB.upsertMany(iDB.TABLES.TEST_PROJECTS, projects);
    this.store.dispatch(new SuitesAction.Project.Update(projects));
    return updatedIds;
  }
  async deleteSyncedProjects(ids: string[]) {
    await iDB.deleteMany(iDB.TABLES.TEST_PROJECTS, ids);
    this.store.dispatch(new SuitesAction.Project.Delete(ids));
    return ids;
  }

  async updateSyncedSuites(suites: Suite[]) {
    let updatedIds = await iDB.upsertMany(iDB.TABLES.TEST_SUITES, suites);
    this.updatedViaSync$.next({ type: 'update', ids: updatedIds as string[] });
    this.store.dispatch(new SuitesAction.Suites.Update(suites));
    return updatedIds;
  }
  async deleteSyncedSuites(ids: string[]) {
    await iDB.deleteMany(iDB.TABLES.TEST_SUITES, ids);
    this.updatedViaSync$.next({ type: 'delete', ids });
    this.store.dispatch(new SuitesAction.Suites.Delete(ids));
    return ids;
  }

  async onSyncMessage(message: StompMessage) {
    if (!message?.action) return;

    if (message.type == 'TestCaseProjects' || message.type === 'Fetch:TestCaseProjects') {
      if ((message.testCaseProjects?.length > 0)) {
        if (message.action === 'update' || message.action === 'add') {
          let testCaseProjects = await this.updateSyncedProject(message.testCaseProjects);
          console.info('Sync: added/updated testCaseProjects', testCaseProjects)
        }
      } else if (message.idList?.length > 0 && message.action === 'delete') {
        const resp = await this.deleteSyncedProjects(message.idList);
        console.info('Sync: deleted testCaseProjects', resp)
      }

      if (message.nonExistant?.testCaseProjects?.length > 0) {
        const resp = await this.deleteSyncedProjects(message.nonExistant?.testCaseProjects);
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
        const resp = await this.deleteSyncedSuites(message.idList);
        console.info('Sync: deleted testSuits', resp)
      }

      if (message.nonExistant?.testSuits?.length > 0) {
        const resp = await this.deleteSyncedSuites(message.nonExistant?.testSuits);
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
    return this.updateSuite(suiteToUpdate);
  }

  removeReqFromSuit(suite: Suite, reqId: string, index: number) {
    if (suite.reqs[index]?._id === reqId) {
      let suiteToUpdate: Suite = { ...suite, reqs: [...suite.reqs] }
      suiteToUpdate.reqs.splice(index, 1);
      return this.updateSuite(suiteToUpdate);
    }
  }

  async loadWau(id: string) {
    let response: any = await this.httpClient.get(ApicUrls.webAccess + id).toPromise();
    return response.resp.url;
  }

  initAddReq(suite: Suite, index: number) {
    this._initAddReq.next([suite, index]);
  }

  initDevtoolsImport(suiteId: string, harReqs: any) {
    this._initDevtoolsImport.next({ suiteId, harReqs });
  }

  async validateProjectImportData(importData): Promise<boolean> {
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
    return await this.sandboxService.validateSchema(schema, importData);
  }

  async validateSuiteImportData(importData): Promise<boolean> {
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
    return await this.sandboxService.validateSchema(schema, importData);
  }
}
