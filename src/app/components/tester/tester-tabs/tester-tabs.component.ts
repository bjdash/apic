import { Component, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import apic from 'src/app/utils/apic';
import { TesterTabInterface } from './tester-tabs.interface';
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
  contextMenuPosition = { x: '0px', y: '0px' };
  @ViewChild(MatMenuTrigger) contextMenu: MatMenuTrigger;
  @ViewChildren("tabRefs") private tabRefs: QueryList<TesterTabInterface>;

  constructor(private tabsService: TesterTabsService) { }

  ngOnInit(): void {
    //TODO: Find better approach
    this.overFlowtabsCount = Math.floor((window.innerWidth - 416) / 170);

    this.tabsService.tabsChange.subscribe(tab => {
      if (!tab) return;
      if (tab.action === 'add') {
        let indexIfExist = this.tabs.findIndex(t => t.id === tab.id);
        if (indexIfExist < 0) {
          tab.originalId = tab.id;
          this.tabs.push(tab);
          setTimeout(() => {
            this.selectedTabIndex = this.tabs.length - 1;
          }, 0);
        } else {
          this.selectedTabIndex = indexIfExist
        }
      } else if (tab.action === 'update') {
        let indexIfExist = this.tabs.findIndex(t => t.id === tab.id);
        if (indexIfExist >= 0) {
          this.tabs[indexIfExist] = { ...this.tabs[indexIfExist], name: tab.name, id: tab.newId };
          if (indexIfExist === this.selectedTabIndex) {
            this.tabsService.selectedTabChange.next(tab.newId);
          }
        }
      } else if (tab.action === 'remove') {
        let indexIfExist = this.tabs.findIndex(t => t.id === tab.id);
        if (indexIfExist >= 0) {
          this.tabs.splice(indexIfExist, 1);
        }
      }
    })
    window.onresize = () => {
      this.overFlowtabsCount = Math.floor((window.innerWidth - 416) / 170);
    }

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
  selectedIndexChange(index) {
    this.selectedTabIndex = index;
    this.tabsService.selectedTabChange.next(this.tabs[index].id)
  }
  trackbyFn(index, item: TesterTab) {
    return item.originalId;
  }

  onContextMenu(event: MouseEvent, item: TesterTab) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { 'item': item };
    this.contextMenu.openMenu();
  }

  duplicateTab(item: TesterTab) {
    let value = this.tabRefs.find(tab => tab.requestId === item.id).getReqFromForm();
    let tab: TesterTab = {
      action: 'add', type: item.type, name: 'New tab', data: value, id: 'new_tab:' + apic.s8()
    };
    this.tabsService.addTab(tab);
  }

  closeAllButThis(item: TesterTab) {
    this.tabs = this.tabs.filter(tab => tab.id === item.id)
  }

  closeAllRight(item: TesterTab) {
    let currIndex = this.tabs.findIndex(tab => tab.id == item.id);
    this.tabs = this.tabs.filter((tab, index) => index <= currIndex)
  }
}
