import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { InterpolationService } from 'src/app/services/interpolation.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import md5 from 'crypto-js/md5';
import { RememberService } from 'src/app/services/remember.service';

@Component({
  selector: 'app-digest-auth',
  templateUrl: './digest-auth.component.html',
  styleUrls: []
})
export class DigestAuthComponent implements OnInit {
  @Output() onChange = new EventEmitter<any>();
  @Input() url: string;
  @Input() method: string;

  private readonly rememberKey = 'DigestAuth';

  form: FormGroup;
  showPsd = false;
  constructor(fb: FormBuilder, private interpolationService: InterpolationService, private toaster: Toaster, private rememberService: RememberService) {
    this.form = fb.group({
      userName: [''],
      password: [''],
      realm: [''],
      algorithm: ['MD5'],
      nonce: [''],
      nonceCount: [''],
      clientNonce: [''],
      qop: [''],
      opaque: [''],
    })
  }

  ngOnInit(): void {
    this.form.patchValue(this.rememberService.get(this.rememberKey))
  }
  updateAuthHeader() {
    let formValue = this.interpolationService.interpolateObject({ ...this.form.value });
    let { algorithm, userName, realm, password, nonce, nonceCount, clientNonce, opaque, qop } = formValue;
    let uri = '';

    if (this.url) {
      var parsedURL = Utils.parseURL(this.url);
      if (parsedURL) {
        uri = parsedURL.pathname + parsedURL.search;
      } else {
        uri = this.url.substring(this.url.indexOf('/'), this.url.length);
      }
    } else {
      this.toaster.error('Please enter a url.');
      return;
    }

    var A0, A1, A2, hashA1, hashA2, reqDigest, headerParams;

    if (algorithm === 'MD5-sess') {
      A0 = md5(userName + ':' + realm + ':' + password).toString();
      A1 = A0 + ':' + nonce + ':' + clientNonce;
    } else {
      A1 = userName + ':' + realm + ':' + password;
    }

    if (qop === 'auth-int') {
      // Cannot be implemented here.
      this.toaster.error('Digest Auth with "qop": "auth-int" is not supported.');
    } else {
      A2 = this.method + ':' + uri;
    }

    hashA1 = md5(A1).toString();
    hashA2 = md5(A2).toString();

    if (qop === 'auth' || qop === 'auth-int') {
      reqDigest = md5([hashA1, nonce, nonceCount, clientNonce, qop, hashA2].join(':')).toString();
    } else {
      reqDigest = md5([hashA1, nonce, hashA2].join(':')).toString();
    }

    headerParams = ['username="' + userName + '"',
    'realm="' + realm + '"',
    'nonce="' + nonce + '"',
    'uri="' + uri + '"'
    ];

    if (qop === 'auth' || qop === 'auth-int') {
      headerParams.push('qop=' + qop);
    }

    if (qop === 'auth' || qop === 'auth-int' || algorithm === 'MD5-sess') {
      headerParams.push('nc=' + nonceCount);
      headerParams.push('cnonce="' + clientNonce + '"');
    }

    headerParams.push('response="' + reqDigest + '"');
    headerParams.push('opaque="' + opaque + '"');

    this.onChange.emit('Digest ' + headerParams.join(', '));
    this.rememberService.set(this.rememberKey, { ...this.form.value });
  }
}
