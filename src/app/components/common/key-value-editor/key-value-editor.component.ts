import { Component, forwardRef, Input, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, FormArray, FormBuilder, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, NEVER, Observable, Subject } from 'rxjs';
import { Subscription, timer } from 'rxjs';
import { debounce, delay, map, startWith, takeUntil, switchMap, debounceTime } from 'rxjs/operators';
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
  autocompletes?: string[],
  disabled?: boolean,
  valueFieldType?: 'plainText' | 'richText' | 'select' | 'fullEditor' | 'fileAndText' | 'jsonText',
  extraInfo?: {
    show: (value: KeyVal) => boolean,
    icon: string,
    tooltip: string,
    link?: string
  }
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
    autocompletes: [],
    disabled: false,
    valueFieldType: 'plainText'
  }
  keyValueForm: FormArray;
  focusedIndex: number = 0;
  private _destroy = new Subject<boolean>();
  filteredOptions$: Observable<string[]>;
  paused$ = new BehaviorSubject(false);
  changeSubscription: Subscription

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
    this.paused$.next(true);
    while (this.keyValueForm.length !== 0) {
      this.keyValueForm.removeAt(0)
    }
    this.buildForm(initialValue, true).forEach(form => this.keyValueForm.push(form));
    this.paused$.next(false);
    if (!this.changeSubscription || this.changeSubscription.closed) {
      this.changeSubscription = this.paused$
        .pipe(takeUntil(this._destroy))
        .pipe(switchMap(paused => {
          return paused ? NEVER : this.keyValueForm.valueChanges.pipe(debounceTime(600))
        }))
        .pipe(debounce(() => timer(200)))
        .subscribe((data: KeyVal[]) => {
          if (this.options.valueFieldType === 'jsonText') {
            data = data.map(d => {
              let jsonVal = d.val;
              if (d.type === 'json') {
                try {
                  jsonVal = JSON.parse(jsonVal)
                } catch (e) { }
              }
              return { ...d, val: jsonVal }
            })
          }
          this.propagateChange(data)
        })
    }
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

  buildForm(initialValue: KeyVal[], pausePropagation?: boolean) {
    return initialValue.map(kv => {
      let val = kv.val;
      let type = 'text';
      if (this.options.valueFieldType === 'jsonText') {
        if (typeof kv.val !== 'string') {
          try {
            val = JSON.stringify(val, null, '\t');
            type = 'json';
          } catch (e) {

          }
        }
      }

      return this.fb.group({
        key: { value: kv.key || '', disabled: !!kv.readOnly },
        val: { value: val || '', disabled: !!kv.readOnly },
        type: { value: type, disabled: !!kv.readOnly },
        //if checkbox is enabled and kv pair doesnt have an active property then set it to true by default
        ...(this.options.allowToggle && { active: { value: kv.hasOwnProperty('active') ? kv.active : true, disabled: !!kv.readOnly } }),
        ...(this.options.valueFieldType === 'fileAndText' && {
          type: { value: kv.type || 'text', disabled: !!kv.readOnly }
        }),
        ...((this.options.valueFieldType === 'fileAndText' || kv.meta) && {
          meta: { value: kv.meta, disabled: !!kv.readOnly }
        }),

      })
    });
  }

  addKv() {
    this.keyValueForm.push(this.fb.group({
      key: [''],
      val: [''],
      ...(this.options.valueFieldType && { type: ['json'] }),
      ...(this.options.allowToggle && { active: [true] }),
      ...(this.options.valueFieldType === 'fileAndText' && { type: ['text'], meta: [null] }),
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
      ...(this.options.valueFieldType === 'fileAndText' && { type: kvPair.type, meta: null }),
    };
    this.utils.copyToClipboard(JSON.stringify(copyText));
  }
  async pasteKV(index: number) {
    var text = await navigator.clipboard.readText();
    var pair = JSON.parse(text);
    this.keyValueForm.at(index).patchValue(pair);
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

  toggleAceType(index, type) {
    this.keyValueForm.at(index).patchValue({ type });
    this.keyValueForm.updateValueAndValidity({ onlySelf: false, emitEvent: true });
  }
}
