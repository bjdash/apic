import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiRequest } from 'src/app/models/Request.model';
import { Toaster } from 'src/app/services/toaster.service';
import apic from 'src/app/utils/apic';

export interface TesterTab {
  action: 'add' | 'remove' | 'update'
  id: string,
  originalId?: string,
  newId?: string,
  type?: 'req' | 'socket' | 'ws' | 'suite',
  name?: string,
  data?: any,
  projId?: string
}

@Injectable({
  providedIn: 'root'
})
export class TesterTabsService {
  tabsChange = new BehaviorSubject<TesterTab>(null);
  selectedTabChange = new BehaviorSubject<string>(null);
  constructor(private toaster: Toaster) { }

  addReqTab(id: string, name: string) {
    this.tabsChange.next({ action: 'add', id, type: 'req', name });
  }
  addSocketTab(id: string, name: string) {
    this.tabsChange.next({ action: 'add', id, type: 'ws', name });
  }
  addEndpointReqTab(request: ApiRequest, projId) {
    let tab: TesterTab = {
      action: 'add', type: 'req', name: request.name, data: request, id: request._id, projId
    };
    this.tabsChange.next(tab);
  }

  addSuiteTab(id: string, name: string, reqToOpen?: string) {
    this.tabsChange.next({ action: 'add', id, type: 'suite', name, data: { reqToOpen } });
  }

  addTab(tab: TesterTab) {
    if (!tab?.id) {
      this.toaster.error('Failed to open tab. Missing tab id.')
    }
    this.tabsChange.next(tab);
  }

  updateTab(id: string, newId: string, name: string) {
    this.tabsChange.next({ action: 'update', id, name, newId });
  }

  removeTab(id: string) {
    this.tabsChange.next({ action: 'remove', id });
  }
}
