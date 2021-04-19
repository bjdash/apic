import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { KeyVal } from 'src/app/models/KeyVal.model';
import { InterpolationService } from 'src/app/services/interpolation.service';
import { RememberService } from 'src/app/services/remember.service';

@Component({
  selector: 'app-basic-auth',
  templateUrl: './basic-auth.component.html'
})
export class BasicAuthComponent implements OnInit {
  @Output() onChange = new EventEmitter<any>();
  @Input() headers: KeyVal[]

  private readonly rememberKey = 'BasicAuth';

  models = {
    user: '',
    password: '',
    showPsd: false
  }

  constructor(private rememberService: RememberService, private interpolation: InterpolationService) { }

  ngOnInit(): void {
    const lastUsedValue = this.rememberService.get(this.rememberKey);
    //if auth header is present extract value from it
    let authData = this.headers.find(h => h.key.toLocaleLowerCase() === 'authorization')?.val;
    if (authData?.toLocaleLowerCase().startsWith('basic ')) {
      authData = authData.substring(5, authData.length).trim();
      let parts = window.atob(authData).split(':');
      this.models.user = parts[0];
      this.models.password = parts[1];
    } else if (lastUsedValue) {
      this.models.user = lastUsedValue.user;
      this.models.password = lastUsedValue.password;
    }

    setTimeout(() => {
      document.getElementById('basic-auth-uname')?.focus();
    }, 0);
  }

  updateAuthHeader() {
    const { user, password } = this.models;
    // if username or password contain a variable then preserve it to be used with environment
    // else generate the base64 encoded string
    let authdata;
    if (this.interpolation.hasVariables(user) || this.interpolation.hasVariables(password)) {
      authdata = `Basic {{apic.base64Encode(${user}, ${password})}}`; //TODO
    } else {
      authdata = 'Basic ' + window.btoa(user + ':' + password);
    }
    this.onChange.emit(authdata);
    this.rememberService.set(this.rememberKey, { user, password });
  }
}
