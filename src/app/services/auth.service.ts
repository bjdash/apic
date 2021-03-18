import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { throwError } from 'rxjs';
import { catchError, map, first } from 'rxjs/operators';
import { UserAction } from '../actions/user.action';
import { User } from '../models/User.model';
import { ApicUrls } from '../utils/constants';
import { HttpService } from './http.service';
import { StompService } from './stomp.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient, private httpService: HttpService, private store: Store, public stompService: StompService) { }

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
    this.store.dispatch(new UserAction.Set(userData));
    this.stompService.client.connected$.pipe(first()).subscribe(() => {
      alert('connected');
    })
    this.stompService.connect(userData.UID + '||' + userData.authToken);
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

  getLoggedInUser() {
    this.store.dispatch(new UserAction.RefreshFromLocal());
  }

  logout() {

  }
}
