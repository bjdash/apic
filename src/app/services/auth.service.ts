import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { catchError, map, first, takeUntil } from 'rxjs/operators';
import { UserAction } from '../actions/user.action';
import { SocialUser } from '../models/SocialUser.model';
import { StompMessage } from '../models/StompMessage.model';
import { User } from '../models/User.model';
import { UserState } from '../state/user.state';
import { AppBootstrap } from '../utils/appBootstrap';
import { ApicUrls } from '../utils/constants';
import { ApiProjectService } from './apiProject.service';
import { EnvService } from './env.service';
import { HttpService } from './http.service';
import LocalStore from './localStore';
import { RequestsService } from './requests.service';
import { ApicRxStompState, StompService } from './stomp.service';
import { SuiteService } from './suite.service';
import { SyncService } from './sync.service';
import iDB from './IndexedDB';
import { RxStompState } from '@stomp/rx-stomp';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user: User;

  constructor(private http: HttpClient,
    private httpService: HttpService,
    private store: Store,
    private stompService: StompService,
    private syncService: SyncService,
    private apiProjectService: ApiProjectService,
    private reqService: RequestsService,
    private suiteService: SuiteService,
    private bootstrap: AppBootstrap,
    private router: Router,
    private envService: EnvService) {

    this.store.select(UserState.getAuthUser).subscribe(user => {
      if (user?.UID && user?.authToken) {
        // if ((user.UID != this.user?.UID || user.authToken != this.user?.authToken) && !stompService.client.connected()) {
        if (!stompService.client.connected()) {
          stompService.client.connectionState$
            .pipe(takeUntil(stompService.client.connected$))
            .subscribe((x) => {
              if (x === RxStompState.CLOSED) {
                this.connectToSyncServer(user.UID, user.authToken);
              }
            });
        }
      }
      this.user = user;
    });

    this.syncService.onAccountMessage$.subscribe(async message => {
      this.onSyncMessage(message);
    })
  }

  login(email, psd) {
    return this.http.post(ApicUrls.login, { email, psd })
      .pipe(map((response: any) => {
        if (response?.status === 'ok') {
          this.postLoginHandler(response.resp)
          return response;
        } else {
          throw new Error(response?.desc || 'Unknown error');
        }

      }), catchError((error) => {
        return this.httpService.handleHttpError(error, { messagePrefix: 'Login failed.', supressNotification: true });
      }))
  }

  googleLogin(user: SocialUser) {
    return this.http.post(ApicUrls.googleLogin, {
      name: user.name,
      email: user.email,
      source: user.provider,
      token: user.authToken,//TODO: use id token to validate the user instead, refer https://developers.google.com/identity/sign-in/web/backend-auth
    })
      .pipe(map((response: any) => {
        if (response?.status === 'ok') {
          this.postLoginHandler(response.resp)
          return response;
        } else {
          throw new Error(response?.desc || 'Unknown error');
        }

      }), catchError((error) => {
        return this.httpService.handleHttpError(error, { messagePrefix: 'Login failed.', supressNotification: true });
      }))
  }

  externalBrowserLogin(data) {
    this.postLoginHandler(data);
  }

  register(name, email, psd, captchaCode) {
    return this.http.post(ApicUrls.register, { name, email, psd, captchaCode })
      .pipe(map((response: any) => {
        if (response?.status === 'ok') {
          return response;
        } else {
          throw new Error(response?.desc || 'Unknown error');
        }

      }), catchError((error) => {
        return this.httpService.handleHttpError(error, { messagePrefix: 'Registration failed.', supressNotification: true });
      }))
  }

  forgotPds(email, captchaCode) {
    return this.http.post(ApicUrls.forgotPsd, { email, captchaCode })
      .pipe(map((response: any) => {
        if (response?.status === 'ok') {
          return response;
        } else {
          throw new Error(response?.desc || 'Unknown error');
        }

      }), catchError((error) => {
        return this.httpService.handleHttpError(error, { messagePrefix: 'Request failed.', supressNotification: true });
      }))
  }

  postLoginHandler(userData: User) {
    userData.UID = userData.id;
    this.store.dispatch(new UserAction.Set(userData));//on set of user data we auto connect socket
  }

  connectToSyncServer(UID: string, authToken: string) {
    this.stompService.client.connected$
      .pipe(first())
      .subscribe(() => {
        this.apiProjectService.syncApiProjects();
        this.envService.syncEnvs();
        this.envService.syncEnvs();
        this.reqService.syncFolders();
        this.reqService.syncReqs();
        this.suiteService.syncTestProjects();
        this.suiteService.syncTestSuites();
      })
    this.stompService.connect(UID + '||' + authToken);
  }

  initLoggedinUser() {
    this.store.dispatch(new UserAction.RefreshFromLocal());
  }

  reconnect() {
    var subscription = this.stompService.client.connectionChange$
      // .pipe(first())
      .subscribe(x => {
        if (x === ApicRxStompState.CLOSED) {
          this.stompService.connect(this.user.UID + '||' + this.user.authToken);
          subscription.unsubscribe();
        }
      });
    this.stompService.client.deactivate();
  }

  onSyncMessage(message: StompMessage) {
    if (!message?.action) return;
    switch (message.action) {
      case 'reconnect'://user's password changed so trigger a reconnect so that the user is prompted a login
        this.reconnect();
        break;
    }
  }

  async logout(logoutAll = false) {
    //TODO: Move to a cookie based auth
    if (logoutAll) {
      this.http.get(ApicUrls.logout)
        .pipe(map((response: any) => {
          if (response?.status === 'ok') {
            //TODO: Remove default auth header
            return response;
          } else {
            console.error(response?.desc || 'Unknown error');
          }
        }), catchError((error) => {
          return this.httpService.handleHttpError(error, { messagePrefix: 'Logout failed.', supressNotification: true });
        }))
    }

    LocalStore.clear();
    LocalStore.set(LocalStore.INTRO_SHOWN, true);
    this.store.dispatch(new UserAction.Clear());
    this.stompService.disconnect();

    //clear dbs
    await Promise.all([
      this.envService.clear(),
      this.apiProjectService.clear(),
      this.reqService.clearFolders(),
      this.reqService.clearRequests(),
      this.suiteService.clearSuites(),
      this.suiteService.clearTestProjects(),
      iDB.clear(iDB.TABLES.UNSYNCED)
    ]);

    await this.bootstrap.doFirstRunIfRequired();
    await this.bootstrap.readAllDbs();
    if (this.router.url.startsWith('/dashboard')) {
      this.router.navigate(['designer']);
    }

    //TODO:Change the IDs of each opened tabs
  }

  isLoggedIn(): boolean {
    return !!this.user;
  }
  getUser() {
    return this.user;
  }
  getAuthHeader() {
    return this.user.UID + '||' + this.user?.authToken;
  }
  doIOwn(item: any): boolean {
    return this.user && this.user.UID === item?.owner;
  }
}
