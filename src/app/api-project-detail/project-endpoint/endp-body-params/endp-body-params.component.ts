import { EventEmitter, forwardRef, Input, OnDestroy, Output } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { ControlValueAccessor, FormArray, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-endp-body-params',
  templateUrl: './endp-body-params.component.html',
  styleUrls: ['./endp-body-params.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EndpBodyParamsComponent),
      multi: true,
    },
  ],
})
export class EndpBodyParamsComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Output() onChange = new EventEmitter<any>();
  @Input() options: [];

  private destroy: Subject<boolean> = new Subject<boolean>();
  form: FormArray;
  propagateChange: any = () => { };
  propagateTouch: any = () => { };
  emptyItem = {
    key: '',
    type: 'string',
    desc: '',
    required: false
  }

  constructor(private formBuilder: FormBuilder) {
    this.form = this.formBuilder.array([]);
    this.form.valueChanges
      .pipe(takeUntil(this.destroy))
      .subscribe(data => {
        this.onChange.next({ dirty: true });
        this.propagateChange(data)
      })
  }
  writeValue(initialValue: any): void {
    while (this.form.length !== 0) {
      this.form.removeAt(0)
    }
    (initialValue instanceof Array ? initialValue : []).forEach(val => {
      this.form.push(this.newFormItem(val))
    })
  }

  add() {
    this.form.push(this.newFormItem(this.emptyItem))
  }
  remove(index: number) {
    this.form.removeAt(index);
  }

  newFormItem(val): FormGroup {
    return this.formBuilder.group({
      key: [val.key, Validators.required],
      type: [val.type, Validators.required],
      desc: [val.desc],
      required: [val.required]
    })
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.propagateTouch = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    //TODO:
  }
  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }

  ngOnInit(): void {
  }
  trackByFn(index, item) {
    return index;
  }
}
