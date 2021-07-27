import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import Ajv from 'ajv';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { RequestsAction } from '../actions/requests.action';
import { ReqFolder } from '../models/ReqFolder.model';
import { ApiRequest } from '../models/Request.model';
import { StompMessage } from '../models/StompMessage.model';
import { SyncModifiedNotification } from '../models/SyncModifiedNotification';
import { User } from '../models/User.model';
import { RequestsStateSelector } from '../state/requests.selector';
import { UserState } from '../state/user.state';
import apic from '../utils/apic';
import { SAVED_SETTINGS } from '../utils/constants';
import iDB from './IndexedDB';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class RequestsService {
  authUser: User;
  ajv = null;

  updatedViaSync$: BehaviorSubject<SyncModifiedNotification> = new BehaviorSubject(null);;

  constructor(private store: Store, private syncService: SyncService) {
    this.store.select(UserState.getAuthUser).subscribe(user => {
      this.authUser = user;
    });
    this.syncService.onRequestsMessage$.subscribe(async message => {
      this.onSyncMessage(message);
    })
    this.ajv = new Ajv();
  }

  async loadRequests() {
    const reqs = await iDB.read(iDB.TABLES.SAVED_REQUESTS);
    this.store.dispatch(new RequestsAction.Req.Refresh(reqs));
    return reqs;
  }
  async loadFolders() {
    const folders = await iDB.read(iDB.TABLES.FOLDERS);
    this.store.dispatch(new RequestsAction.Folder.Refresh(folders));
    return folders;
  }

  async createFolder(folder: ReqFolder, addWithSuffix = false): Promise<ReqFolder> {
    var time = new Date().getTime();
    if (this.authUser?.UID) {
      folder.owner = this.authUser.UID;
    } else {
      delete folder.owner;
    }
    folder._id = time + '-' + apic.s12();
    folder._created = time;
    folder._modified = time;

    //owner detail has to be set first before this check
    let allFolders = await this.store.select(RequestsStateSelector.getFoldersPartial).pipe(first()).toPromise();
    if (addWithSuffix) {
      let duplicate = false
      do {
        duplicate = allFolders.some(p => p.name.toLocaleLowerCase() == folder.name.toLocaleLowerCase() && p.owner === folder.owner && p.parentId == folder.parentId)
        if (duplicate) {
          folder.name += ` ${apic.s4()}`
        }
      } while (duplicate);
    } else if (allFolders.find(p => p.name.toLowerCase() === folder.name.toLowerCase() && p.owner === folder.owner && p.parentId == folder.parentId)) {
      throw new Error('A folder with the same name already exists.')
    }

    return iDB.insert(iDB.TABLES.FOLDERS, folder).then((data) => {
      if (this.authUser?.UID) {//added successfully
        this.syncService.prepareAndSync('addFolder', [folder]);
      }
      this.store.dispatch(new RequestsAction.Folder.Add([folder]));
      return folder;
    });
  }


  async updateFolder(folder: ReqFolder): Promise<ReqFolder> {
    let allFolders = await this.store.select(RequestsStateSelector.getFoldersPartial).pipe(first()).toPromise();
    if (allFolders.find(p => p.name.toLowerCase() === folder.name.toLowerCase() && p._id != folder._id && p.parentId == folder.parentId && p.owner === folder.owner)) {
      throw new Error('A Folder with the same name already exists.')
    }

    folder._modified = Date.now();
    return iDB.upsert(iDB.TABLES.FOLDERS, folder).then((updatedIds) => {
      if (updatedIds && this.authUser?.UID) {
        var foldersToSync = apic.removeDemoItems([folder]); //returns a list
        if (foldersToSync.length > 0) {
          this.syncService.prepareAndSync('updateFolder', foldersToSync);
        }
      }
      this.store.dispatch(new RequestsAction.Folder.Update([folder]));
      return folder;
    });
  }

  async deleteFolders(ids: string[], owner: string) {
    //get folder owner, if folder owner also matches allow delete
    if (owner && this.authUser?.UID !== owner) {
      throw new Error('You can\'t delete this folder as you are not the owner.');
    }
    return iDB.deleteMany(iDB.TABLES.FOLDERS, ids).then((data) => { //data doesnt contain deleted ids
      if (this.authUser?.UID) {
        this.syncService.prepareAndSync('deleteFolder', ids);
      }
      this.store.dispatch(new RequestsAction.Folder.Delete(ids));
      return data;
    });
  }

  async createRequest(req: ApiRequest, addWithSuffix = false): Promise<ApiRequest> {
    var time = new Date().getTime();
    if (this.authUser?.UID) {
      req.owner = this.authUser.UID;
    } else {
      delete req.owner;
    }
    req._id = time + '-' + apic.s12();
    req._created = time;
    req._modified = time;

    //owner detail has to be set first before this check
    let allFolders = await this.store.select(RequestsStateSelector.getReqsPartial).pipe(first()).toPromise();
    if (addWithSuffix) {
      let duplicate = false
      do {
        duplicate = allFolders.some(p => p.name.toLocaleLowerCase() == req.name.toLocaleLowerCase() && p.owner === req.owner && p._parent == req._parent)
        if (duplicate) {
          req.name += ` ${apic.s4()}`
        }
      } while (duplicate);
    } else if (allFolders.find(p => p.name.toLowerCase() === req.name.toLowerCase() && p.owner === req.owner && p._parent == req._parent)) {
      throw new Error('A request with the same name already exists in the folder.')
    }

    return iDB.insert(iDB.TABLES.SAVED_REQUESTS, req).then((data) => {
      if (this.authUser?.UID) {//added successfully
        this.syncService.prepareAndSync('addAPIReq', [req]);
      }
      this.store.dispatch(new RequestsAction.Req.Add([req]));
      return req;
    });
  }

  async updateRequest(req: ApiRequest): Promise<ApiRequest> {
    let allReqs = await this.store.select(RequestsStateSelector.getReqsPartial).pipe(first()).toPromise();
    if (allReqs.find(s => s.name.toLowerCase() === req.name.toLowerCase() && s._parent === req._parent && s._id != req._id)) {
      throw new Error('A request with the same name already exists.')
    }

    req._modified = Date.now();
    return iDB.upsert(iDB.TABLES.SAVED_REQUESTS, req).then((updatedIds) => {
      if (updatedIds && this.authUser?.UID) {
        var toSync = apic.removeDemoItems([req]); //returns a list
        if (toSync.length > 0) {
          this.syncService.prepareAndSync('updateAPIReq', toSync);
        }
      }
      this.store.dispatch(new RequestsAction.Req.Update([req]));
      return req;
    });
  }

  async deleteRequests(ids: string[], owner: string) {
    //get folder owner, if folder owner also matches allow delete
    if (owner && this.authUser?.UID !== owner) {
      throw new Error('You can\'t delete this request as you are not the owner.');
    }
    return iDB.deleteMany(iDB.TABLES.SAVED_REQUESTS, ids).then((data) => { //data doesnt contain deleted ids
      if (this.authUser?.UID) {
        this.syncService.prepareAndSync('deleteAPIReq', ids);
      }
      this.store.dispatch(new RequestsAction.Req.Delete(ids));
      return ids;
    });
  }

  //Update the projects & suites when received via sync message
  async updateSyncedFolders(folders: ReqFolder[]) {
    let updatedIds = await iDB.upsertMany(iDB.TABLES.FOLDERS, folders);
    this.store.dispatch(new RequestsAction.Folder.Update(folders));
    return updatedIds;
  }
  async deleteSyncedProjects(ids: string[]) {
    await iDB.deleteMany(iDB.TABLES.FOLDERS, ids);
    this.store.dispatch(new RequestsAction.Folder.Delete(ids));
    return ids;
  }
  async updateSyncedReqs(reqs: ApiRequest[]) {
    let updatedIds = await iDB.upsertMany(iDB.TABLES.SAVED_REQUESTS, reqs);
    this.updatedViaSync$.next({ type: 'update', ids: updatedIds as string[] });
    this.store.dispatch(new RequestsAction.Req.Update(reqs));
    return updatedIds;
  }
  async deleteSyncedReqs(ids: string[]) {
    await iDB.deleteMany(iDB.TABLES.SAVED_REQUESTS, ids);
    this.updatedViaSync$.next({ type: 'delete', ids });
    this.store.dispatch(new RequestsAction.Req.Delete(ids));
    return ids;
  }
  async onSyncMessage(message: StompMessage) {
    if (!message?.action) return;

    if (message.type == 'Folders' || message.type === 'Fetch:Folders') {
      if ((message.folders?.length > 0)) {
        if (message.action === 'update' || message.action === 'add') {
          let folders = await this.updateSyncedFolders(message.folders);
          console.info('Sync: added/updated folders', folders)
        }
      } else if (message.idList?.length > 0 && message.action === 'delete') {
        const resp = await this.deleteSyncedProjects(message.idList);
        console.info('Sync: deleted folder', resp)
      }

      if (message.nonExistant?.folders?.length > 0) {
        const resp = await this.deleteSyncedProjects(message.nonExistant?.folders);
        console.info('Sync: deleted folders', resp)
      }

      if (message.originalComand?.includes('Fetch:Folders')) {
        iDB.upsert(iDB.TABLES.SETTINGS, {
          _id: 'lastSyncedReqFolders',
          time: Date.now()
        });
      }
    } else if (message.type == 'APIRequests' || message.type == 'Fetch:ApiRequests') {
      if ((message.apiRequests?.length > 0)) {
        if (message.action === 'update' || message.action === 'add') {
          let reqs = await this.updateSyncedReqs(message.apiRequests);
          console.info('Sync: added/updated request', reqs)
        }
      } else if (message.idList?.length > 0 && message.action === 'delete') {
        const resp = await this.deleteSyncedReqs(message.idList);
        console.info('Sync: deleted request', resp)
      }

      if (message.nonExistant?.apiRequests?.length > 0) {
        const resp = await this.deleteSyncedReqs(message.nonExistant?.apiRequests);
        console.info('Sync: deleted request', resp)
      }

      if (message.originalComand?.includes('Fetch:ApiRequests')) {
        iDB.upsert(iDB.TABLES.SETTINGS, {
          _id: 'lastSyncedApiRequests',
          time: Date.now()
        });
      }
    }
  }

  //sync any folders those were created before the user even logged in
  async syncFolders(hardSync: boolean = false) {
    let folders: ReqFolder[] = await iDB.read(iDB.TABLES.FOLDERS);
    folders = apic.removeDemoItems(folders);

    //sync folders created before login
    const foldersBeforeLogin = folders.filter(p => !p.owner);
    if (foldersBeforeLogin.length > 0) {
      this.syncService.execute('syncPreLoginData', { folders: foldersBeforeLogin })
    }

    //sync any folders we may not have in local and any which is in local and deleted in server
    var localFoldersToSyncWithServer = folders.filter(p => p.owner);

    if (hardSync) {
      this.syncService.fetch('Fetch:Folders');
    } else {
      var lastSyncedTime = await iDB.findById(iDB.TABLES.SETTINGS, SAVED_SETTINGS.LAST_SYNCED.API_REQUEST_FOLDERS);
      this.syncService.fetch('Fetch:Folders', lastSyncedTime?.time, { folders: localFoldersToSyncWithServer.map(p => { return { _id: p._id, _modified: p._modified }; }) })
    }
  }

  //sync any folders those were created before the user even logged in
  async syncReqs(hardSync: boolean = false) {
    let reqs: ApiRequest[] = await iDB.read(iDB.TABLES.SAVED_REQUESTS);
    reqs = apic.removeDemoItems(reqs);

    //sync folders created before login
    const reqsBeforeLogin = reqs.filter(p => !p.owner);
    if (reqsBeforeLogin.length > 0) {
      this.syncService.execute('syncPreLoginData', { apiRequests: reqsBeforeLogin })
    }

    //sync any folders we may not have in local and any which is in local and deleted in server
    var localReqsToSyncWithServer = reqs.filter(p => p.owner);

    if (hardSync) {
      this.syncService.fetch('Fetch:ApiRequests');
    } else {
      var lastSyncedTime = await iDB.findById(iDB.TABLES.SETTINGS, SAVED_SETTINGS.LAST_SYNCED.API_REQUESTS);
      this.syncService.fetch('Fetch:ApiRequests', lastSyncedTime?.time, { apiRequests: localReqsToSyncWithServer.map(p => { return { _id: p._id, _modified: p._modified }; }) })
    }
  }

  validateImportData(importData): boolean {
    const schema = {
      "type": "object",
      "properties": {
        "TYPE": {
          "type": "string",
          "enum": ["Folder"]
        },
        "value": {
          "type": "object",
          "properties": {},
          "required": []
        }
      },
      "required": ["TYPE", "value"]
    }
    const validate = this.ajv.compile(schema);
    const valid = validate(importData);
    if (!valid) console.error(validate.errors);
    return valid;
  }

  async clearFolders() {
    return await Promise.all([
      iDB.clear(iDB.TABLES.FOLDERS),
      iDB.delete(iDB.TABLES.SETTINGS, SAVED_SETTINGS.LAST_SYNCED.API_REQUEST_FOLDERS)
    ]);
  }

  async clearRequests() {
    return await Promise.all([
      iDB.clear(iDB.TABLES.SAVED_REQUESTS),
      iDB.delete(iDB.TABLES.SETTINGS, SAVED_SETTINGS.LAST_SYNCED.API_REQUESTS)
    ]);
  }
}
