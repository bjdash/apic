import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import Ajv from 'ajv';
import { StompMessage } from '../models/StompMessage.model';
import { User } from '../models/User.model';
import { UserState } from '../state/user.state';
import { SyncService } from './sync.service';
import iDB from './IndexedDB';
import { SAVED_SETTINGS } from '../utils/constants';

@Injectable({
  providedIn: 'root'
})
export class SuiteService {
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

  async getTestProjects() {

  }

  async getTestSuites() {

  }

  async onSyncMessage(message: StompMessage) {

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
}
