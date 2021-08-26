import { Component, forwardRef, Input, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface TreeSelectorOptn {
  disableParent?: boolean,
  showChildren?: boolean,
  displayName?: string,
  childrenKey?: string,
  addRoot?: boolean
}

@Component({
  selector: 'apic-tree-selector',
  templateUrl: './tree-selector.component.html',
  styleUrls: ['./tree-selector.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TreeSelectorComponent),
      multi: true,
    },
  ],
})
export class TreeSelectorComponent implements OnInit, ControlValueAccessor {
  @Input() type: 'array' | 'object';
  @Input() items;
  @Input() options: TreeSelectorOptn;
  propagateChange: any = () => { };
  propagateTouch: any = () => { };

  private defaultOptions: TreeSelectorOptn = {
    disableParent: false, displayName: 'name', childrenKey: 'children', showChildren: false, addRoot: false
  }
  selectedId: string;
  disabled = false;

  constructor() { }
  writeValue(value: any): void {
    this.selectedId = value;
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
    if (!this.type) this.type = 'array';
    this.options = { ...this.defaultOptions, ...this.options }
  }

  select(item) {
    this.selectedId = item._id;
    this.propagateChange(this.selectedId);
  }

  trackByFn(index, item) {
    return index;
  }
}
