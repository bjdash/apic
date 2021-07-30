import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InterpolationService } from 'src/app/services/interpolation.service';
import { RememberService } from 'src/app/services/remember.service';
import { Toaster } from 'src/app/services/toaster.service';
import { HawkAuthUtil } from 'src/app/utils/HawkAuth.util';

@Component({
  selector: 'app-hawk-auth',
  templateUrl: './hawk-auth.component.html',
  styleUrls: []
})
export class HawkAuthComponent implements OnInit {
  @Output() onChange = new EventEmitter<any>();
  @Input() url: string;
  @Input() method: string;

  private readonly rememberKey = 'JawkAuth';
  form: FormGroup;
  constructor(fb: FormBuilder, private interpolationService: InterpolationService, private toaster: Toaster, private rememberService: RememberService) {
    this.form = fb.group({
      id: ['', [Validators.required]],
      key: [''],
      algorithm: ['sha1'],
      nonce: [''],
      timestamp: [''],
      ext: [''],
      app: [''],
      dlg: ['']
    })
  }

  ngOnInit(): void {
    this.form.patchValue(this.rememberService.get(this.rememberKey))
  }

  updateAuthHeader() {
    let formValue = this.interpolationService.interpolateObject({ ...this.form.value });
    const { id, key, algorithm, nonce, timestamp, ext, app, dlg } = formValue;
    var credentials = { id, key, algorithm };
    var options = { credentials, nonce, timestamp, ext, app, dlg };

    try {
      let hawk = HawkAuthUtil.header(this.url, this.method, options);
      this.onChange.next(hawk.header)
    } catch (e) {
      this.toaster.error(e);
    }

    this.rememberService.set(this.rememberKey, { ...this.form.value });
  }
}
