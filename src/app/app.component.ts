import { AuthService } from './services/auth.service';
import { Component, NgZone } from '@angular/core';
import { AppBootstrap } from './utils/appBootstrap';
//TODO: See if this can be converted to ecma script modules to supress *CommonJS or AMD dependencies can cause optimization bailouts*
import 'brace/mode/json';
import 'brace/mode/yaml';
import 'brace/mode/xml';
import 'brace/mode/javascript';
import 'brace/ext/searchbox';
import 'brace/theme/monokai';
import 'brace/ext/language_tools';
import './utils/mode-graphql'

import LocalStore from './services/localStore';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { SuitesStateSelector } from './state/suites.selector';
import { first } from 'rxjs/operators';
import { Toaster } from './services/toaster.service';
import { TesterTabsService } from './components/tester/tester-tabs/tester-tabs.service';
import { SuiteService } from './services/suite.service';
import { environment } from 'src/environments/environment';
import { IntroComponent } from './components/intro/intro.component';
import { MatDialog } from '@angular/material/dialog';
import ExtentionHelper from './services/extention.helper';

declare global {
  interface Window {
    chrome: any;
  }
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  platform = environment.PLATFORM;

  constructor(
    private bootstrap: AppBootstrap,
    private authService: AuthService,
    private router: Router,
    private store: Store,
    private toaster: Toaster,
    private suiteService: SuiteService,
    private dialog: MatDialog,
    public zone: NgZone,
    private testerTabsService: TesterTabsService) {
    this.init();
    //TODO:after some time fetch user details from server and update local, this is to reflect change in name in other device
  }

  //TODO: refactor each create type to use a parital object with minimum field. Eg: Folders should only take name, desc & parent
  //TODO: Performance - keep server down and let the connect fail for few times in client. Start server. Notice multiple listeners

  async init() {
    this.authService.initLoggedinUser();
    await this.bootstrap.init();
    if (!LocalStore.get(LocalStore.INTRO_SHOWN)) {
      this.dialog.open(IntroComponent,
        {
          disableClose: true,
          width: '100vw',
          height: '100vh', maxWidth: '100vw'
        });
      LocalStore.set(LocalStore.INTRO_SHOWN, true)
    }

    //connect to extention service worker
    if(environment.PLATFORM === 'CHROME'){
        ExtentionHelper.connect();
    }

    //for receiving messages from APIC dev tools
    try {
      if (window.chrome && window.chrome.runtime && window.chrome.runtime.onMessage) {
        window.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          console.log(message, sender);
          this.zone.run(() => {
            this.router.navigate(['tester']);
            setTimeout(async () => {
              let suites = await this.store.select(SuitesStateSelector.getSuites).pipe(first()).toPromise();
              var selectedSuit = suites.find(
                (suit) => suit._id === message.suite
              );
              if (!selectedSuit) {
                this.toaster.error('Selected suite not found.');
                return
              }
              this.testerTabsService.addSuiteTab(selectedSuit._id, selectedSuit.name);
              setTimeout(() => {
                this.suiteService.initDevtoolsImport(selectedSuit._id, message.requests);
                sendResponse({ status: "ok" });
              }, 0);
            }, 0);

          })
        });
      }
    } catch (e) {
      this.toaster.error('Failed to import requests from devtools.')
    }
  }
}
