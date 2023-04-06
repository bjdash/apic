import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { KVEditorOptn } from 'src/app/components/common/key-value-editor/key-value-editor.component';
import { ApiProject, ApiTag } from 'src/app/models/ApiProject.model';
import { KeyVal } from 'src/app/models/KeyVal.model';
import { Toaster } from 'src/app/services/toaster.service';

@Component({
  selector: 'app-project-tags',
  templateUrl: './project-tags.component.html',
  styleUrls: ['./project-tags.component.scss']
})
export class ProjectTagsComponent implements OnInit, OnChanges {
  @Input() SelectedPROJ: ApiProject;
  @Input() updateApiProject: Function;
  @Output() onChange = new EventEmitter<any>();

  tagsForm: FormGroup;
  addPropOption: KVEditorOptn = {
    allowZeroItem: true,
    placeholderKey: 'Property name (must start with x-)',
    placeholderVal: 'Property value',
    valueFieldType: 'jsonText'
  }

  constructor(private formBuilder: FormBuilder, private toaster: Toaster) {
    this.tagsForm = this.formBuilder.group({
      tags: this.formBuilder.array([])
    });
    this.tagsForm.valueChanges.subscribe(data => {
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
    var tags = this.tagsForm.get('tags') as FormArray;
    while (tags.length) { tags.removeAt(0) };
    this.buildTagsFormItems().forEach(formItem => {
      tags.push(formItem)
    })
    this.tagsForm.patchValue({ tags: (this.SelectedPROJ.tags || []) });
    this.tagsForm.markAsPristine();
    this.onChange.next({ dirty: false });
  }

  buildTagsFormItems() {
    return (this.SelectedPROJ.tags || []).map(tag => {
      return this.buildTagFormItem(tag)
    });
  }

  buildTagFormItem(tag?: ApiTag): FormGroup {
    return this.formBuilder.group({
      name: [tag?.name, [Validators.required]],
      description: [tag?.description || ''],
      externalDocs: this.formBuilder.group({
        url: [tag?.externalDocs?.url || ''],
        description: [tag?.externalDocs?.description || ''],
      }),
      xProperty: [tag?.xProperty || [{ key: '', val: '' }]]
    })
  }

  async saveTags() {
    this.validateForm(this.tagsForm)
    if (this.tagsForm.invalid) {
      if (this.tagsForm.errors?.msg) {
        this.toaster.error(this.tagsForm.errors.msg);
      } else {
        this.toaster.error('Please fill in all required fields');
      }
      return;
    }
    var updatedProj: ApiProject = { ...this.SelectedPROJ, tags: this.sinatizeTags(this.tagsForm.controls.tags.value) };

    try {
      await this.updateApiProject(updatedProj);
      this.toaster.success('Tags Saved');
      this.onChange.next({ dirty: false });
    } catch (e) {
      this.toaster.error(`Failed to save tags.${e?.message || e || ''}`);
    }
  }

  validateForm(form: FormGroup) {
    (form.get('tags') as FormArray).controls.forEach((fg: FormGroup, index: number) => {
      if (fg.value.externalDocs?.description && !fg.value.externalDocs?.url) {
        form.setErrors({ msg: `Url must be specified for external doc when description is present at position ${index + 1}` })
      }
      if (fg.value.xProperty?.length > 0) {
        fg.value.xProperty.forEach((kv: KeyVal) => {
          if (kv.key?.length > 0 && !kv.key.startsWith('x-')) {
            form.setErrors({ msg: `Additional x-property must start with 'x-' at position ${index + 1}` })
          }
        })
      }
    });

    let tags: string[] = (form.get('tags') as FormArray).value.map(v => v.name);
    tags.forEach((tag, i) => {
      if (tags.indexOf(tag) < i) {
        //duplicate found
        form.setErrors({ msg: `Found duplicate tag name ${tag}` })
      }
    })
  }

  sinatizeTags(tags: ApiTag[]): ApiTag[] {
    return tags.map(tag => {
      let sanitized: ApiTag = {
        name: tag.name,
        description: tag.description,
        xProperty: [...tag.xProperty]
      }
      if (tag.externalDocs?.url) {
        sanitized.externalDocs = { ...tag.externalDocs }
      }
      return sanitized;
    })
  }

  addTag(): void {
    let tags = this.tagsForm.get('tags') as FormArray;
    tags.push(this.buildTagFormItem());
    this.tagsForm.markAsDirty();
  }

  removeTag(index: number) {
    (this.tagsForm.get('tags') as FormArray).removeAt(index);
    this.tagsForm.markAsDirty();
  }
}
