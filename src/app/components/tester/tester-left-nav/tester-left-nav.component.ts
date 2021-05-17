import { Component, OnInit } from '@angular/core';
import LocalStore from 'src/app/services/localStore';

@Component({
  selector: 'app-tester-left-nav',
  templateUrl: './tester-left-nav.component.html',
  styleUrls: ['./tester-left-nav.component.css']
})
export class TesterLeftNavComponent implements OnInit {
  selectedTab = 1;
  constructor() {
    let lasttab = LocalStore.get(LocalStore.TESTER_LEFT_NAV_TAB);
    if (lasttab) this.selectedTab = parseInt(lasttab);
  }

  ngOnInit(): void {
  }

  saveSelectedTab(index) {
    LocalStore.set(LocalStore.TESTER_LEFT_NAV_TAB, index);
  }

}
