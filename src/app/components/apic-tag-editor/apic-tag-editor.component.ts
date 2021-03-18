import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  forwardRef,
  EventEmitter,
  Output,
} from '@angular/core';
import {
  FormControl,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { MatChipInputEvent } from '@angular/material/chips';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';

@Component({
  selector: 'apic-tag-editor',
  templateUrl: './apic-tag-editor.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ApicTagEditorComponent),
      multi: true,
    },
  ],
  styleUrls: ['./apic-tag-editor.component.css'],
})
export class ApicTagEditorComponent implements OnInit, ControlValueAccessor {
  @Input()
  suggestions: any[];
  @Input()
  key: string;
  @Input()
  value: string;
  @Input()
  type: string;

  @Output() onAdd = new EventEmitter<any>();
  @Output() onRemove = new EventEmitter<any>();

  propagateChange: any = () => { };
  propagateTouch: any = () => { };

  selectable = true;
  removable = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  inputCtrl = new FormControl();
  selected: any[] = [];

  @ViewChild('auto') matAutocomplete: MatAutocomplete;

  constructor() { }
  writeValue(value: any): void {
    if (value !== undefined) {
      this.selected = value;
    }
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

  add(event: MatChipInputEvent): void {
    const value = event.value;

    if ((value || '').trim()) {
      this.addItem(value.trim());
    }
  }

  remove(item: string): void {
    const index = this.selected.indexOf(item);

    if (index >= 0) {
      this.selected.splice(index, 1);
      this.onRemove.next(item);
    }
  }

  onSelect(event: MatAutocompleteSelectedEvent): void {
    this.addItem(this.inputCtrl.value);
    return;
  }

  addItem(selectedValue) {
    if (this.type === 'string') {
      if (!this.selected.includes(selectedValue))
        this.selected.push(selectedValue);
      this.onAdd.next(selectedValue);
    } else {
      const selectedItem = this.suggestions[selectedValue];
      if (
        selectedItem &&
        !this.selected.find((s) => s[this.key] === selectedValue)
      ) {
        const itemToAdd = {};
        itemToAdd[this.key] = selectedItem[this.key];
        itemToAdd[this.value] = selectedItem[this.value];
        this.selected.push(itemToAdd);
        this.onAdd.next(itemToAdd);
      }
    }
    this.inputCtrl.setValue(null);
    this.propagateChange(this.selected);
  }

  ngOnInit(): void { }
}
