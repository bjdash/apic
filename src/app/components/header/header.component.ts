import { UserState } from '../../state/user.state';
import { Store } from '@ngxs/store';
import { Env, ParsedEnv } from '../../models/Envs.model';
import { EnvState } from '../../state/envs.state';
import { Component, OnInit } from '@angular/core';
import { Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { EnvsAction } from '../../actions/envs.action';
import { MatDialog } from '@angular/material/dialog';
import { EnvsComponent } from '../envs/envs.component';
import { LoginComponent } from './../login/login.component';
import { User } from '../../models/User.model';
import { ApicRxStompState, StompService } from '../../services/stomp.service';
import { SettingsComponent } from '../settings/settings.component';
import { environment } from 'src/environments/environment';
import { LogoutComponent } from '../login/logout/logout.component';
import { NavigationEnd, Router } from '@angular/router';
import { filter, first } from 'rxjs/operators';
import { HttpService } from 'src/app/services/http.service';
import LocalStore from 'src/app/services/localStore';
import { AuthService } from 'src/app/services/auth.service';
import { SyncService } from 'src/app/services/sync.service';
import { ElectronHandlerService } from 'src/app/services/electron-handler.service';
import { Toaster } from 'src/app/services/toaster.service';
import { AppUpdateComponent } from '../dialogs/app-update/app-update.component';
import { UpdateDownloadedComponent } from '../dialogs/update-downloaded/update-downloaded.component';
import { ApicAgentService, ApicAgentStatus } from 'src/app/services/apic-agent.service';
import { IntroComponent } from '../intro/intro.component';

declare global {
  interface Window {
    apicElectron: any;
  }
}
@Component({
  selector: 'apic-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @Select(EnvState.getAll) envs$: Observable<Env[]>;
  @Select(EnvState.getSelected) selectedEnv$: Observable<ParsedEnv>;
  @Select(UserState.getAuthUser) loggedInUser$: Observable<User>;

  version = environment.VERSION;
  platform = environment.PLATFORM;
  os = window.apicElectron?.osType;


  moduleUrls = {
    tester: '/tester',
    designer: '/designer',
    dashboard: '/dashboard',
    docs: '/docs'
  }
  notifications: any[] = [];
  flags: { update: 'idle' | 'downloading' | 'downloaded', downloadPercent: number, agent: ApicAgentStatus, agentOpt: boolean } = {
    update: 'idle',
    downloadPercent: 0,
    agent: 'offline',
    agentOpt: false
  }

  constructor(private store: Store,
    private dialog: MatDialog,
    private router: Router,
    private toaster: Toaster,
    private httpService: HttpService,
    private electronHandler: ElectronHandlerService,
    private apicAgentService: ApicAgentService,
    public stompService: StompService) {
    router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        Object.keys(this.moduleUrls).forEach(key => {
          if (event.url.startsWith(`/${key}`)) {
            this.moduleUrls[key] = event.url.split('#')[0].split('?')[0];
          }
        })
      });
    if (this.platform === 'WEB') {
      this.apicAgentService.status$.subscribe(status => {
        this.flags.agent = status;
      })
    }
  }

  ngOnInit(): void {
    this.getNotifications();

    //checkfor update
    this.checkForUpdate();

    this.electronHandler.onElectronMessage$.subscribe(data => {
      switch (data.type) {
        case 'checking-for-update':
          console.info('checking-for-update');
          break;
        case 'update-not-available':
          this.toaster.info('Hooray!!! You are using the latest version of apic');
          break;
        case 'update-error':
          this.toaster.error('Couldn\'t check for update. Please try again later.');
          break;
        case 'update-available':
          console.info('Downloading update');
          break;
        case 'update-downloaded':
          setTimeout(() => {
            this.flags.update = 'downloaded';
            this.dialog.open(UpdateDownloadedComponent);
          }, 100);
          break;
        case 'download-progress':
          this.flags.update = 'downloading';
          this.flags.downloadPercent = data.data.percent.toFixed(2);
          break;
      }
    })
  }

  selectEnv(_id: String) {
    this.store.dispatch(new EnvsAction.Select(_id));
  }

  openEnvModal() {
    this.dialog.open(EnvsComponent, { disableClose: true, panelClass: 'envs-dialog' });
  }

  openSettings() {
    this.dialog.open(SettingsComponent, { panelClass: 'settings-dialog', minWidth: '65vw' });
  }
  openAgentSetting() {
    this.dialog.open(SettingsComponent, { panelClass: 'settings-dialog', minWidth: '65vw', data: { selected: 'Web Agent (CORS)' } });
  }

  openAuthModal(action) {
    this.dialog.open(LoginComponent,
      {
        disableClose: true,
        data: { action },
        width: '100vw',
        height: '100vh', maxWidth: '100vw'
      });
  }

  logout() {
    this.dialog.open(LogoutComponent);
  }

  openIntro() {
    this.dialog.open(IntroComponent,
      {
        disableClose: true,
        width: '100vw',
        height: '100vh', maxWidth: '100vw'
      });
  }

  getNotifications() {
    this.httpService.getNotifications()
      .pipe(first())
      .subscribe(data => {
        this.notifications = data
      });
  }

  saveWorkspace(workspace) {
    LocalStore.set(LocalStore.WORKSPACE, workspace);
  }

  checkForUpdate(manual = false) {
    this.httpService.checkForUpdate()
      .pipe(first())
      .subscribe(response => {
        if (response) {//update found
          this.dialog.open(AppUpdateComponent, { data: { newVer: response.version, changeLog: response.changeLog } });
        } else {//no update
          if (manual) {
            this.toaster.info("You are already using the latest version of apic.");
          }
        }

      });
  }

  public get ApicRxStompState() {
    return ApicRxStompState;
  }

  restart() {
    this.electronHandler.sendMessage('restart-apic');
  }

  winClose() {
    window.apicElectron.winClose();
  }

  winMinimize() {
    window.apicElectron.winMinimize();
  }

  winMaximize() {
    window.apicElectron.winMaximize()
  }
  openDevTools() {
    this.electronHandler.sendMessage('open-devtools');
  }

  connectAgent() {
    if (this.apicAgentService.isOnline()) {
      this.apicAgentService.disconnect();
    } else {
      this.apicAgentService.connect();
    }
  }
}
