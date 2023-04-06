import { Component, EventEmitter, forwardRef, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { ControlValueAccessor, FormArray, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, Validators } from "@angular/forms";
import { UntilDestroy, untilDestroyed } from "@ngneat/until-destroy";
import { BehaviorSubject, NEVER } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";
import { ApiExample, ApiProject, EndpBody } from "src/app/models/ApiProject.model";
import { Toaster } from "src/app/services/toaster.service";
import { Utils } from "src/app/services/utils.service";
import { KVEditorOptn } from "../key-value-editor/key-value-editor.component";

@UntilDestroy()
@Component({
  selector: 'media-type-schema-builder',
  templateUrl: './media-type-schema-builder.html',
  styleUrls: ['./media-type-schema-builder.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MediaTypeSchemaBuilderComponent),
    multi: true
  }]
})
export class MediaTypeSchemaBuilderComponent implements OnInit, ControlValueAccessor, OnChanges {
  @Input() project: ApiProject;
  @Output() onChange = new EventEmitter<any>();

  paused$ = new BehaviorSubject(false);
  allExamples: ApiExample[] = [];
  propagateChange: any = () => { };
  propagateTouch: any = () => { };
  schemaForm: FormGroup;
  lastPushedValue: EndpBody;
  kvOptions: KVEditorOptn = {
    allowCopy: false,
    allowPaste: false,
    allowZeroItem: true,
    valueFieldType: 'select'

  }
  flags = {
    overflowTabsCount: 0,
    selectMimeIndex: 0
  }

  constructor(private toaster: Toaster, private fb: FormBuilder) {
    this.schemaForm = this.fb.group({
      data: this.fb.array([]),
      desc: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.project?.currentValue) {
      this.allExamples = Utils.objectValues((changes.project.currentValue as ApiProject).examples);
    }
  }

  writeValue(value: any): void {
    if (!value.data) value.data = [];
    if (!Utils.deepEquals(this.lastPushedValue, value)) {
      this.paused$.next(true);
      this.lastPushedValue = value;
      this.buildSchemaForm(value);
      this.paused$.next(false)
    }
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.propagateTouch = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
  }

  ngOnInit(): void {
    this.flags.overflowTabsCount = Math.floor((window.innerWidth - 416) / 170);
    this.paused$
      .pipe(switchMap(paused => {
        return paused ? NEVER : this.schemaForm.valueChanges.pipe(debounceTime(600))
      }))
      .pipe(untilDestroyed(this))
      .subscribe((value: any) => {
        if (!Utils.deepEquals(this.lastPushedValue, value)) {
          this.propagateChange(value);
          this.lastPushedValue = value;
        }
      });
  }


  buildSchemaForm(body: EndpBody) {
    this.schemaForm.patchValue({ desc: body.desc });
    var bodySchemas = this.schemaForm.get('data') as FormArray;
    while (bodySchemas.length) { bodySchemas.removeAt(0) }
    body.data.forEach((d, index) => {
      bodySchemas.push(this.fb.group({
        schema: [d.schema],
        mime: [d.mime, [Validators.required]],
        examples: [d.examples]
      }))
    })
  }

  addMime(mimeType: '*/*' | 'multipart/form-data' | 'application/x-www-form-urlencoded') {
    let mime: string = mimeType;
    var respDataForm = this.schemaForm.get('data') as FormArray;
    if (mimeType === '*/*' && respDataForm.length === 0) {
      mime = 'application/json';
    }
    respDataForm.push(this.fb.group({
      schema: (mime === 'multipart/form-data' || mime === 'application/x-www-form-urlencoded') ? [[{ key: '', type: 'string', desc: '', required: false }]] : [{ type: 'object' }],
      mime,
      examples: [[]]
    }))
    this.flags.selectMimeIndex = respDataForm.length - 1;
  }

  removeMime(index, $event) {
    $event.stopPropagation();
    var formArray = this.schemaForm.get('data') as FormArray;
    formArray.removeAt(index);
  }

  onSchemaUpdate() {
    this.propagateChange(this.schemaForm.value);
    this.onChange.next();
  }

  trackByFn(index, item) {
    return item.code;
  }

  keyDown($event) {
    $event.stopPropagation();
  }
}
