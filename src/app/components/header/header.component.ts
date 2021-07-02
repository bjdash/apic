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
  moduleUrls = {
    tester: '/tester',
    designer: '/designer',
    dashboard: '/dashboard',
    docs: '/docs'
  }
  notifications: any[] = []

  constructor(private store: Store,
    private dialog: MatDialog,
    router: Router,
    private httpService: HttpService,
    public stompService: StompService) {
    router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        Object.keys(this.moduleUrls).forEach(key => {
          if (event.url.startsWith(`/${key}`)) {
            this.moduleUrls[key] = event.url.split('?')[0];
          }
        })
      })
  }

  ngOnInit(): void {
    this.getNotifications();
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

  public get ApicRxStompState() {
    return ApicRxStompState;
  }
}
