import { AuthService } from './services/auth.service';
import { EnvService } from './services/env.service';
import { ApiProjectService } from './services/apiProject.service';
import { Component } from '@angular/core';
import { AppBootstrap } from './utils/appBootstrap';
//TODO: See if this can be converted to ecma script modules to supress *CommonJS or AMD dependencies can cause optimization bailouts*
import 'brace/mode/json';
import 'brace/mode/yaml';
import { ThemesService } from './services/themes.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(
    private apiProjectService: ApiProjectService,
    private envService: EnvService,
    private themeService: ThemesService,
    private bootstrap: AppBootstrap) {
    console.log('Initiating App....')
    bootstrap.init();
    apiProjectService.getApiProjs();
    envService.getAllEnvs();
    this.themeService.applyCurrentTheme();
  }
}
