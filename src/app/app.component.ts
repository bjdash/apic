import { AuthService } from './services/auth.service';
import { EnvService } from './services/env.service';
import { ApiProjectService } from './services/apiProject.service';
import { Component } from '@angular/core';
import { AppBootstrap } from './utils/appBootstrap';
//TODO: See if this can be converted to ecma script modules to supress *CommonJS or AMD dependencies can cause optimization bailouts*
import 'brace/mode/json';
import 'brace/mode/yaml';
import 'brace/mode/xml';
import 'brace/mode/javascript';
import 'brace/ext/searchbox';
import 'brace/ext/language_tools';
import './utils/mode-graphql'

import { ThemesService } from './services/themes.service';
import { RequestsService } from './services/requests.service';
import { ReqHistoryService } from './services/reqHistory.service';
import LocalStore from './services/localStore';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private bootstrap: AppBootstrap, private authService: AuthService) {
    this.init();
    //TODO:after some time fetch user details from server and update local, this is to reflect change in name in other device
  }

  //TODO: For each create calls for envs, move the duplicate check logic to create method itself, with an option to create with suffix such as "Env 2"
  //TODO: refactor each create type to use a parital object with minimum field. Eg: Folders should only take name, desc & parent
  //TODO: Use different methode for update from sync

  async init() {
    this.authService.initLoggedinUser();
    await this.bootstrap.init();

    //for receiving messages from APIC dev tools
    //TODO:
    // try {
    //   if (window.chrome && window.chrome.runtime) {
    //     window.chrome.runtime.onMessage.addListener(function (
    //       message,
    //       sender,
    //       sendResponse
    //     ) {
    //       console.log(message, sender, $state);
    //       if ($state.current.name !== 'apic.home') $state.go('apic.home');
    //       lMenuService.getAllSuits().then(function (suites) {
    //         var selectedSuit = suites.find(
    //           (suit) => suit._id === message.suite
    //         );
    //         if (!selectedSuit) {
    //           toastr.error('Selected suite not found');
    //           return
    //         }
    //         toastr.info('Importing requests');
    //         selectedSuit.harImportReqs = message.requests;
    //         $rootScope.$broadcast('OpenSuitTab', selectedSuit);
    //         sendResponse({ status: "ok" });
    //       });
    //     });
    //   }
    // } catch (e) { }
  }
}
