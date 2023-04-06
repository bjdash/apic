import { EnvState } from './../../../../state/envs.state';
import { Env } from './../../../../models/Envs.model';
import { EnvService } from './../../../../services/env.service';
import { Toaster } from './../../../../services/toaster.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { first, map, takeUntil, take } from 'rxjs/operators';
import { UserState } from 'src/app/state/user.state';
import { User } from 'src/app/models/User.model';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Subject, Subscription } from 'rxjs';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { ApiProjectDetailService } from '../api-project-detail.service';
import { MatDialog } from '@angular/material/dialog';
import { SharingComponent } from 'src/app/components/sharing/sharing.component';
import { Team } from 'src/app/models/Team.model';
import { SharingService } from 'src/app/services/sharing.service';
import { Utils } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { TesterTabsService } from 'src/app/components/tester/tester-tabs/tester-tabs.service';
import { ImportExportService } from 'src/app/services/importExport.service';
import { FileSystem } from 'src/app/services/fileSystem.service';

@Component({
  selector: 'app-project-home',
  templateUrl: './project-home.component.html',
  styleUrls: ['../api-project-detail.component.scss']
})
export class ProjectHomeComponent implements OnInit, OnDestroy {
  selectedPROJ: ApiProject;
  authUser: User;
  teams: { [key: string]: Team } = {};
  private _destroy: Subject<boolean> = new Subject<boolean>();
  private projEnv$: Subscription;
  projEnv: Env = null; //auto generated env for this project
  flags = {
    editProj: false,
    loadSecDefTab: false,
    secDefChanged: false,
    settingsChanged: false,
    tagsChanged: false,
    infoChanged: false,
    unshare: false,
    mockHelp: false,
    hideMocks: false,
    mocking: false
  }
  CODE_GENERATOR = {
    SERVERS: ["aspnetcore", "go-server", "inflector", "jaxrs-cxf", "jaxrs-cxf-cdi", "jaxrs-di", "jaxrs-jersey", "jaxrs-resteasy", "jaxrs-resteasy-eap", "jaxrs-spec", "kotlin-server", "micronaut", "nodejs-server", "python-flask", "scala-akka-http-server", "spring"],
    CLIENTS: ["csharp", "csharp-dotnet2", "dart", "dynamic-html", "go", "html", "html2", "java", "javascript", "jaxrs-cxf-client", "kotlin-client", "openapi", "openapi-yaml", "php", "python", "r", "ruby", "scala", "swift3", "swift4", "swift5", "typescript-angular", "typescript-axios", "typescript-fetch"]
  }

  constructor(
    private toaster: Toaster,
    private dialog: MatDialog,
    private store: Store,
    private router: Router,
    private sharing: SharingService,
    private apiProjService: ApiProjectService,
    private apiProjectDetailService: ApiProjectDetailService,
    private authService: AuthService,
    private httpService: HttpService,
    private swaggerService: ImportExportService,
    private utils: Utils,
    private fileSystemService: FileSystem,
    private envService: EnvService) {

    this.apiProjectDetailService.onSelectedProj$
      .pipe(takeUntil(this._destroy))
      .subscribe(proj => {
        if (proj) {
          this.selectedPROJ = proj;
          this.processSelectedProj();
        }
      })
    this.store.select(UserState.getAuthUser)
      .pipe(takeUntil(this._destroy))
      .subscribe(user => {
        this.authUser = user;
      });

    this.sharing.teams$
      .pipe(takeUntil(this._destroy))
      .subscribe(teams => {
        this.teams = Utils.arrayToObj(teams, 'id');
      })


    this.updateApiProject = this.updateApiProject.bind(this);
  }

  processSelectedProj() {
    if ((!this.projEnv$ || this.projEnv$?.closed) && this.selectedPROJ.setting) {
      this.projEnv$ = this.store.select(EnvState.getById)
        .pipe(map(filterFn => filterFn(this.selectedPROJ.setting.envId)))
        // .pipe(take(1))
        .pipe(takeUntil(this._destroy))
        .subscribe(env => { this.projEnv = env; });
    }
  }

  async updateApiProject(proj) {
    await this.apiProjService.updateAPIProject(proj);
  }

  openExportModal(type, id) {
    this.apiProjectDetailService.exportProj(type, id)
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this._destroy.next(true);
    this._destroy.complete();
  }

