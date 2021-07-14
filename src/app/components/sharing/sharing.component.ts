import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { first } from 'rxjs/operators';
import { Team } from 'src/app/models/Team.model';
import { HttpService } from 'src/app/services/http.service';
import { ShareType, SharingService } from 'src/app/services/sharing.service';
import { Toaster } from 'src/app/services/toaster.service';

@Component({
  selector: 'app-sharing',
  templateUrl: './sharing.component.html',
  styleUrls: ['./sharing.component.scss']
})
export class SharingComponent implements OnInit {
  teams: Team[] = [];
  flags = {
    loading: false,
    sharing: false
  }
  constructor(
    private http: HttpService,
    private sharing: SharingService,
    private toaster: Toaster,
    private dialogRef: MatDialogRef<SharingComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { objId: string, type: ShareType }
  ) { }

  ngOnInit(): void {
    this.getTeams()
  }

  getTeams() {
    this.flags.loading = true;
    this.http.getTeams().pipe(first())
      .subscribe(teams => {
        this.flags.loading = false;
        this.teams = teams;
      }, () => {
        this.flags.loading = false;
      })
  }

  share(team: Team) {
    this.flags.sharing = true;
    this.sharing.share(this.data.objId, team.id, this.data.type).pipe(first())
      .subscribe(teams => {
        this.flags.sharing = false;
        this.dialogRef.close();
        this.toaster.success(`${this.data.type} shared with team ${team.name}`);
      }, () => {
        this.flags.sharing = false;
      })
  }
}
