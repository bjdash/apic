import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { Team } from '../models/Team.model';
import { User } from '../models/User.model';
import { UserState } from '../state/user.state';
import { HttpService } from './http.service';

export type ShareType = 'APIProject' | 'Folders' | 'TestCaseProjects' | 'Envs';
@Injectable({
  providedIn: 'root'
})
export class SharingService {
  teams$ = new BehaviorSubject<Team[]>([]);
  authUser: User;
  lastShared: { objIds: string[], type: ShareType } = null
  constructor(private http: HttpService, private store: Store) {
    this.store.select(UserState.getAuthUser).subscribe(user => {
      this.authUser = user;
      if (user?.UID) {
        this.getTeams();
      }
    });
  }

  getTeams() {
    this.http.getTeams().pipe(first())
      .subscribe(teams => {
        this.teams$.next(teams);
      }, (e) => {
        console.error('Failed to load teams.', e)
      })
  }

  share(objId: string, teamId: string, type: ShareType) {
    return this.http.share(objId, teamId, type).pipe((x) => {
      this.lastShared = { objIds: [objId], type }
      return x;
    })
  }

  shareMulti(objIds: string[], teamId: string, type: ShareType) {
    return this.http.shareMulti(objIds, teamId, type).pipe((x) => {
      this.lastShared = { objIds, type }
      return x;
    })
  }

  unshare(objId: string, teamId: string, type: ShareType) {
    return this.http.unshare(objId, teamId, type).pipe((x) => {
      this.lastShared = { objIds: [objId], type }
      return x;
    })
  }

  unshareMulti(objIds: string[], teamId: string, type: ShareType) {
    return this.http.unshareMulti(objIds, teamId, type).pipe((x) => {
      this.lastShared = { objIds: objIds, type }
      return x;
    })
  }

  isLastShared(objId: string, type: ShareType): boolean {
    return this.lastShared?.objIds?.includes(objId) && this.lastShared?.type === type
  }
}
