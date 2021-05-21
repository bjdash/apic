import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.scss']
})
export class LogoutComponent implements OnInit {
  logoutAll = false;
  constructor(private authService: AuthService, public dialogRef: MatDialogRef<LogoutComponent>) { }

  ngOnInit(): void {
  }

  async logout() {
    await this.authService.logout(this.logoutAll);
    this.dialogRef.close();
  }
}
