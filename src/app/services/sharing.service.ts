import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { Team } from '../models/Team.model';
import { HttpService } from './http.service';

export type ShareType = 'APIProject' | 'Suites'
@Injectable({
  providedIn: 'root'
})
export class SharingService {
  teams$ = new BehaviorSubject<Team[]>([]);
  lastShared: { objId: string, type: ShareType } = null
  constructor(private http: HttpService) {
    this.getTeams();
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
      this.lastShared = { objId, type }
      return x;
    })
  }

  unshare(objId: string, teamId: string, type: ShareType) {
    return this.http.unshare(objId, teamId, type).pipe((x) => {
      this.lastShared = { objId, type }
      return x;
    })
  }

  isLastShared(objId: string, type: ShareType): boolean {
    return this.lastShared?.objId === objId && this.lastShared?.type === type
  }
}
