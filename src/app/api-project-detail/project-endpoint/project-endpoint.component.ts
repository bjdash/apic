import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApiEndp, ApiProject, NewApiEndp } from 'src/app/models/ApiProject.model';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { Toaster } from 'src/app/services/toaster.service';
import { MIMEs } from 'src/app/utils/constants';

@Component({
  selector: 'app-project-endpoint',
  templateUrl: './project-endpoint.component.html',
  styleUrls: ['../api-project-detail.component.css'],
})
export class ProjectEndpointComponent implements OnInit {
  @Input() selectedPROJ: ApiProject;
  @Input() updateApiProject: Function;

  schemesSugg = [{ key: 'http', val: 'HTTP' }, { key: 'https', val: 'HTTPS' }, { key: 'ws', val: 'ws' }, { key: 'wss', val: 'wss' }];
  MIMEs = MIMEs;
  selectedEndp: ApiEndp;
  selectedName: string;
  endpForm: FormGroup;
  flags = {
    allOptn: true
  }

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
      security: [[]],
      operationId: ['', [Validators.maxLength(30)]],
      schemes: [[]],
      consumes: [[]],
      produces: [[]],
      description: [''],
      pathParams: [{ type: 'object' }],
      queryParams: [{ type: 'object' }],
      headers: [{ type: 'object' }],
      responses: [[]],
      postrun: [''],
      prerun: [''],
    });
    this.selectedName = 'Create new Endpoint';
  }

  ngOnInit(): void { }

  openNewEndp() {
    this.openEndp(NewApiEndp);
  }

  openEndpById(endpIdToOpen: string) {
    const endp: ApiEndp = this.selectedPROJ?.endpoints?.[endpIdToOpen] || NewApiEndp;
    this.openEndp(endp)
  }

  openEndp(endpToOpen: ApiEndp) {
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
          this.handleEndpSelect(endpToOpen);
        })
        .catch(() => {
          console.info('Selected to keep the changes');
        });
    } else {
      this.handleEndpSelect(endpToOpen);
    }
  }

  private handleEndpSelect(endpToOpen: ApiEndp) {
    this.selectedEndp = { ...endpToOpen };
    let { summary, path, method, folder, traits, tags, security, operationId, schemes, consumes, produces, description, pathParams, queryParams, headers, responses, postrun, prerun } = endpToOpen;
    if (!folder) folder = '';
    this.endpForm.patchValue({ summary, path, method, folder, traits, tags, security, operationId, schemes, consumes, produces, description, pathParams, queryParams, headers, responses, postrun, prerun });
    this.selectedName = summary || 'Create new trait';
    this.endpForm.markAsPristine();
    this.endpForm.markAsUntouched();
    // this.addDefaultResponse();

  }

  createEndp() {
  }

  checkForPathParams() { }

  importTraitData(arg) {
  }

  removeTraitData(arg) {
  }
}
