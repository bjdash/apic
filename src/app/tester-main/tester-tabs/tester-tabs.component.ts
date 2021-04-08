import { Component, OnInit } from '@angular/core';
import apic from 'src/app/utils/apic';
import { TesterTab, TesterTabsService } from './tester-tabs.service';

@Component({
  selector: 'app-tester-tabs',
  templateUrl: './tester-tabs.component.html',
  styleUrls: ['./tester-tabs.component.scss']
})
export class TesterTabsComponent implements OnInit {
  tabs: TesterTab[] = [];
  overFlowtabsCount = 0;
  selectedTabIndex = 0;
  constructor(private tabsService: TesterTabsService) { }

  ngOnInit(): void {
    //TODO: Find better approach
    this.overFlowtabsCount = Math.floor((window.innerWidth - 416) / 170);

    this.tabsService.tabsChange.subscribe(tab => {
      console.log(tab)
      if (!tab) return;
      if (tab.action === 'add' && !this.tabs.find(t => t.id === tab.id)) {
        this.tabs.push(tab);
        setTimeout(() => {
          this.selectedTabIndex = this.tabs.length - 1;
        }, 0);
      }
    })
  }
  addReqTab() {
    this.tabsService.addTab({ action: 'add', id: 'new_tab' + apic.s8(), name: 'New tab', type: 'req' })
  }
  addWsTab() {
    this.tabsService.addTab({ action: 'add', id: 'new_tab' + apic.s8(), name: 'New tab', type: 'ws' })
  }
  closeTab(index: number, event) {
    event.preventDefault();
    event.stopPropagation();
    this.tabs.splice(index, 1);
  }

  trackbyFn(index, item: TesterTab) {
    return item.id;
  }
}
