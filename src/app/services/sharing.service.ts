import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { Team } from '../models/Team.model';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class SharingService {
  teams: Team[] = [];
  constructor(private http: HttpService) {
    this.getTeams();
  }

  getTeams() {
    this.http.getTeams().pipe(first())
      .subscribe(teams => {
        this.teams = teams;
      }, (e) => {
        console.error('Failed to load teams.', e)
      })
  }

  share(objId: string, teamId: string, type: 'APIProject') {
    return this.http.share(objId, teamId, type).pipe((x) => {
      console.log('share', x)
      return x;
    })

  }
}
