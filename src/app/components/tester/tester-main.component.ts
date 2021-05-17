import { Component, OnInit } from '@angular/core';
import apic from 'src/app/utils/apic';
import { TesterTabsService } from './tester-tabs/tester-tabs.service';

@Component({
  selector: 'apic-tester-main',
  templateUrl: './tester-main.component.html',
  styleUrls: ['./tester-main.component.scss'],
})
export class TesterMainComponent implements OnInit {

  constructor(private tabsService: TesterTabsService) { }

  ngOnInit(): void {
    setTimeout(() => {
      this.tabsService.addTab({ action: 'add', id: 'new_tab:' + apic.s8(), name: 'New tab', type: 'req' })
    }, 0);
  }
}
