import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { Toaster } from 'src/app/services/toaster.service';
import { pairwise, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-project-endpoint',
  templateUrl: './project-endpoint.component.html',
  styleUrls: ['../api-project-detail.component.css'],
})
export class ProjectEndpointComponent implements OnInit {
  @Input() selectedPROJ: ApiProject;
  @Input() updateApiProject: Function;
  @Output() projectUpdated = new EventEmitter<any>();

  selectedEndp: string = 'NEW';
  selectedName: string;
  endpForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private toaster: Toaster,
    private confirmService: ConfirmService
  ) {
    this.endpForm = this.fb.group({
      summary: ['', [Validators.required, Validators.maxLength(255)]],
      path: ['', [Validators.required]],
      method: ['get'],
      folder: [''],
      traits: [[]],
      tags: [[]],
    });
    this.selectedName = 'Create new Endpoint';
  }

  ngOnInit(): void {}

  selectEndp(endpId: string) {
    console.log('selecting endpoint: ', endpId);
    if (this.endpForm.dirty) {
      this.confirmService
        .confirm({
          confirmTitle: 'Unsaved data !',
          confirm:
            'The Endpoints view has some unsaved data. Do you want to replace it with your current selection?',
          confirmOk: 'Replace',
          confirmCancel: 'No, let me save',
        })
        .then(() => {
          this.handleEndpSelect(endpId);
        })
        .catch(() => {
          console.log('Selected to keep the changes');
        });
    } else {
      this.handleEndpSelect(endpId);
    }
  }

  private handleEndpSelect(endpId: string) {
    this.selectedEndp = endpId;
    if (endpId === 'NEW') {
      this.endpForm = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(100)]],
        nameSpace: ['', [Validators.required, Validators.maxLength(100)]],
        folder: [''],
        data: [{ type: 'object' }],
      });
      this.selectedName = 'Create new Endpoint';
    } else {
      const { name, nameSpace, folder, data } = this.selectedPROJ.endpoints[
        endpId
      ];
      this.endpForm = this.fb.group({
        name: [name, [Validators.required, Validators.maxLength(100)]],
        nameSpace: [nameSpace, Validators.maxLength(100)],
        folder: [folder],
        data: [data],
      });
      this.selectedName = name;
      this.endpForm.markAsPristine();
      this.endpForm.markAsUntouched();
    }
  }

  createEndp() {
    console.log(this.endpForm);
  }

  checkForPathParams() {}

  importTraitData(arg) {
    console.log(arg);
  }

  removeTraitData(arg) {
    console.log(arg);
  }
}
