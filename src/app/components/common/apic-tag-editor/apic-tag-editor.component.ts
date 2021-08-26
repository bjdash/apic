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
  OnChanges,
  SimpleChanges,
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
import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';


/*
APIC tag editor
supports free range tag (strings) entries; type = freeForm
or selecting value from a suggested list; type = strict
autocomplete suggestions provided via suggestions, cab be object, array of objects or array of strings
key: for type = strict, the key to be used to identify selected value in suggestion list, not required if suggestion is array of strings
dispValue: for type = strict, the key to be used to display the suggestion list, not required if suggestion is array of strings

*/
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
export class ApicTagEditorComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input()
  suggestions: any[];
  @Input()
  key: string;
  @Input()
  dispValue: string;
  @Input()
  type: 'strict' | 'freeForm';

  @Output() onAdd = new EventEmitter<any>();
  @Output() onRemove = new EventEmitter<any>();

  propagateChange: any = () => { };
  propagateTouch: any = () => { };

  suggestionsList: any[] = [];
  selectable = true;
  removable = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  inputCtrl = new FormControl();
  filteredSuggestions$: Observable<any>;
  selected: any[] = [];

  @ViewChild('auto') matAutocomplete: MatAutocomplete;

  constructor() { }
  ngOnChanges(changes: SimpleChanges): void {
    if (this.suggestions) {
      this.suggestionsList = this.formatSuggestions();
      this.inputCtrl.setValue('');
    }
  }
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
    if (this.type === 'freeForm') {
      if (!this.selected.includes(selectedValue)) {
        this.selected.push(selectedValue);
        this.onAdd.next(selectedValue);
      }
    } else {
      const selectedItem = this.getSelectedItem(selectedValue);
      if (
        selectedItem &&
        !this.selected.find((s) => this._find(s, selectedValue))
      ) {
        const itemToAdd = typeof selectedItem === 'string' ? selectedItem : { [this.key]: selectedItem[this.key], [this.dispValue]: selectedItem[this.dispValue] };
        this.selected.push(itemToAdd);
        this.onAdd.next(itemToAdd);
      }
    }
    this.inputCtrl.setValue(null);
    this.propagateChange(this.selected);
  }

  getSelectedItem(selectedValue) {
    if (this.suggestions instanceof Array) {
      return this.suggestions.find(s => this._find(s, selectedValue))
    } else {
      return this.suggestions[selectedValue];
    }
  }

  ngOnInit(): void {
    if (this.suggestions) {
      this.suggestionsList = this.formatSuggestions();
      this.filteredSuggestions$ = this.inputCtrl.valueChanges
        .pipe(startWith(''),
          map(value => this._filter(value))
        );
    }

  }

  private _filter(value: string): string[] {
    if (!value) value = '';
    const filterValue = value.toLowerCase();
    return this.suggestionsList.filter(option => {
      if (typeof option === 'string') return option.toLowerCase().includes(filterValue);
      else return option[this.dispValue]?.toLowerCase().includes(filterValue);
    });
  }

  private _find(obj, find) {
    if (typeof obj === 'string') {
      return obj === find
    }
    return obj[this.key] === find
  }

  formatSuggestions() {
    if (!(this.suggestions instanceof Array)) {
      return Object.values(this.suggestions);
    }
    return this.suggestions;
  }
}
