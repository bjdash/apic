import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { KVEditorOptn } from 'src/app/components/common/key-value-editor/key-value-editor.component';
import { ApiEndp, ApiProject, SecurityDef } from 'src/app/models/ApiProject.model';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';

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
  kvEditorOption: KVEditorOptn = {
    placeholderKey: 'read:todo / write:todo',
    placeholderVal: 'description'
  }
  addPropOption: KVEditorOptn = {
    allowZeroItem: true,
    placeholderKey: 'Property name (must start with x-)',
    placeholderVal: 'Property value'
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
        tokenUrl: [secDef?.oauth2?.tokenUrl || ''],
        scopes: [secDef?.oauth2?.scopes || [{ key: '', val: '' }]],
        flow: [secDef?.oauth2?.flow || 'implicit'],
      }),
      xProperty: [secDef?.xProperty || [{ key: '', val: '' }]]
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
    //Handle already selected secdefs in endpoint, remove them too
    var updatedProj = { ...this.SelectedPROJ, securityDefinitions: this.sanitizeSecDef(this.secDefForm.controls.secDefs.value) };
    let secDefNames = updatedProj.securityDefinitions.map(def => def.name);
    let endpoints: { [key: string]: ApiEndp } = {};
    Utils.objectEntries(this.SelectedPROJ.endpoints).forEach(([id, endpoint]) => {
      endpoints[id] = { ...endpoint, security: (endpoint.security?.filter(s => secDefNames.includes(s.name))) || [] }
    })
    updatedProj = { ...updatedProj, endpoints }
    try {
      await this.updateApiProject(updatedProj);
      this.toaster.success('Security definitions Saved');
      this.onChange.next({ dirty: false });
    } catch (e) {
      this.toaster.error(`Failed to save Security definitions.${e?.message || e || ''}`);
    }
  }

  addDef(): void {
    let secDefs = this.secDefForm.get('secDefs') as FormArray;
    secDefs.push(this.buildSecDefFormItem());
    this.secDefForm.markAsDirty();
  }

  removeSecDef(index: number) {
    (this.secDefForm.get('secDefs') as FormArray).removeAt(index);
    this.secDefForm.markAsDirty();
  }

  validateForm(form: FormGroup) {
    (form.get('secDefs') as FormArray).controls.forEach((fg: FormGroup, index: number) => {
      if (
        (fg.value.type === 'oauth2' && ['implicit', 'accessCode'].includes(fg.value.oauth2.flow) && (!fg.value.oauth2.authorizationUrl || !fg.value.oauth2.authorizationUrl)) ||
        (fg.value.type === 'oauth2' && ['password', 'application', 'accessCode'].includes(fg.value.oauth2.flow) && (!fg.value.oauth2.tokenUrl || !fg.value.oauth2.tokenUrl)) ||
        (fg.value.type === 'apiKey' && !fg.value.apiKey.name)
      ) {
        form.setErrors({ msg: `Missing required parameter for security definition at position ${index + 1}` })
      }
    })
  }

  sanitizeSecDef(secDefs: SecurityDef[]) {
    return secDefs.map(secDef => {
      let sanitized: SecurityDef = {
        type: secDef.type,
        name: secDef.name,
        description: secDef.description,
        xProperty: [...secDef.xProperty]
      }
      if (sanitized.type === 'apiKey') {
        sanitized.apiKey = { ...secDef.apiKey }
      }
      if (sanitized.type === 'oauth2') {
        sanitized.oauth2 = { ...secDef.oauth2 }
      }
      return sanitized;
    })

  }
}
