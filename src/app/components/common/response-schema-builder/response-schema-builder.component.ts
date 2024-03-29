import { Toaster } from './../../../services/toaster.service';
import { Component, EventEmitter, forwardRef, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormArray, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { ApiExample, ApiProject, ApiResponse } from 'src/app/models/ApiProject.model';
import { BehaviorSubject, NEVER } from 'rxjs';
import { KVEditorOptn } from '../key-value-editor/key-value-editor.component';
import { Utils } from 'src/app/services/utils.service';
import { debounceTime, switchMap } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

export interface RespSchemaBuilderOptions {
  noDefault200?: boolean,
  allowNamedResp?: boolean,
  disabled?: boolean,
  showOnlySchemaBuilder?: boolean,
  showTestBuilder?: boolean
}

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
  @Input() options: RespSchemaBuilderOptions = {}
  @Output() onTestBuilder = new EventEmitter<number>();

  paused$ = new BehaviorSubject(false);
  allExamples: ApiExample[] = [];
  responses: ApiResponse[] = [];
  propagateChange: any = () => { };
  propagateTouch: any = () => { };
  selectedRespForm: FormGroup;
  selectedResp: ApiResponse;
  newResponseInput: string = '';
  kvOptions: KVEditorOptn = {
    allowCopy: false,
    allowPaste: false,
    allowZeroItem: true,
    valueFieldType: 'select'
  }
  flags = {
    selectedIndex: 0,
    overflowTabsCount: 0,
    selectedRespMimeIndex: 0,
    use$refResponse: false,
    selected$refResponse: ''
  }

  private defaultOptions: RespSchemaBuilderOptions = {
    noDefault200: false,
    allowNamedResp: false,
    disabled: false,
    showOnlySchemaBuilder: false,
    showTestBuilder: false
  }

  constructor(private toaster: Toaster, private fb: FormBuilder) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.project?.currentValue) {
      this.allExamples = Utils.objectValues((changes.project.currentValue as ApiProject).examples);
    }
  }

  writeValue(value: any): void {
    this.responses = value?.length > 0 ? [...value] : [];
    if (this.responses.length === 0 && !this.options.noDefault200) {
      this.responses.push({
        code: '200',
        data: [{
          schema: { type: 'object' },
          mime: 'application/json',
          ...(!this.options.showOnlySchemaBuilder && { examples: [] })
        }],
        ...(!this.options.showOnlySchemaBuilder && { headers: { type: 'object' }, desc: '' })
      });
      setTimeout(() => {
        this.propagateChange(this.responses);
      }, 0);
    }
    this.selectResp(this.responses.length > this.flags.selectedIndex ? this.flags.selectedIndex : 0);
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
    this.buildForm();

    this.flags.overflowTabsCount = Math.floor((window.innerWidth - 416) / 170);
    this.paused$
      .pipe(switchMap(paused => {
        return paused ? NEVER : this.selectedRespForm.valueChanges.pipe(debounceTime(600))
      }))
      .pipe(untilDestroyed(this))
      .subscribe((value: any) => {
        // this.responses [this.selectedIndex] {...this.responses [this.selectedIndex], ...value };
        let newResp = Object.assign([], this.responses, { [this.flags.selectedIndex]: { ...value } });
        if (this.flags.selectedIndex >= 0 && !Utils.deepEquals(newResp, this.selectedResp)) {
          this.responses = newResp;
          this.propagateChange(this.responses)
        }
      });
  }

  selectResp(index) {
    if (this.responses[index]) {
      this.flags.selectedIndex = index;
      this.selectedResp = { ...this.responses[index] }
      this.paused$.next(true);
      let { data, code, noneStatus, importedVia, traitId, importedViaName } = this.responses[index];
      this.selectedRespForm.patchValue({ code, noneStatus, importedVia, traitId, importedViaName });
      if (!this.options.showOnlySchemaBuilder) {
        let { desc, headers } = this.responses[index];
        this.selectedRespForm.patchValue({ desc, headers: (headers || { type: 'object' }) });
      }

      //create form array for the response content types
      this.buildSchemaForm(data);

      if (importedVia === 'NamedResponse') {
        this.flags.use$refResponse = true;
        this.flags.selected$refResponse = importedViaName;
      } else {
        this.flags.use$refResponse = false;
        this.flags.selected$refResponse = '';
      }
      setTimeout(() => {
        this.paused$.next(false);
      }, 1000);
    } else {
      this.selectedRespForm.reset();
      this.flags.selectedIndex = -1;
    }
  }

  buildForm() {
    this.selectedRespForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(100)]],
      data: this.fb.array([]),
      noneStatus: [false],
      importedVia: [null],
      importedViaName: [null],
      traitId: [null],
      ...(!this.options.showOnlySchemaBuilder && {
        headers: [''],
        desc: ['', [Validators.maxLength(500)]],
      })
    })
  }

  buildSchemaForm(data) {
    var respDataForm = this.selectedRespForm.get('data') as FormArray;
    while (respDataForm.length) { respDataForm.removeAt(0) }
    data.forEach((d) => {
      respDataForm.push(this.fb.group({
        schema: [d.schema],
        mime: [d.mime, [Validators.required]],
        ...(!this.options.showOnlySchemaBuilder && {
          examples: [{ value: d.examples, disabled: !!this.selectedResp.importedVia || this.flags.use$refResponse }]
        })
      }))
    })
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
    } else if (!this.newResponseInput.match(/^[a-zA-Z0-9\-\_]+$/)) {
      this.toaster.error('Response name can only contain A-Z a-z 0-9 - _');
      return;
    } else if (this.newResponseInput !== '') {
      code = this.newResponseInput;
    }

    var noneStatus = false;
    if (! /^\d+$/.test(this.newResponseInput)) {
      noneStatus = true;
    }
    if (noneStatus && !this.options.allowNamedResp) {
      this.toaster.error('Please use a status code here like 200 or 404.');
      return;
    }

    if (this.responses.find(r => r.code === this.newResponseInput)) {
      this.toaster.error('Status code already exists.');
      return;
    }

    if (click && this.onChange) this.onChange();

    var resp: ApiResponse = {
      data: [{
        schema: { type: 'object' },
        mime: 'application/json',
        ...(!this.options.showOnlySchemaBuilder && {
          examples: []
        })
      }],
      code: code,
      ...(!this.options.showOnlySchemaBuilder && {
        desc: '',
        headers: { type: 'object' },
      }),
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
    //select next available response
    if (this.responses.length > 0) {
      if (this.responses[index]) this.selectResp(index)
      else this.selectResp(index - 1)
    }
  }

  onRespItemChange(item) {
    this.responses = Object.assign([], this.responses, { [this.flags.selectedIndex]: item });
    this.propagateChange(this.responses)
    if (this.onChange) this.onChange();
  }

  addMime() {
    var respDataForm = this.selectedRespForm.get('data') as FormArray;
    respDataForm.push(this.fb.group({
      schema: [{ type: 'object' }],
      mime: ['*/*'],
      ...(!this.options.showOnlySchemaBuilder && {
        examples: [[]]
      })
    }))
    this.flags.selectedRespMimeIndex = respDataForm.length - 1;
  }

  removeMime(index, $event) {
    $event.stopPropagation();
    if (!this.selectedResp.importedVia) {
      var respDataForm = this.selectedRespForm.get('data') as FormArray;
      respDataForm.removeAt(index);
    }
  }

  on$refRespChange() {
    let { name, data, traitId } = this.responsesModels.find(responses => {
      return responses.name === this.flags.selected$refResponse;
    });
    this.selectedRespForm.patchValue({ importedVia: 'NamedResponse', traitId, importedViaName: name });
    if (!this.options.showOnlySchemaBuilder) {
      let { headers, desc } = this.responsesModels.find(responses => {
        return responses.name === this.flags.selected$refResponse;
      });
      this.selectedRespForm.patchValue({ desc, headers });
    }
    this.buildSchemaForm(data)
  }

  trackByFn(index, item) {
    return item.code;
  }

  openTestBuilder($event) {
    this.onTestBuilder.next($event)
  }

  keyDown($event) {
    $event.stopPropagation();
  }
}
