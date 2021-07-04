import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { first } from 'rxjs/operators';
import { UserAction } from 'src/app/actions/user.action';
import { User } from 'src/app/models/User.model';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import LocalStore from 'src/app/services/localStore';
import { StompService } from 'src/app/services/stomp.service';
import { Toaster } from 'src/app/services/toaster.service';
import { AccountDeleteDialogComponent } from './account-delete-dialog/account-delete-dialog.component';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  authUser: User;
  detailForm: FormGroup;
  psdForm: FormGroup;
  flags = {
    accUpdating: false,
    psdChanging: false
  }
  constructor(
    fb: FormBuilder,
    private http: HttpService,
    private toaster: Toaster,
    private store: Store,
    private dialog: MatDialog,
    private authService: AuthService) {
    this.detailForm = fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]]
    })
    this.psdForm = fb.group({
      currentPsd: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(50)]],
      newPsd: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(50)]],
      confirmPsd: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(50)]]
    })
  }

  ngOnInit(): void {
    this.authUser = this.authService.getUser();
    this.detailForm.patchValue({ name: this.authUser?.name })
  }

  updateAccount() {
    if (this.detailForm.invalid) {
      this.toaster.error('Please enter a valid name.');
      return;
    }
    this.flags.accUpdating = true;
    let name = this.detailForm.value.name.trim()
    this.http.updateAccount(name).pipe(first())
      .subscribe(success => {
        this.flags.accUpdating = false;
        this.toaster.success('Account name updated.');
        LocalStore.set(LocalStore.NAME, name);
        this.store.dispatch(new UserAction.RefreshFromLocal());
      }, () => {
        this.flags.accUpdating = false;
      })
  }

  changePassword() {
    if (this.detailForm.invalid) {
      this.toaster.error('Please fill in the details correctly.');
      return;
    }
    let { currentPsd, newPsd, confirmPsd } = this.psdForm.value;
    if (newPsd !== confirmPsd) {
      this.toaster.error('New and confirm passwrds doen\'t match.');
      return;
    }
    this.flags.psdChanging = true;
    this.http.changePassword(currentPsd, newPsd, confirmPsd).pipe(first())
      .subscribe(resp => {
        this.flags.psdChanging = false;
        this.toaster.success('Password changed.');
        this.store.dispatch(new UserAction.Update({ [LocalStore.AUTH_TOKEN]: resp.authToken }));
        // this.stompService.reconnect(); //No need to reconnect. AuthService takes care of this
      }, () => {
        this.flags.psdChanging = false;
      })
  }

  deleteAccount() {
    this.dialog.open(AccountDeleteDialogComponent, {});
  }
}