  async deleteApiProject() {
    var id = this.selectedPROJ._id;
    try {
      await this.apiProjService.deleteAPIProject(id, this.selectedPROJ.owner);
      if (this.selectedPROJ.setting?.envId) {
        this.envService.deleteEnvs([this.selectedPROJ.setting.envId])
      }

      this.router.navigate(['/designer']);
      this.toaster.success('Project deleted');
      this._destroy.next(true);
      this._destroy.complete();
    } catch (e) {
      this.toaster.error(`Failed to delete project. ${e?.message || e || ''}`);
    }
  }

  tabChange(event: MatTabChangeEvent) {
    if (event.index === 1) this.flags.loadSecDefTab = true
  }

  tabContentModified(status, tab) {
    this.flags[tab] = status?.dirty;
  }

  share() {
    if (!this.authService.isLoggedIn()) {
      this.toaster.error('You need to login to apic to use this feature.');
      return;
    }
    this.dialog.open(SharingComponent, { data: { objId: this.selectedPROJ._id, type: 'APIProject' } });
  }

  unshare() {
    this.flags.unshare = true;
    this.sharing.unshare(this.selectedPROJ._id, this.selectedPROJ.team, 'APIProject').pipe(first())
      .subscribe(teams => {
        this.flags.unshare = false;
        this.toaster.success(`Project un-shared with team.`);
      }, () => {
        this.flags.unshare = false;
      })
  }

  publishDocs() {
    if (this.selectedPROJ._id.includes('demo')) {
      this.toaster.error('This is  a demo project and can\'t be published.');
      return;
    }
    if (!this.authService.doIOwn(this.selectedPROJ)) {
      this.toaster.error('You can\'t publish this project as you are not the owner of it.');
      return;
    }
    this.router.navigate(['/', 'dashboard', 'puslishedDocs', this.selectedPROJ.publishedId ? this.selectedPROJ.publishedId : 'new'], { queryParams: { projId: this.selectedPROJ._id, title: this.selectedPROJ.title } })
  }

  copy(text) {
    this.utils.copyToClipboard(text);
  }

  async runMockedEndp(endpId) {
    if (!this.selectedPROJ.simKey) {
      this.toaster.error('Please enable response mocking first.');
      return;
    }
    this.apiProjectDetailService.runEndp(endpId, this.selectedPROJ, true);
  }

  enableMock() {
    if (!this.authService.isLoggedIn()) {
      this.toaster.error('You need to be logged in to APIC to use this feature.');
      return;
    }
    if (this.selectedPROJ._id.indexOf('-demo') > 0) {
      this.toaster.error('This is a demo project and can\'t be mocked.');
      return;
    }
    this.flags.mocking = true;
    this.httpService.enableMock(this.selectedPROJ._id).pipe(first())
      .subscribe(() => {
        this.flags.mocking = false;
        this.toaster.success('Mocking enabled.');
      }, () => {
        this.flags.mocking = false;
      })

  }

  disableMock() {
    this.flags.mocking = true;
    this.httpService.disableMock(this.selectedPROJ._id).pipe(first())
      .subscribe(() => {
        this.flags.mocking = false;
        this.toaster.success('Mocking disabled.');
      }, () => {
        this.flags.mocking = false;
      })
  }

  buildRequests() {
    this.apiProjectDetailService.buildRequests(this.selectedPROJ);
  }

  async downloadCode(type: 'SERVER' | 'CLIENT', lang: string) {
    this.toaster.info('Downloading...');
    let projEnv: Env;
    if (this.selectedPROJ.setting?.envId) {
      let projEnv = await this.store.select(EnvState.getById)
        .pipe(map(filterFn => filterFn(this.selectedPROJ.setting.envId)))
        .pipe(take(1)).toPromise();
    }
    let spec = this.swaggerService.exportOAS3({ ...this.selectedPROJ }, projEnv)
    this.httpService.downloadCode(type, lang, spec)
      .then(resp => resp.blob())
      .then(blob => {
        this.fileSystemService.download(`${lang}-${type.toLowerCase()}.zip`, blob, 'blob')
      }).catch(e => {
        console.error(e);
        this.toaster.error(`Failed to download ${type}`)
      });
  }

}
