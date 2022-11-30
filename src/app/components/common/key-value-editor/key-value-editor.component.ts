import { Component, forwardRef, Input, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, FormArray, FormBuilder, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { Subscription, timer } from 'rxjs';
import { debounce, delay, map, startWith, takeUntil, tap } from 'rxjs/operators';
import { KeyVal } from 'src/app/models/KeyVal.model';
import { Utils } from 'src/app/services/utils.service';

export interface KVEditorOptn {
  allowCopy?: boolean,
  allowPaste?: boolean,
  allowAdd?: boolean,
  allowZeroItem?: boolean,
  allowRemove?: boolean,
  addOnFocus?: boolean,
  allowToggle?: boolean,
  placeholderKey?: string,
  placeholderVal?: string,
  enableAutocomplete?: boolean,
  allowFileType?: boolean,
  useRichText?: false,
  autocompletes?: string[],
  useSelectForVal?: boolean,
  disabled?:boolean
}

@Component({
  selector: 'app-key-value-editor',
  templateUrl: './key-value-editor.component.html',
  styleUrls: ['./key-value-editor.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KeyValueEditorComponent),
      multi: true,
    },
  ],
})
export class KeyValueEditorComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() options: KVEditorOptn;
  @Input() valueOptions: any[] = [];

  private defaultOptions: KVEditorOptn = {
    allowAdd: true,
    allowZeroItem: false,
    allowRemove: true,
    allowCopy: true,
    allowPaste: true,
    allowToggle: false,
    addOnFocus: false,
    placeholderKey: 'Key',
    placeholderVal: 'Value',
    enableAutocomplete: false,
    allowFileType: false,
    useRichText: false,
    autocompletes: [],
    useSelectForVal: false,
    disabled:false
  }
  keyValueForm: FormArray;
  focusedIndex: number = 0;
  private _destroy = new Subject<boolean>();
  filteredOptions$: Observable<string[]>;

  propagateChange: any = () => { };
  propagateTouch: any = () => { };

  constructor(private fb: FormBuilder, private utils: Utils,) {
    this.keyValueForm = this.fb.array([]);
  }
  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();
  }

  writeValue(initialValue: KeyVal[]): void {
    if (!initialValue || initialValue.length === 0) {
      if (this.options.allowZeroItem) {
        initialValue = []
      } else {
        initialValue = [{ key: '', val: '', ...(this.options.allowToggle && { active: true }) }]
      }
    }
    while (this.keyValueForm.length !== 0) {
      this.keyValueForm.removeAt(0)
    }
    this.buildForm(initialValue).forEach(form => this.keyValueForm.push(form));
    // this.keyValueForm = this.fb.array();
    this.keyValueForm.valueChanges
      .pipe(takeUntil(this._destroy))
      .pipe(debounce(() => timer(200)))
      .subscribe(data => {
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
    this.options.disabled = isDisabled;
  }

  ngOnInit(): void {
    this.options = { ...this.defaultOptions, ...this.options };
    if (this.options.enableAutocomplete) {
      //TODO: Update filtered on focus too
      this.filteredOptions$ = this.keyValueForm.valueChanges
        .pipe(takeUntil(this._destroy))
        .pipe(
          delay(0),
          startWith([{ key: '' }]),
          map(value => this._filter(value))
        );
    }
  }

  private _filter(formValue: KeyVal[]): string[] {
    let value = formValue[this.focusedIndex]?.key;
    if (!value) return this.options.autocompletes;
    const filterValue = value.toLowerCase();
    return this.options.autocompletes.filter(option => option.toLowerCase().indexOf(filterValue) === 0);
  }

  buildForm(initialValue: KeyVal[]) {
    return initialValue.map(kv => {
      return this.fb.group({
        key: [kv.key || ''],
        val: [kv.val || ''],
        //if checkbox is enabled and kv pair doesnt have an active property then set it to true by default
        ...(this.options.allowToggle && { active: [kv.hasOwnProperty('active') ? kv.active : true] }),
        ...(this.options.allowFileType && { type: [kv.type || 'text'], meta: [kv.meta] })
      })
    });
  }

  addKv() {
    this.keyValueForm.push(this.fb.group({
      key: [''],
      val: [''],
      ...(this.options.allowToggle && { active: [true] }),
      ...(this.options.allowFileType && { type: ['text'], meta: [null] }),
    }))
  }

  onRowFocus(isLast: boolean, index: number) {
    this.focusedIndex = index;
    //add new row if last
    if (this.options.addOnFocus && isLast) {
      this.addKv();
    }
  }

  removeKv(index: number) {
    this.keyValueForm.removeAt(index);
  }

  copyKV(index: number) {
    var kvPair: KeyVal = this.keyValueForm.at(index).value;
    var copyText = {
      key: kvPair.key,
      val: kvPair.val,
      ...(this.options.allowToggle && { active: kvPair.active }),
      ...(this.options.allowFileType && { type: kvPair.type, meta: null }),
    };
    this.utils.copyToClipboard(JSON.stringify(copyText));
  }
  async pasteKV(index: number) {
    var text = await navigator.clipboard.readText();
    var pair = JSON.parse(text);
    this.keyValueForm.at(index).setValue(pair);
  }

  onFileChange(event, index: number) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      let value: KeyVal = this.keyValueForm.at(index).value;
      this.keyValueForm.at(index).setValue({ ...value, val: '', meta: file });
    }
  }

  trackByFn(index, item) {
    return index;
  }
}
