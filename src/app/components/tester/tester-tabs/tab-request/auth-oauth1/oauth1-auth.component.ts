import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { KeyVal } from 'src/app/models/KeyVal.model';
import { ReqAuthMsg } from 'src/app/models/ReqAuthMsg.model';
import { InterpolationService } from 'src/app/services/interpolation.service';
import { RememberService } from 'src/app/services/remember.service';
import { Toaster } from 'src/app/services/toaster.service';
import { METHOD_WITH_BODY } from 'src/app/utils/constants';
import { OAuth1Util } from 'src/app/utils/OAuth1.util';
import { RequestUtils } from 'src/app/utils/request.util';

@Component({
  selector: 'app-oauth1-auth',
  templateUrl: './oauth1-auth.component.html',
  styleUrls: []
})
export class Oauth1AuthComponent implements OnInit {
  @Output() onChange = new EventEmitter<ReqAuthMsg>();
  @Input() method: string;
  @Input() url: string;
  @Input() body: { type: string, xForms: KeyVal[], formData: KeyVal[] }

  private readonly rememberKey = 'O1Auth';

  form: FormGroup;
  constructor(fb: FormBuilder, private interpolationService: InterpolationService, private toaster: Toaster, private rememberService: RememberService) {
    this.form = fb.group({
      consumerKey: ['', [Validators.required]],
      addToHeader: [false],
      consumerSecret: ['', [Validators.required]],
      encode: [false],
      token: [''],
      tokenSecret: [''],
      signature: ['HMAC-SHA1'],
      timestamp: [''],
      nonce: [''],
      version: ['1.0'],
      relm: [''],
    })
  }

  ngOnInit(): void {
    this.form.patchValue(this.rememberService.get(this.rememberKey))
  }

  updateAuthHeader() {
    let formValue = this.interpolationService.interpolateObject({ ...this.form.value });
    const { consumerKey, addToHeader, consumerSecret, encode, token, tokenSecret, signature, timestamp, nonce, version, relm } = formValue;
    let secrets = {
      consumerSecret: consumerSecret,
      tokenSecret: tokenSecret
    };
    var message = {
      action: this.url ? RequestUtils.checkForHTTP(this.url.split('?')[0]) : '',
      method: this.method,
      parameters: [
        ['oauth_consumer_key', consumerKey],
        ['oauth_token', token],
        ['oauth_signature_method', signature],
        ['oauth_timestamp', timestamp],
        ['oauth_nonce', nonce],
        ['oauth_version', version]
      ]
    };

    var oAuthProps = ['oauth_consumer_key', 'oauth_token', 'oauth_signature_method', 'oauth_timestamp', 'oauth_nonce', 'oauth_version', 'oauth_signature'];

    //check if methode can have body
    if (METHOD_WITH_BODY.indexOf(this.method) >= 0) {
      if (this.body.type === 'form-data') {
        //formData: [{key: '', val: '', type: 'Text/File'}]
        for (var j = 0; j < this.body.formData.length; j++) {
          var key = this.body.formData[j].key,
            val = '',
            type = this.body.formData[j].type;
          if (type === 'text') {
            val = this.body.formData[j].val;
          } else {
            var file = this.body.formData[j].meta;
            if (file) {
              val = file.name;
            }
          }
          if (key && key.trim() !== '' && val && val.trim() !== '') {
            message.parameters.push([key, val]);
          }
        }
      } else if (this.body.type === 'x-www-form-urlencoded') {
        for (var j = 0; j < this.body.xForms.length; j++) {
          var key = this.body.xForms[j].key,
            val = this.body.xForms[j].val;
          if (key && key.trim() !== '' && val && val.trim() !== '') {
            message.parameters.push([key, val]);
          }
        }
      }
    }

    var authSignature = OAuth1Util.sign(message, secrets, signature);
    if (authSignature === null) {
      this.toaster.error('Failed to generate auth signature');
      return;
    }
    if (encode) {
      authSignature = encodeURIComponent(authSignature);
    }

    if (addToHeader) {//add token as header
      var realm = relm;
      var header = 'OAuth ';

      if (realm && realm.trim() !== '') {
        header += 'realm="' + encodeURIComponent(realm) + '",';
      }

      for (var i = 0; i < message.parameters.length; i++) {
        var value = message.parameters[i][1];
        if (value == null || value.trim() == '') {
          continue;
        }
        header += encodeURIComponent(message.parameters[i][0]) + '="' + encodeURIComponent(value) + '",';
      }

      header = header.substring(0, header.length - 1);
      this.onChange.next({
        addTo: 'header',
        value: [{ key: 'Authorization', val: header }]
      })
    } else {//add to query parameter or body based on http method type
      //add auth params as form-data or x-www-form or query params
      let params: KeyVal[] = message.parameters
        .filter(p => oAuthProps.indexOf(p[0]) >= 0)
        .map(p => {
          return { key: p[0], val: p[1], type: 'text', active: true }
        })

      this.onChange.next({
        addTo: 'body',
        value: params
      })
    }

    this.rememberService.set(this.rememberKey, { ...this.form.value });
  }
}
