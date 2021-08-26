import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReqAuthMsg } from 'src/app/models/ReqAuthMsg.model';
import { InterpolationService } from 'src/app/services/interpolation.service';
import { RememberService } from 'src/app/services/remember.service';

@Component({
  selector: 'app-api-key-auth',
  templateUrl: './api-key-auth.component.html',
  styleUrls: []
})
export class ApiKeyAuthComponent implements OnInit {
  @Output() onChange = new EventEmitter<ReqAuthMsg>();
  form: FormGroup;
  private readonly rememberKey = 'ApiKeyAuth';

  constructor(fb: FormBuilder, private rememberService: RememberService, private interpolation: InterpolationService) {
    this.form = fb.group({
      key: ['', [Validators.required]],
      val: ['', [Validators.required]],
      addTo: ['header']
    })
  }

  ngOnInit(): void {
    this.form.patchValue(this.rememberService.get(this.rememberKey))
  }

  updateAuthHeader() {
    let formValue: any = this.interpolation.interpolateObject({ ...this.form.value });
    const { key, val, addTo }: { key: string, val: string, addTo: 'header' | 'query' } = formValue;

    this.onChange.emit({
      addTo,
      value: [{
        key,
        val,
        active: true
      }]
    });
    this.rememberService.set(this.rememberKey, { ...this.form.value });
  }
}
