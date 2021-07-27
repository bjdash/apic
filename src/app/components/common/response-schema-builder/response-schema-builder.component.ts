import { Toaster } from './../../../services/toaster.service';
import { Component, EventEmitter, forwardRef, Input, OnInit, Output } from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';

@Component({
  selector: 'response-schema-builder',
  templateUrl: './response-schema-builder.component.html',
  styleUrls: ['./response-schema-builder.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ResponseSchemaBuilderComponent),
      multi: true,
    },
  ],
})
export class ResponseSchemaBuilderComponent implements OnInit, ControlValueAccessor {
  @Input() onChange: Function;
  @Input() models: any;
  @Input() responsesModels: any[] = [];
  @Output()
  onTestBuilder = new EventEmitter<number>()

  selectedIndex: number = -1;
  responses: any[] = [];
  propagateChange: any = () => { };
  propagateTouch: any = () => { };
  disabled: boolean = false;
  selectedRespForm: FormGroup;
  selectedResp;
  newResponseInput: string = '';

  constructor(private toaster: Toaster, private fb: FormBuilder) {
    this.selectedRespForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(100)]],
      data: [''],
      desc: ['', [Validators.maxLength(500)]],
      noneStatus: [false]
    })
  }
  writeValue(value: any): void {
    this.responses = value?.length > 0 ? [...value] : [];
    if (this.responses.length === 0) {
      this.responses.push({ code: '200', data: { type: 'object' } });
      setTimeout(() => {
        this.propagateChange(this.responses);
      }, 0);
    }
    this.selectResp(0);
  }
  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.propagateTouch = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  ngOnInit(): void {
    this.selectedRespForm.valueChanges.subscribe(value => {
      this.responses[this.selectedIndex] = { ...this.responses[this.selectedIndex], ...value };
      this.propagateChange(this.responses)
    });
  }

  selectResp(index) {
    if (this.responses[index]) {
      this.selectedIndex = index;
      this.selectedResp = { ...this.responses[index] }
      //TODO: this line marks the main endp form as dirty just by switching between different resp codes
      //because of this.selectedRespForm.valueChanges.subscribe in nginit
      this.selectedRespForm.patchValue({ ...this.responses[index] });
    }
  }

  onSchemaUpdate() {
    if (this.onChange) this.onChange();
    this.propagateChange(this.responses)
  }

  addResp(code, click: boolean, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.newResponseInput === '' && code === undefined) {
      this.toaster.error('Please enter a status code');
      return;
    } else if (this.newResponseInput !== '') {
      code = this.newResponseInput;
    }

    var noneStatus = false;
    if (! /^\d+$/.test(this.newResponseInput)) {
      noneStatus = true;
    }

    if (this.responses.find(r => r.code === this.newResponseInput)) {
      this.toaster.error('Status code already exists.');
      return;
    }

    if (click && this.onChange) this.onChange();

    var resp = {
      data: { "type": ["object"] },
      code: code,
      desc: '',
      noneStatus: noneStatus
    };
    this.responses.push(resp);
    this.propagateChange(this.responses);
    this.selectResp(this.responses.length - 1);
    this.newResponseInput = '';
  }

  removeResp(index) {
    this.responses.splice(index, 1);
    this.propagateChange(this.responses);
  }

  trackByFn(index, item) {
    return item.code;
  }

  openTestBuilder($event) {
    this.onTestBuilder.next($event)
  }
}
