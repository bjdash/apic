import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { SocialUser } from '../models/SocialUser.model';
import { AUTH_PROVIDERS } from '../utils/constants';
import { Toaster } from './toaster.service';

declare let gapi: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleLoginService {
  readonly scriptId = 'GOOGLE_AUTH_SCRIPT';
  protected auth2: any;

  constructor() { }

  initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof document !== 'undefined' && !document.getElementById(this.scriptId)) {
        let signInJS = document.createElement('script');

        signInJS.async = true;
        signInJS.src = 'https://apis.google.com/js/platform.js';
        signInJS.onload = () => {
          gapi.load('auth2', () => {
            this.auth2 = gapi.auth2.init({
              client_id: environment.GOOGLE_CLIENT_ID,
              scope: 'email profile'
            });

            this.auth2
              .then(() => {
                resolve();
              })
              .catch((err: any) => {
                reject(err);
              });
          })
        };

        document.head.appendChild(signInJS);
      }
    })
  }

  async signIn(): Promise<SocialUser> {
    if (!this.auth2) {
      throw new Error('Google login library not loaded')
    }
    let resp = await this.auth2.signIn();
    let profile = this.auth2.currentUser.get().getBasicProfile();
    let authResponse = this.auth2.currentUser.get().getAuthResponse(true);
    let user: SocialUser = {
      provider: AUTH_PROVIDERS.GOOGLE,
      id: profile.getId(),
      email: profile.getEmail(),
      name: profile.getName(),
      photoUrl: profile.getImageUrl(),
      firstName: profile.getGivenName(),
      lastName: profile.getFamilyName(),
      authToken: authResponse.access_token,
      idToken: authResponse.id_token
    }
    return user;

  }

}
