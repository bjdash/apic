import { Component, EventEmitter, forwardRef, Input, OnInit, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Toaster } from 'src/app/services/toaster.service';

export interface ApicListItem {
  isActive: boolean,
  name: string,
  isReadonly?: boolean
}
@Component({
  selector: 'apic-list',
  templateUrl: './apic-list.component.html',
  styleUrls: ['./apic-list.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ApicListComponent),
    multi: true
  }]
})
export class ApicListComponent implements OnInit, ControlValueAccessor {
  @Input() label: string;
  @Output() onToggle = new EventEmitter<ApicListItem>()
  @Output() onRemove = new EventEmitter<ApicListItem>()
  @Output() onAdd = new EventEmitter<ApicListItem>()
  items: ApicListItem[] = [];
  newItem: string = ''
  isDisabled: boolean = false

  private _onChange = (_: ApicListItem[]) => { };
  private _onTouched = () => { };

  constructor(private toaster: Toaster) { }
  writeValue(obj: ApicListItem[]): void {
    this.items = obj || [];
  }
  registerOnChange(fn: any): void {
    this._onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
  toggle(i) {
    this.onToggle.next(this.items[i]);
    this._onChange(this.items)
  }
  remove(i: number) {
    this.onRemove.next(this.items[i])
    this.items.splice(i, 1);
    this._onChange(this.items)
  }
  add() {
    let existing = this.items.find(i => i.name === this.newItem);
    if (existing) {
      this.toaster.error('Entry with the same name already exists.');
      return;
    }
    let newItem = {
      isActive: true,
      isReadonly: false,
      name: this.newItem
    }
    this.newItem = ''
    this.items.push(newItem);
    this._onChange(this.items)
    this.onAdd.next(newItem)
  }
  ngOnInit(): void {
  }

  trackByIndex(index, item) {
    return index
  }

}
