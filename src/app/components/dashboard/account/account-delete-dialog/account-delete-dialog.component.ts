import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { Toaster } from 'src/app/services/toaster.service';

@Component({
  selector: 'app-account-delete-dialog',
  templateUrl: './account-delete-dialog.component.html',
  styleUrls: ['./account-delete-dialog.component.scss']
})
export class AccountDeleteDialogComponent implements OnInit {
  confirm = "";
  deleting = false;
  constructor(
    private toaster: Toaster,
    private http: HttpService,
    private authService: AuthService,
    private router: Router,
    private dialogRef: MatDialogRef<AccountDeleteDialogComponent>,) { }

  ngOnInit(): void {
  }

  deleteAccount() {
    if (this.confirm !== 'confirm') {
      this.toaster.error('Please type in confirm in the text box to delete.');
      return;
    }
    this.deleting = true;
    this.http.deleteAccount().pipe(first())
      .subscribe(resp => {
        this.deleting = false;
        this.toaster.success('Account deleted.');
        this.authService.logout(true);
        this.router.navigate(['designer']);
        this.dialogRef.close();
      }, () => {
        this.deleting = false;
      })
  }
}
