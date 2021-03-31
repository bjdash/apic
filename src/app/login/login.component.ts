import { Toaster } from 'src/app/services/toaster.service';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { first } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  panel: string = 'login';
  message = {
    type: '',
    text: ''
  }

  constructor(@Inject(MAT_DIALOG_DATA) public data: { action: string },
    private httpClient: HttpClient,
    fb: FormBuilder,
    private authService: AuthService,
    private toaster: Toaster,
    private dialogRef: MatDialogRef<LoginComponent>) {

    this.loginForm = fb.group({
      email: ['', [Validators.required, Validators.email]],
      psd: ['', Validators.required]
    });

  }

  ngOnInit(): void {
  }

  login() {
    if (!this.loginForm.valid) return;
    this.setMesssage('info', 'Logging in...');
    this.loginForm.disable();
    var { email, psd } = this.loginForm.value;
    this.authService.login(email, psd)
      .pipe(first())
      .subscribe(data => {
        this.toaster.success('Login successful.');
        this.dialogRef.close();
      },
        error => {
          console.error('login error', error)
          this.setMesssage('error', error, true);
          this.loginForm.enable();
        })
  }

  setMesssage(type, text, autoClear?: boolean) {
    this.message = { type, text };
    if (autoClear) {
      setTimeout(() => {
        this.setMesssage('', '');
      }, 5000);
    }
  }
}
