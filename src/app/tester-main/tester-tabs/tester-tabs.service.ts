import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TesterTab {
  action: 'add' | 'remove'
  id: string,
  type: 'req' | 'socket' | 'ws' | 'suite',
  name: string
}

@Injectable({
  providedIn: 'root'
})
export class TesterTabsService {
  tabsChange = new BehaviorSubject<TesterTab>(null);
  constructor() { }


  addTab(tab: TesterTab) {
    this.tabsChange.next(tab);
  }
}
