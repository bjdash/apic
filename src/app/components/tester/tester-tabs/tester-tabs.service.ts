import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import apic from 'src/app/utils/apic';

export interface TesterTab {
  action: 'add' | 'remove' | 'update'
  id: string,
  originalId?: string,
  newId?: string,
  type?: 'req' | 'socket' | 'ws' | 'suite',
  name: string
}

@Injectable({
  providedIn: 'root'
})
export class TesterTabsService {
  tabsChange = new BehaviorSubject<TesterTab>(null);
  selectedTabChange = new BehaviorSubject<string>(null);
  constructor() { }

  addReqTab(id: string, name: string) {
    this.tabsChange.next({ action: 'add', id, type: 'req', name });
  }

  addTab(tab: TesterTab) {
    tab.id = 'new_tab:' + apic.s8()
    this.tabsChange.next(tab);
  }

  updateTab(id: string, newId: string, name: string) {
    this.tabsChange.next({ action: 'update', id, name, newId });
  }
}
