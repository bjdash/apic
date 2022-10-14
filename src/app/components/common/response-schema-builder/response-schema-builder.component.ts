import { Toaster } from './../../../services/toaster.service';
import { Component, EventEmitter, forwardRef, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { ApiExample, ApiProject, ApiResponse } from 'src/app/models/ApiProject.model';
import { BehaviorSubject, NEVER } from 'rxjs';
import { KVEditorOptn } from '../key-value-editor/key-value-editor.component';
import { Utils } from 'src/app/services/utils.service';
import { debounceTime, switchMap } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
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
export class ResponseSchemaBuilderComponent implements OnInit, ControlValueAccessor, OnChanges {
  @Input() onChange: Function;
  @Input() project: ApiProject;
  @Input() responsesModels: any[] = [];
  @Input() noDefault200: boolean
  @Output() onTestBuilder = new EventEmitter<number>();

  paused$ = new BehaviorSubject(false);
  allExamples: ApiExample[] = [];
  selectedIndex: number = -1;
  responses: ApiResponse[] = [];
  propagateChange: any = () => { };
  propagateTouch: any = () => { };
  disabled: boolean = false;
  selectedRespForm: FormGroup;
  selectedResp;
  newResponseInput: string = '';
  kvOptions: KVEditorOptn = {
    allowCopy: false,
    allowPaste: false,
    allowZeroItem: true,
    useSelectForVal: true
  }

  constructor(private toaster: Toaster, private fb: FormBuilder) {
    this.selectedRespForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(100)]],
      data: [''],
      examples: [[]],
      desc: ['', [Validators.maxLength(500)]],
      noneStatus: [false]
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.project?.currentValue) {
      this.allExamples = Utils.objectValues((changes.project.currentValue as ApiProject).examples);
    }
  }

  writeValue(value: any): void {
    this.responses = value?.length > 0 ? [...value] : [];
    if (this.responses.length === 0 && !this.noDefault200) {
      this.responses.push({ code: '200', data: { type: 'object' }, examples: [] });
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
    this.paused$
      .pipe(switchMap(paused => {
        return paused ? NEVER : this.selectedRespForm.valueChanges.pipe(debounceTime(600))
      }))
      .pipe(untilDestroyed(this))
      .subscribe((value: any) => {
        // this.responses [this.selectedIndex] {...this.responses [this.selectedIndex], ...value };
        let newResp = Object.assign([], this.responses, { [this.selectedIndex]: { ...value } });
        if (this.selectedIndex >= 0 && !Utils.deepEquals(newResp, this.selectResp)) {
          this.responses = newResp;
          this.propagateChange(this.responses)
        }
      });
  }

  selectResp(index) {
    if (this.responses[index]) {
      this.selectedIndex = index;
      this.selectedResp = { ...this.responses[index] }
      this.paused$.next(true);
      let { data, examples, code, desc, noneStatus } = this.responses[index];
      this.selectedRespForm.patchValue({ code, data, desc, noneStatus, examples });
      // this.paused$.next(false);
      setTimeout(() => {
        this.paused$.next(false);
      }, 1000);
    } else {
      this.selectedRespForm.reset();
      this.selectedIndex = -1;
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

    var resp: ApiResponse = {
      data: { "type": ["object"] },
      code: code,
      desc: '',
      examples: [],
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
