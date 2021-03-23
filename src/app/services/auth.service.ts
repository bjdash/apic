import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { throwError } from 'rxjs';
import { catchError, map, first } from 'rxjs/operators';
import { UserAction } from '../actions/user.action';
import { User } from '../models/User.model';
import { UserState } from '../state/user.state';
import { ApicUrls } from '../utils/constants';
import { ApiProjectService } from './apiProject.service';
import { EnvService } from './env.service';
import { HttpService } from './http.service';
import { StompService } from './stomp.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user: User;

  constructor(private http: HttpClient,
    private httpService: HttpService,
    private store: Store,
    public stompService: StompService,
    private apiProjectService: ApiProjectService,
    private envService: EnvService) {
    this.store.select(UserState.getAuthUser).subscribe(user => {
      if (user?.UID && user?.authToken) {
        if ((user.UID != this.user?.UID || user.authToken != this.user?.authToken) && !stompService.client.connected()) {
          this.connectToSyncServer(user.UID, user.authToken);
        }
        this.user = user;
      }
    })
  }

  login(email, psd) {
    return this.http.post(ApicUrls.login, { email, psd })
      .pipe(map((response: any) => {
        console.log(response);
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

  postLoginHandler(userData: User) {
    userData.UID = userData.id;
    this.store.dispatch(new UserAction.Set(userData));//on set of user data we auto connect socket
    //TODO:
    // $http.defaults.headers.common['Authorization'] = userData.UID + '||' + userData.authToken;

    // if (prevLogin.UID === userData.id) {
    //   ngSockJs.reconnect({ 'Auth-Token': userData.UID + '||' + userData.authToken });
    // } else {
    //   ngSockJs.connect({ 'Auth-Token': userData.UID + '||' + userData.authToken }).then(function () {
    //     DataService.getAllData(true).then(function (allData) {
    //       SyncIt.execute('updateAll', allData);
    //       SyncIt.fetch('fetchAll');
    //     });
    //   });
    // }
  }

  connectToSyncServer(UID: string, authToken: string) {
    this.stompService.client.connected$.pipe(first()).subscribe(() => {
      this.apiProjectService.syncApiProjects();
      this.envService.syncApiProjects();
      //TODO: add for others

    })
    this.stompService.connect(UID + '||' + authToken);
  }

  initLoggedinUser() {
    this.store.dispatch(new UserAction.RefreshFromLocal());
  }

  logout() {

  }
}
