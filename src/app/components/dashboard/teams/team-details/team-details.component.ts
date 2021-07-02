import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { Team } from 'src/app/models/Team.model';
import { HttpService } from 'src/app/services/http.service';
import { Toaster } from 'src/app/services/toaster.service';

@Component({
  selector: 'app-team-details',
  templateUrl: './team-details.component.html',
  styleUrls: ['./team-details.component.scss']
})
export class TeamDetailsComponent implements OnInit {
  selectedTeam: Team;
  form: FormGroup;
  addForm: FormGroup;
  flags = {
    loading: false,
    adding: false,
    updating: false,
    removing: false
  }

  constructor(private route: ActivatedRoute, private http: HttpService, private toaster: Toaster, fb: FormBuilder, private confirm: ConfirmService) {
    this.route.params.subscribe(params => {
      this.getTeamDetail(params.teamId);
    })
    this.form = fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]]
    })
    this.addForm = fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      role: ['1', [Validators.required]]
    })
  }

  ngOnInit(): void {
  }

  getTeamDetail(id) {
    this.flags.loading = true;
    this.http.getTeambyId(id).pipe(first())
      .subscribe(team => {
        this.flags.loading = false;
        this.selectedTeam = team;
        this.form.patchValue({ name: this.selectedTeam.name })
      }, () => {
        this.flags.loading = false;
      })
  }

  updateTeam() {
    if (this.form.invalid) {
      this.toaster.error('Please fill in the details correctly.');
      return
    }
    this.flags.updating = true;
    this.http.patchTeam(this.selectedTeam.id, { name: this.form.value.name }).pipe(first())
      .subscribe(success => {
        this.flags.updating = false;
        this.toaster.success('Team updated.');
        this.getTeamDetail(this.selectedTeam.id)
      }, () => {
        this.flags.updating = false;
      })
  }
  addMember() {
    if (this.addForm.invalid) {
      this.toaster.error('Please fill in the details correctly.');
      return
    }
    this.flags.adding = true;
    const { email, role } = this.addForm.value
    this.http.addMember(this.selectedTeam.id, { email: email.trim(), role }).pipe(first())
      .subscribe(team => {
        this.flags.adding = false;
        this.toaster.success('New member added.');
        this.selectedTeam = team;
        this.addForm.reset();
      }, (e) => {
        this.flags.adding = false;
        if (e === 'The specified email is not registered with APIC.') {
          this.confirm.confirm({
            confirmTitle: 'Invite User',
            confirm: 'The specified email is not registered with APIC. Would you like to send an invite to join APIC?',
            confirmOk: 'Invite',
            confirmCancel: 'May be later'
          }).then(() => {
            this.invite(email);
          })
        }
      })
  }
  removeMember(membId) {
    this.flags.removing = true;
    this.http.removeMember(this.selectedTeam.id, membId).pipe(first())
      .subscribe(team => {
        this.flags.removing = false;
        this.toaster.success('User removed from team.');
        this.getTeamDetail(this.selectedTeam.id);
      }, () => {
        this.flags.removing = false;
      })
  }

  invite(email: string) {
    this.http.inviteToApic(email).pipe(first())
      .subscribe(resp => {
        if (resp?.error?.length) {
          this.toaster.error(`Failed to invite ${resp.error.join(',')}.`)
        } else {
          this.toaster.success('Invitation sent.');
        }
      })
  }

  trackbyFn(index) {
    return index
  }
}
