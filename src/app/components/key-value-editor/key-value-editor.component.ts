import { Component, forwardRef, Input, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, FormArray, FormBuilder, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { debounce } from 'rxjs/operators';
import { KeyVal } from 'src/app/models/KeyVal.model';
import Utils from 'src/app/services/utils.service';

export interface KVEditorOptn {
  allowCopy?: boolean,
  allowPaste?: boolean,
  allowAdd?: boolean,
  allowRemove?: boolean,
  placeholderKey?: string,
  placeholderVal?: string
}

@Component({
  selector: 'app-key-value-editor',
  templateUrl: './key-value-editor.component.html',
  styleUrls: ['./key-value-editor.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KeyValueEditorComponent),
      multi: true,
    },
  ],
})
export class KeyValueEditorComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input()
  options: KVEditorOptn;
  private defaultOptions: KVEditorOptn = {
    allowAdd: true, allowRemove: true, allowCopy: true, allowPaste: true, placeholderKey: 'Key', placeholderVal: 'Value'
  }
  keyValueForm: FormArray;
  subscription: Subscription;

  propagateChange: any = () => { };
  propagateTouch: any = () => { };

  constructor(private fb: FormBuilder, private utils: Utils,) {

  }
  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  writeValue(initialValue: KeyVal[]): void {
    if (!initialValue || initialValue.length === 0) {
      initialValue = [{ key: '', val: '' }]
    }

    this.keyValueForm = this.fb.array(this.buildForm(initialValue));
    if (this.subscription?.unsubscribe) {
      this.subscription.unsubscribe();
    }
    this.keyValueForm.valueChanges.pipe(debounce(() => timer(200))).subscribe(data => {
      this.propagateChange(data)
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

  ngOnInit(): void {
    this.options = { ...this.defaultOptions, ...this.options }
  }

  buildForm(initialValue: KeyVal[]) {
    return initialValue.map(kv => {
      return this.fb.group({
        key: [kv.key || ''],
        val: [kv.val || '']
      })
    });
  }

  addKv() {
    this.keyValueForm.push(this.fb.group({
      key: [''],
      val: ['']
    }))
  }

  removeKv(index: number) {
    this.keyValueForm.removeAt(index);
  }

  copyKV(index: number) {
    var kvPair = this.keyValueForm.at(index).value;
    var copyText = {
      key: kvPair.key,
      val: kvPair.val
    };
    this.utils.copyToClipboard(JSON.stringify(copyText));
  }
  async pasteKV(index: number) {
    var text = await navigator.clipboard.readText();
    var pair = JSON.parse(text);
    this.keyValueForm.at(index).setValue(pair);
  }

  trackByFn(index, item) {
    return index;
  }
}
