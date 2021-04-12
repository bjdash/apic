import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { RequestsStateSelector } from 'src/app/state/requests.selector';

@Component({
  selector: 'app-save-req-dialog',
  templateUrl: './save-req-dialog.component.html',
  styleUrls: ['./save-req-dialog.component.css']
})
export class SaveReqDialogComponent implements OnInit {
  @Select(RequestsStateSelector.getFoldersTree) folders$: Observable<any[]>;
  form: FormGroup;

  constructor(fb: FormBuilder,
    private toaster: Toaster,
    @Inject(MAT_DIALOG_DATA) public request: any) {
    this.form = fb.group({
      name: ['', [Validators.required, Validators.maxLength(70)]],
      description: ['', Validators.maxLength(255)],
      parent: ['', Validators.required]
    })
  }

  ngOnInit(): void {
    this.form.patchValue({ name: Utils.urlToReqName(this.request.method, this.request.url) })
  }

  onSubmit() {
    let details = this.form.value;
    if (!details.name) {
      this.toaster.error('Please enter a request name');
      return;
    }
    if (!details.parent) {
      this.toaster.error('Please select a parent folder');
      return;
    }
    console.log(this.form.value, this.request);
  }

  selectFolder(id: string) {
    setTimeout(() => {
      //timeout for ripple to show
      this.form.patchValue({ parent: id });
    }, 0);
  }
}
