import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { KeyVal } from 'src/app/models/KeyVal.model';
import { InterpolationService } from 'src/app/services/interpolation.service';
import { RememberService } from 'src/app/services/remember.service';

@Component({
  selector: 'app-bearer-auth',
  templateUrl: './bearer-auth.component.html',
  styleUrls: ['./bearer-auth.component.css']
})
export class BearerAuthComponent implements OnInit {
  @Output() onChange = new EventEmitter<any>();
  @Input() headers: KeyVal[]

  private readonly rememberKey = 'BearerToken';

  token = ''

  constructor(private rememberService: RememberService, private interpolation: InterpolationService) { }

  ngOnInit(): void {
    const lastUsedValue = this.rememberService.get(this.rememberKey);
    //if auth header is present extract value from it
    let authData = this.headers.find(h => h.key.toLocaleLowerCase() === 'authorization')?.val;
    if (authData?.toLocaleLowerCase().startsWith('bearer ')) {
      this.token = authData.substring(6, authData.length).trim();
    } else if (lastUsedValue) {
      this.token = lastUsedValue;
    }

    setTimeout(() => {
      document.getElementById('bearer-token')?.focus();
    }, 0);
  }

  updateAuthHeader() {
    var authData = 'Bearer ' + this.token;
    this.onChange.emit(authData);
    this.rememberService.set(this.rememberKey, this.token);
  }

}
