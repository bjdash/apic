import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import Ajv from 'ajv';
import { RequestsAction } from '../actions/requests.action';
import { ReqFolder } from '../models/ReqFolder.model';
import { ApiRequest } from '../models/Request.model';
import { StompMessage } from '../models/StompMessage.model';
import { User } from '../models/User.model';
import { UserState } from '../state/user.state';
import apic from '../utils/apic';
import iDB from './IndexedDB';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root'
})
export class RequestsService {
  authUser: User;
  ajv = null;

  constructor(private store: Store, private syncService: SyncService) {
    this.store.select(UserState.getAuthUser).subscribe(user => {
      this.authUser = user;
    });
    this.syncService.onRequestsMessage$.subscribe(async message => {
      this.onSyncMessage(message);
    })
    this.ajv = new Ajv();
  }

  async getRequests() {
    const reqs = await iDB.read(iDB.TABLES.SAVED_REQUESTS);
    this.store.dispatch(new RequestsAction.Req.Refresh(reqs));
    return reqs;
  }
  async getFolders() {
    const folders = await iDB.read(iDB.TABLES.FOLDERS);
    this.store.dispatch(new RequestsAction.Folder.Refresh(folders));
    return folders;
  }

  createFolders(folders: ReqFolder[], fromSync?: boolean) {
    if (!fromSync) {
      var time = new Date().getTime();
      folders.forEach(folder => {
        if (this.authUser?.UID) {
          folder.owner = this.authUser.UID;
        } else {
          delete folder.owner;
        }
        if (!folder._id) {//TODO: fix this
          folder._id = folder._id ? folder._id : time + '-' + apic.s12();
        }
        folder._created = folder._created ? folder._created : time;
        folder._modified = folder._modified ? folder._modified : time;
      })
    }
    return iDB.insertMany(iDB.TABLES.FOLDERS, folders).then((data) => {
      if (!fromSync && this.authUser?.UID) {//added successfully
        this.syncService.prepareAndSync('addFolder', folders);
      }
      this.store.dispatch(new RequestsAction.Folder.Add(folders));
      return folders;
    });
  }

  updateFolders(folders: ReqFolder[], fromSync?: boolean) {
    if (!fromSync) {
      folders.forEach(f => f._modified = Date.now());
    }
    return iDB.upsertMany(iDB.TABLES.FOLDERS, folders).then((updatedIds) => {
      if (updatedIds && !fromSync && this.authUser?.UID) {
        var foldersToSync = apic.removeDemoItems(folders); //returns a list
        if (foldersToSync.length > 0) {
          this.syncService.prepareAndSync('updateFolder', foldersToSync);
        }
      }
      this.store.dispatch(new RequestsAction.Folder.Update(folders));
      return updatedIds;
    });
  }

  async deleteFolders(ids: string[], fromSync?: boolean) {
    return iDB.deleteMany(iDB.TABLES.FOLDERS, ids).then((data) => { //data doesnt contain deleted ids
      if (!fromSync && this.authUser?.UID) {
        this.syncService.prepareAndSync('deleteFolder', ids);
      }
      this.store.dispatch(new RequestsAction.Folder.Delete(ids));
      return data;
    });
  }

  createRequests(reqs: ApiRequest[], fromSync?: boolean) {
    if (!fromSync) {
      var time = new Date().getTime();
      reqs.forEach(req => {
        if (this.authUser?.UID) {
          req.owner = this.authUser.UID;
        } else {
          delete req.owner;
        }
        req._id = time + '-' + apic.s12();
        req._created = time;
        req._modified = time;
      })
    }
    return iDB.insertMany(iDB.TABLES.SAVED_REQUESTS, reqs).then((data) => {
      if (!fromSync) {//added successfully
        this.syncService.prepareAndSync('addAPIReq', reqs);
      }
      this.store.dispatch(new RequestsAction.Req.Add(reqs));
      return reqs;
    });
  }

  updateRequests(reqs: ApiRequest[], fromSync?: boolean) {
    if (!fromSync) {
      reqs.forEach(r => {
        r._modified = Date.now();
        if (this.authUser?.UID) {
          r.owner = this.authUser.UID;
        } else {
          delete r.owner;
        }
      });
    }
    return iDB.upsertMany(iDB.TABLES.SAVED_REQUESTS, reqs).then((updatedIds) => {
      if (updatedIds && !fromSync && this.authUser?.UID) {
        var toSync = apic.removeDemoItems(reqs); //returns a list
        if (toSync.length > 0) {
          this.syncService.prepareAndSync('updateAPIReq', toSync);
        }
      }
      this.store.dispatch(new RequestsAction.Req.Update(reqs));
      return reqs;
    });
  }

  async deleteRequests(ids: string[], fromSync?: boolean) {
    return iDB.deleteMany(iDB.TABLES.SAVED_REQUESTS, ids).then((data) => { //data doesnt contain deleted ids
      if (!fromSync && this.authUser?.UID) {
        this.syncService.prepareAndSync('deleteAPIReq', ids);
      }
      this.store.dispatch(new RequestsAction.Req.Delete(ids));
      return ids;
    });
  }

  async onSyncMessage(message: StompMessage) {
    if (!message?.action) return;

    if (message.type == 'Folders' || message.type === 'Fetch:Folders') {
      if ((message.folders?.length > 0)) {
        if (message.action === 'update' || message.action === 'add') {
          let folders = await this.updateFolders(message.folders, true);
          console.info('Sync: added/updated folders', folders)
        }
      } else if (message.idList?.length > 0 && message.action === 'delete') {
        const resp = await this.deleteFolders(message.idList, true);
        console.info('Sync: deleted folder', resp)
      }

      if (message.nonExistant?.folders?.length > 0) {
        const resp = await this.deleteFolders(message.nonExistant?.folders, true);
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
          let reqs = await this.updateRequests(message.apiRequests, true);
          console.info('Sync: added/updated request', reqs)
        }
      } else if (message.idList?.length > 0 && message.action === 'delete') {
        const resp = await this.deleteRequests(message.idList, true);
        console.info('Sync: deleted request', resp)
      }

      if (message.nonExistant?.apiRequests?.length > 0) {
        const resp = await this.deleteRequests(message.nonExistant?.apiRequests, true);
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
      var lastSyncedTime = await iDB.findById(iDB.TABLES.SETTINGS, 'lastSyncedReqFolders');
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
      var lastSyncedTime = await iDB.findById(iDB.TABLES.SETTINGS, 'lastSyncedApiRequests');
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
}
