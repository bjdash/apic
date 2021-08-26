import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { Team, TeamPartial } from 'src/app/models/Team.model';
import { User } from 'src/app/models/User.model';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { Toaster } from 'src/app/services/toaster.service';

@Component({
  selector: 'app-teams',
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss']
})
export class TeamsComponent implements OnInit {
  authUser: User;
  teams: Team[] = [];
  membersOf: TeamPartial[] = []
  newForm: FormGroup;
  flags = {
    loadingTeams: false,
    loadingMembers: false,
    exiting: false,
    showCreate: false,
    creating: false
  }
  expanded = {}
  constructor(private http: HttpService, private authService: AuthService, private toaster: Toaster, fb: FormBuilder) {
    this.newForm = fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]]
    })
  }

  ngOnInit(): void {
    this.authUser = this.authService.getUser();
    this.getTeams();
    this.getMembersOf()
  }

  getTeams() {
    this.flags.loadingTeams = true;
    this.http.getTeams().pipe(first())
      .subscribe(teams => {
        this.flags.loadingTeams = false;
        this.teams = teams;
      }, () => {
        this.flags.loadingTeams = false;
      })
  }

  getMembersOf() {
    this.flags.loadingMembers = true;
    this.http.getMembersOf(this.authUser.UID).pipe(first())
      .subscribe(teams => {
        this.flags.loadingMembers = false;
        this.membersOf = teams;
      }, () => {
        this.flags.loadingMembers = false;
      })
  }

  createTeam() {
    if (this.newForm.invalid) {
      this.toaster.error('Please fill in the details correctly.');
      return
    }
    this.flags.creating = true;
    this.http.createTeam(this.newForm.value.name).pipe(first())
      .subscribe(team => {
        this.flags.creating = false;
        this.toaster.success('Team created.');
        this.getTeams();
      }, () => {
        this.flags.creating = false;
      })
  }

  deleteTeam(id: string) {
    this.flags.loadingTeams = true;
    this.http.deleteTeam(id).pipe(first())
      .subscribe(success => {
        this.flags.loadingTeams = false;
        this.toaster.success('Team deleted.');
        this.getTeams();
      }, () => {
        this.flags.loadingTeams = false;
      })
  }

  exitTeam(id: string) {
    this.flags.exiting = true;
    this.http.exitTeam(id).pipe(first())
      .subscribe(success => {
        this.flags.exiting = false;
        this.toaster.success('Left team.');
        this.getMembersOf();
      }, () => {
        this.flags.exiting = false;
      })
  }

  showCreateTeam() {
    this.flags.showCreate = true;
    setTimeout(() => {
      document.getElementById('newteam').focus()
    }, 0);
  }

  trackbyFn(index) {
    return index;
  }
}
