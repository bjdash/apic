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
import { ThemesService } from './services/themes.service';
import { RequestsService } from './services/requests.service';
import { ReqHistoryService } from './services/reqHistory.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private bootstrap: AppBootstrap, private authService: AuthService) {

    this.init();
  }

  async init() {
    await this.bootstrap.init();
    this.authService.initLoggedinUser();
  }
}
