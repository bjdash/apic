import { Toaster } from 'src/app/services/toaster.service';
import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { first } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { environment } from 'src/environments/environment';
import { RecaptchaComponent } from 'ng-recaptcha';
import { GoogleLoginService } from 'src/app/services/google-login.service';
import { SocialUser } from 'src/app/models/SocialUser.model';
import io from 'socket.io-client';
import { ApicUrls } from 'src/app/utils/constants';
import apic from 'src/app/utils/apic';

declare const chrome;
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  providers: [GoogleLoginService]
})
export class LoginComponent implements OnInit, OnDestroy {
  @ViewChild('regCaptcha') regCaptcha: RecaptchaComponent;
  @ViewChild('forgotCaptcha') forgotCaptcha: RecaptchaComponent;
  loginForm: FormGroup;
  regForm: FormGroup;
  forgotForm: FormGroup;
  socketClient;
  flags = {
    panel: 'login',
    disableGoogle: false
  }
  message = {
    type: '',
    text: ''
  }
  CAPTCHA_SITE_KEY: string = environment.CAPTCHA_SITE_KEY;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { action: string },
    private googleAuth: GoogleLoginService,
    fb: FormBuilder,
    private authService: AuthService,
    private toaster: Toaster,
    private dialogRef: MatDialogRef<LoginComponent>) {

    this.loginForm = fb.group({
      email: ['', [Validators.required, Validators.email]],
      psd: ['', Validators.required]
    });
    this.regForm = fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      psd: ['', Validators.required],
      captchaCode: ['']
    });
    this.forgotForm = fb.group({
      email: ['', [Validators.required, Validators.email]],
      captchaCode: ['']
    });

    this.flags.panel = data.action ?? 'login';
    if (environment.PLATFORM === 'WEB') {
      googleAuth.initialize().catch((e) => {
        console.error('Failed to load google auth plugin', e);
        toaster.error(`Failed to load google auth plugin: ${e.message}`);
      });
    }
  }
  ngOnDestroy(): void {
    if (this.socketClient) {
      this.socketClient.disconnect();
    }
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

  register() {
    if (!this.regForm.valid) return;
    this.setMesssage('info', 'Registering...');
    var { name, email, psd, captchaCode } = this.regForm.value;
    if (!captchaCode) {
      this.setMesssage('error', 'Please solve the captcha.');
      return;
    }
    this.regForm.disable();
    this.authService.register(name, email, psd, captchaCode)
      .pipe(first())
      .subscribe(data => {
        this.setMesssage(data.status, data.desc);
        this.regForm.enable();
        this.regCaptcha.reset()
      },
        error => {
          console.error('registration error', error)
          this.setMesssage('error', error, true);
          this.regForm.enable();
          this.regCaptcha.reset();
        });
  }

  forgotPsd() {
    if (!this.forgotForm.valid) return;
    this.setMesssage('info', 'Requesting password reset link ...');
    var { email, captchaCode } = this.forgotForm.value;
    if (!captchaCode) {
      this.setMesssage('error', 'Please solve the captcha.');
      return;
    }
    this.forgotForm.disable();
    this.authService.forgotPds(email, captchaCode)
      .pipe(first())
      .subscribe(data => {
        this.setMesssage(data.status, data.desc);
        this.forgotForm.enable();
        this.forgotCaptcha.reset()
      },
        error => {
          console.error('forgot psd error', error)
          this.setMesssage('error', error, true);
          this.forgotForm.enable();
          this.forgotCaptcha.reset();
        });
  }

  googleLogin() {
    if (environment.PLATFORM === 'WEB') {
      this.googleLoginWeb()
    } if (environment.PLATFORM === 'CHROME' || environment.PLATFORM === 'ELECTRON') {
      this.googleLoginExternalBrowser();
    }
  }

  async googleLoginWeb() {
    try {
      let user: SocialUser = await this.googleAuth.signIn();
      this.setMesssage('info', `Hi ${user.name}. Please wait a moment. We are logging you in...`);
      this.authService.googleLogin(user)
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
    } catch (e) {
      console.error('Failed to login with google', e);
      this.toaster.error(`Failed to login with google: ${e.message}`);
    }
  }

  googleLoginExternalBrowser() {
    this.socketClient = io.connect(ApicUrls.host, {
      path: '/api/socket.io',
      reconnection: false
    });
    this.setMesssage('info', 'Please continue signing in with your browser which should have opened now. Completing the sign-in in the browser will automatically log you in this App.');

    this.socketClient.on('connect', () => {
      var connId = apic.s12() + apic.s12();
      console.log('connecting soket', connId);
      this.socketClient.emit('web_connect', connId);
      if (environment.PLATFORM === 'ELECTRON') {
        window.apicElectron.openUrl('https://apic.app/identity/#!/login?connId=' + connId);
      } else {
        window.open('https://apic.app/identity/#!/login?connId=' + connId);
      }
    });

    this.socketClient.on('loginNotify', (dataStr) => {
      var data = JSON.parse(dataStr);
      this.socketClient.disconnect();
      this.authService.externalBrowserLogin(data);
      this.toaster.success('Login successful.');
      this.dialogRef.close();
    })
  }

  // config = {
  //   "userInfoUrl": "https://www.googleapis.com/plus/v1/people/me",
  //   "userInfoNameField": "displayName",
  //   "implicitGrantUrl": "https://accounts.google.com/o/oauth2/auth",
  //   "logoutUrl": "https://accounts.google.com/logout",
  //   "tokenInfoUrl": "https://www.googleapis.com/oauth2/v3/tokeninfo",
  //   "clientId": "918023175434-a2g8ipi3cp3l7bmd2r0tc9knlov6dm2i.apps.googleusercontent.com",
  //   "scopes": "https://www.googleapis.com/auth/userinfo.profile",
  //   "logoutWarningSeconds": 60,
  //   "autoReLogin": true
  // }
  // async googleLoginChromeExtn(callback) {
  //   var authUrl = this.config.implicitGrantUrl
  //     + '?response_type=token&client_id=' + this.config.clientId
  //     + '&scope=' + this.config.scopes
  //     + '&redirect_uri=' + chrome.identity.getRedirectURL("oauth2");

  //   console.log('launchWebAuthFlow:', authUrl);

  //   chrome.identity.launchWebAuthFlow({ 'url': authUrl, 'interactive': true }, function (redirectUrl) {
  //     if (redirectUrl) {
  //       console.log('launchWebAuthFlow login successful: ', redirectUrl);
  //       var parsed = this.parse(redirectUrl.substr(chrome.identity.getRedirectURL("oauth2").length + 1));
  //       let token = parsed.access_token;
  //       console.log('Background login complete', token);
  //       return callback(redirectUrl); // call the original callback now that we've intercepted what we needed
  //     } else {
  //       console.log("launchWebAuthFlow login failed. Is your redirect URL (" + chrome.identity.getRedirectURL("oauth2") + ") configured with your OAuth2 provider?");
  //       return (null);
  //     }
  //   });
  // }

  // parse(str) {
  //   if (typeof str !== 'string') {
  //     return {};
  //   }
  //   str = str.trim().replace(/^(\?|#|&)/, '');
  //   if (!str) {
  //     return {};
  //   }
  //   return str.split('&').reduce(function (ret, param) {
  //     var parts = param.replace(/\+/g, ' ').split('=');
  //     // Firefox (pre 40) decodes `%3D` to `=`
  //     // https://github.com/sindresorhus/query-string/pull/37
  //     var key = parts.shift();
  //     var val = parts.length > 0 ? parts.join('=') : undefined;
  //     key = decodeURIComponent(key);
  //     // missing `=` should be `null`:
  //     // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
  //     val = val === undefined ? null : decodeURIComponent(val);
  //     if (!ret.hasOwnProperty(key)) {
  //       ret[key] = val;
  //     }
  //     else if (Array.isArray(ret[key])) {
  //       ret[key].push(val);
  //     }
  //     else {
  //       ret[key] = [ret[key], val];
  //     }
  //     return ret;
  //   }, {});
  // }

  setMesssage(type, text, autoClear?: boolean) {
    this.message = { type, text };
    if (autoClear) {
      setTimeout(() => {
        this.setMesssage('', '');
      }, 5000);
    }
  }
}
