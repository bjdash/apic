import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { KVEditorOptn } from 'src/app/components/key-value-editor/key-value-editor.component';
import { ApiProject, SecurityDef } from 'src/app/models/ApiProject.model';
import { Toaster } from 'src/app/services/toaster.service';

@Component({
  selector: 'app-security-def',
  templateUrl: './security-def.component.html',
  styleUrls: ['./security-def.component.css']
})
export class SecurityDefComponent implements OnInit {
  @Input() SelectedPROJ: ApiProject;
  @Input() updateApiProject: Function;
  @Output() onChange = new EventEmitter<any>();

  currentSecDefs: SecurityDef[] = [];
  secDefForm: FormGroup;
  secDefs: FormArray;
  kvEditorOption: KVEditorOptn = {
    placeholderKey: 'read:todo / write:todo',
    placeholderVal: 'description'
  }

  constructor(private formBuilder: FormBuilder, private toaster: Toaster) {

  }

  ngOnInit(): void {
    this.currentSecDefs = this.SelectedPROJ.securityDefinitions || [];

    this.secDefForm = this.formBuilder.group({
      secDefs: this.formBuilder.array(this.buildForm())
    });

    this.secDefForm.valueChanges.subscribe(data => {
      this.onChange.next({ dirty: true });
    })
  }

  buildForm() {
    return this.currentSecDefs.map(secDef => {
      return this.buildSecDefFormItem(secDef)
    });
  }

  buildSecDefFormItem(secDef?: SecurityDef): FormGroup {
    return this.formBuilder.group({
      type: [secDef?.type || 'basic', Validators.required],
      name: [secDef?.name || '', [Validators.required]],
      description: [secDef?.description || ''],
      apiKey: this.formBuilder.group({
        name: [secDef?.apiKey?.name || '', [this.requiredValidator('apiKey')]],
        in: [secDef?.apiKey?.in || 'header']
      }),
      oauth2: this.formBuilder.group({
        authorizationUrl: [secDef?.oauth2?.authorizationUrl || '', [this.requiredValidator('oauth2')]],
        scopes: [secDef?.oauth2?.scopes || [{ key: '', val: '' }]],
        flow: [secDef?.oauth2?.flow || '', [this.requiredValidator('oauth2')]],
      })
    })
  }

  saveSecDef() {
    if (this.secDefForm.invalid) {
      this.toaster.error('Please fill in all required fields');
      return;
    }
    //TODO: Handle already selected secdefs in endpoint, remove them too
    var prevSecDef = this.SelectedPROJ.securityDefinitions;
    this.SelectedPROJ.securityDefinitions = this.secDefForm.controls.secDefs.value;
    this.updateApiProject(this.SelectedPROJ).then(() => {
      this.toaster.success('Security definitions Saved');
      this.currentSecDefs = this.SelectedPROJ.securityDefinitions;
      this.onChange.next({ dirty: false });
      this.secDefForm.markAsPristine();
    }, () => {
      this.toaster.error('Failed to save Security definitions.');
      this.SelectedPROJ.securityDefinitions = prevSecDef;
    });
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

  discard() {
    var secDefs = this.secDefForm.get('secDefs') as FormArray;
    while (secDefs.length) { secDefs.removeAt(0) };
    this.buildForm().forEach(formItem => {
      secDefs.push(formItem)
    })
    this.secDefForm.patchValue({ secDefs: this.currentSecDefs });
    this.secDefForm.markAsPristine();
    this.onChange.next({ dirty: false });
  }

  requiredValidator(type: string) {
    return (control: AbstractControl) => {
      if (control.parent?.parent.value.type == type && !control.value) return { required: true }
      return null;
    }
  }
}
