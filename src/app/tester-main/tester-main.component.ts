import { Component, OnInit } from '@angular/core';
import apic from '../utils/apic';
import { TesterTabsService } from './tester-tabs/tester-tabs.service';

@Component({
  selector: 'apic-tester-main',
  templateUrl: './tester-main.component.html',
  styleUrls: ['./tester-main.component.scss'],
  providers: [TesterTabsService]
})
export class TesterMainComponent implements OnInit {

  constructor(private tabsService: TesterTabsService) { }

  ngOnInit(): void {
    setTimeout(() => {
      this.tabsService.addTab({ action: 'add', id: 'new_tab' + apic.s8(), name: 'New tab', type: 'req' })

    }, 0);
  }

}
