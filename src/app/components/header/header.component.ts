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

@Component({
  selector: 'apic-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @Select(EnvState.getAll) envs$: Observable<Env[]>;
  @Select(EnvState.getSelected) selectedEnv$: Observable<ParsedEnv>;
  @Select(UserState.getAuthUser) loggedInUser$: Observable<User>;


  constructor(private store: Store,
    private dialog: MatDialog,
    public stompService: StompService) {

  }

  test() {
  }

  ngOnInit(): void {

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

  public get ApicRxStompState() {
    return ApicRxStompState;
  }
}
