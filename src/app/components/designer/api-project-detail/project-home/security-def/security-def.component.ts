import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { KVEditorOptn } from 'src/app/components/common/key-value-editor/key-value-editor.component';
import { ApiProject, SecurityDef } from 'src/app/models/ApiProject.model';
import { Toaster } from 'src/app/services/toaster.service';

@Component({
  selector: 'app-security-def',
  templateUrl: './security-def.component.html',
  styleUrls: ['./security-def.component.css']
})
export class SecurityDefComponent implements OnInit, OnChanges {
  @Input() SelectedPROJ: ApiProject;
  @Input() updateApiProject: Function;
  @Output() onChange = new EventEmitter<any>();

  secDefForm: FormGroup;
  secDefs: FormArray;
  kvEditorOption: KVEditorOptn = {
    placeholderKey: 'read:todo / write:todo',
    placeholderVal: 'description'
  }

  constructor(private formBuilder: FormBuilder, private toaster: Toaster) {
    this.secDefForm = this.formBuilder.group({
      secDefs: this.formBuilder.array([])
    });
    this.secDefForm.valueChanges.subscribe(data => {
      this.onChange.next({ dirty: true });
    })
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.SelectedPROJ) {
      setTimeout(() => {
        this.refreshForm();
      }, 0);
    }
  }

  ngOnInit(): void {
    this.refreshForm();
  }

  refreshForm() {
    var secDefs = this.secDefForm.get('secDefs') as FormArray;
    while (secDefs.length) { secDefs.removeAt(0) };
    this.buildSecDefFormItems().forEach(formItem => {
      secDefs.push(formItem)
    })
    this.secDefForm.patchValue({ secDefs: (this.SelectedPROJ.securityDefinitions || []) });
    this.secDefForm.markAsPristine();
    this.onChange.next({ dirty: false });
  }

  buildSecDefFormItems() {
    return (this.SelectedPROJ.securityDefinitions || []).map(secDef => {
      return this.buildSecDefFormItem(secDef)
    });
  }

  buildSecDefFormItem(secDef?: SecurityDef): FormGroup {
    return this.formBuilder.group({
      type: [secDef?.type || 'basic', [Validators.required]],
      name: [secDef?.name || '', [Validators.required]],
      description: [secDef?.description || ''],
      apiKey: this.formBuilder.group({
        name: [secDef?.apiKey?.name || ''],
        in: [secDef?.apiKey?.in || 'header']
      }),
      oauth2: this.formBuilder.group({
        authorizationUrl: [secDef?.oauth2?.authorizationUrl || ''],
        scopes: [secDef?.oauth2?.scopes || [{ key: '', val: '' }]],
        flow: [secDef?.oauth2?.flow || ''],
      })
    })
  }

  async saveSecDef() {
    this.validateForm(this.secDefForm)
    if (this.secDefForm.invalid) {
      if (this.secDefForm.errors?.msg) {
        this.toaster.error(this.secDefForm.errors.msg);
      } else {
        this.toaster.error('Please fill in all required fields');
      }
      return;
    }
    //TODO: Handle already selected secdefs in endpoint, remove them too
    var prevSecDef = this.SelectedPROJ.securityDefinitions;
    var updatedProj = { ...this.SelectedPROJ, securityDefinitions: this.secDefForm.controls.secDefs.value }
    try {
      await this.updateApiProject(updatedProj);
      this.toaster.success('Security definitions Saved');
      this.onChange.next({ dirty: false });
    } catch (e) {
      this.toaster.error('Failed to save Security definitions.');
      this.SelectedPROJ.securityDefinitions = prevSecDef;
    }
  }

  addDef(): void {
    this.secDefs = this.secDefForm.get('secDefs') as FormArray;
    this.secDefs.push(this.buildSecDefFormItem());
    this.secDefForm.markAsDirty();
  }

  removeSecDef(index: number) {
    (this.secDefForm.get('secDefs') as FormArray).removeAt(index);
    this.secDefForm.markAsDirty();
  }

  validateForm(form: FormGroup) {
    (form.get('secDefs') as FormArray).controls.forEach((fg: FormGroup, index: number) => {
      if (
        (fg.value.type === 'oauth2' && (!fg.value.oauth2.authorizationUrl || !fg.value.oauth2.authorizationUrl)) ||
        (fg.value.type === 'apiKey' && !fg.value.apiKey.name)
      ) {
        form.setErrors({ msg: `Missing required parameter for security definition at position ${index + 1}` })
      }
    })
  }
}
