import { EnvService } from './services/env.service';
import { ApiProjectService } from './services/apiProject.service';
import { Component } from '@angular/core';
import { AppBootstrap } from './utils/appBootstrap';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(
    private apiProjectService: ApiProjectService,
    private envService: EnvService,
    private bootstrap: AppBootstrap) {
    console.log('Initiating App....')
    bootstrap.init();
    apiProjectService.getApiProjs();
    envService.getAllEnvs();

  }
}
