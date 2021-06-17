import { Component, OnInit, Input, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { ApiEndp, ApiProject, ApiTrait, NewApiEndp } from 'src/app/models/ApiProject.model';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { Toaster } from 'src/app/services/toaster.service';
import { MIMEs } from 'src/app/utils/constants';
import { Utils } from 'src/app/services/utils.service';
import apic from 'src/app/utils/apic';

@Component({
  selector: 'app-project-endpoint',
  templateUrl: './project-endpoint.component.html',
  styleUrls: ['../api-project-detail.component.css'],
})
export class ProjectEndpointComponent implements OnInit, OnChanges {
  @Input() selectedPROJ: ApiProject;
  @Input() updateApiProject: Function;

  schemesSugg = [{ key: 'http', val: 'HTTP' }, { key: 'https', val: 'HTTPS' }, { key: 'ws', val: 'ws' }, { key: 'wss', val: 'wss' }];
  MIMEs = MIMEs;
  selectedEndp: ApiEndp;
  selectedName: string;
  endpForm: FormGroup;
  flags = {
    allOptn: true,
    path: true,
    body: true,
    query: true,
    header: true,
    resp: true,
    test: true,
    more: true,
    traitQP: [], //query params from trait
    traitHP: [] //header params from trait
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
      operationId: ['', [Validators.maxLength(255)]],
      schemes: [[]],
      consumes: [[]],
      produces: [[]],
      description: [''],
      pathParams: [{ type: 'object' }],
      queryParams: [{ type: 'object' }],
      headers: [{ type: 'object' }],
      responses: [[{ code: '200', data: { type: 'object' } }]],
      body: fb.group({
        type: [''],
        data: ['']
      }),
      postrun: [''],
      prerun: [''],
    });

    this.openNewEndp();
  }

  ngOnInit(): void { }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.selectedPROJ?.currentValue && this.selectedEndp) {
      setTimeout(() => {
        this.openEndpById(this.selectedEndp._id)
      }, 0);
    }
  }

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
    let { summary, path, method, folder, traits, tags, security, operationId, schemes, consumes, produces, description, pathParams, queryParams, headers, body, responses, postrun, prerun } = endpToOpen;
    if (!folder) folder = '';
    this.endpForm.patchValue({ summary, path, method, folder, traits: [...traits], tags: [...tags], security: [...(security || [])], operationId, schemes: [...schemes], consumes: [...consumes], produces: [...produces], description, pathParams, queryParams, headers, body: { ...body }, responses: [...responses], postrun, prerun });
    this.selectedName = summary || 'Create new endpoint';

    this.flags.traitQP = [];
    this.flags.traitHP = [];
    if (traits?.length > 0) {
      traits.forEach((t: ApiTrait) => this.importTraitData(t._id, t.name))
    }

    this.addDefaultResponse();
    this.endpForm.markAsPristine();
    this.endpForm.markAsUntouched();
  }

  createEndp(allowDup?: boolean) {

    if (!this.endpForm.valid) return;
    let endp: ApiEndp = { ...this.endpForm.value, _id: this.isEditing() ? this.selectedEndp._id : new Date().getTime() + apic.s8(), };

    if (this.checkExistingEndp(endp.summary) && !this.isEditing() && !allowDup) {
      this.toaster.error('Endpoint ' + endp.summary + ' already exists');
      return;
    }

    //remove the trait data added before we save it
    endp.traits?.forEach(t => {
      endp = this.removeTraitData(t._id, endp);
    });

    var projToUpdate: ApiProject = { ...this.selectedPROJ, endpoints: { ...this.selectedPROJ.endpoints, [endp._id]: endp } };
    this.updateApiProject(projToUpdate).then(() => {
      this.endpForm.markAsPristine();
      this.endpForm.markAsUntouched();
      this.selectedName = endp.summary;

      if (this.isEditing()) {
        this.toaster.success('Endpoint updated');
      } else {
        this.toaster.success('Endpoint created');
      }
      this.selectedEndp._id = endp._id;
    }, (e) => {
      console.error('Failed to create/update endpoint', e, endp);
      this.toaster.error(`Failed to create/update endpoint: ${e.message}`);
    }
    );

  }

  checkForPathParams() {
    var path = this.endpForm.value.path, error = false;
    if (path.indexOf('?') >= 0) {
      this.toaster.error("Query params can't be added here to the path property. Add them in Query Params section below.")
      this.endpForm.patchValue({ path: path.replace(/\?/g, '') });
      return;
    }

    var params = [],
      rxp = /{([^}]+)}/g,
      curMatch;

    while (curMatch = rxp.exec(path)) {
      var match = curMatch[1];
      if (match.match(/^[a-z0-9_]+$/i)) {
        params.push(match);
      } else {
        error = true;
      }
    }

    if (error) {
      this.toaster.warn('Path params should be alpha numeric and can only contain underscore (_). There are few in the url those are not. Please correct.');
    }

    // let pathParams = { ...this.endpForm.value.pathParams };
    let pathParams = { type: "object", properties: {}, required: [] }
    if (!pathParams.properties) pathParams.properties = {};
    if (!pathParams.required) pathParams.required = [];
    params.forEach(p => {
      if (!pathParams.properties[p]) {
        pathParams.properties[p] = { "type": "string" };
        pathParams.required.push(p)
      };
    })
    //TODO: Preserve params imported from trait
    this.endpForm.patchValue({ pathParams })


  }

  importTraitData(traitId, name) {
    if (!traitId) return;
    var trait: ApiTrait = this.selectedPROJ.traits[traitId];
    if (!trait) return;
    //add responses from trait
    let responses = [...this.endpForm.value.responses];
    trait.responses?.forEach(resp => {
      if (!resp.noneStatus) {
        responses.push({ ...resp, fromTrait: true, traitId, traitName: name })
      }
    })
    this.endpForm.patchValue({ responses });

    //add path params from trait
    let currentPathParams = this.endpForm.value.pathParams;
    this.endpForm.patchValue({
      pathParams: {
        ...currentPathParams,
        properties: {
          ...currentPathParams.properties,
          ...trait.pathParams.properties
        },
        required: [...(currentPathParams.required || []), ...(trait.pathParams.required || [])]
      }
    });

    // //add query params from trait
    let currentQueryParams = this.endpForm.value.queryParams;
    this.flags.traitQP = [...this.flags.traitQP, ...Utils.objectKeys(trait.queryParams.properties)]
    this.endpForm.patchValue({
      queryParams: {
        ...currentQueryParams,
        properties: {
          ...currentQueryParams.properties,
          ...trait.queryParams.properties
        },
        required: [...(currentQueryParams.required || []), ...(trait.queryParams.required || [])]
      }
    });

    // //add headers from trait
    let currentHeaders = this.endpForm.value.headers;
    this.flags.traitHP = [...this.flags.traitHP, ...Utils.objectKeys(trait.headers.properties)]
    this.endpForm.patchValue({
      headers: {
        ...currentHeaders,
        properties: {
          ...currentHeaders.properties,
          ...trait.headers.properties
        },
        required: [...(currentHeaders.required || []), ...(trait.headers.required || [])]
      }
    });
  }

  removeTraitData(traitId: string, endpoint: ApiEndp) {
    if (!traitId) return;
    // if (!endpoint) {
    //   //if endpoint is provided then remove from that otherwise remove from selected endpoint
    //   endpoint = { ...this.endpForm.value };
    // }

    // remove responses from endpoint belonging to this trait
    let responses = endpoint.responses.filter(resp => resp.traitId !== traitId);

    var trait: ApiTrait = this.selectedPROJ.traits[traitId];

    //remove path params
    let pathParams = { ...endpoint.pathParams }
    let traitPathParams = Utils.objectKeys(trait.pathParams?.properties);
    traitPathParams.forEach(p => {
      delete pathParams.properties[p];
      pathParams.required = pathParams.required.filter(r => r != p)
    })

    //remove headers
    let headers = { ...endpoint.headers }
    let traitHeaders = Utils.objectKeys(trait.headers?.properties);
    traitHeaders.forEach(p => {
      delete headers.properties[p];
      headers.required = headers.required.filter(r => r != p)
    })

    //remove query params
    let queryParams = { ...endpoint.queryParams }
    let traitqueryParams = Utils.objectKeys(trait.queryParams?.properties);
    traitqueryParams.forEach(p => {
      delete queryParams.properties[p];
      queryParams.required = queryParams.required.filter(r => r != p)
    })

    return { ...endpoint, responses, pathParams, headers, queryParams };
  }

  onTraitRemove(traitId: string) {
    let { responses, pathParams, headers, queryParams } = this.removeTraitData(traitId, this.endpForm.value);
    this.endpForm.patchValue({ responses, pathParams, headers, queryParams });
  }

  duplicateEndp(id: string) {
    var toCopy: ApiEndp = { ...this.selectedPROJ.endpoints[id] };
    toCopy._id = apic.s12();
    while (this.checkExistingEndp(toCopy.summary)) {
      var counter = parseInt(toCopy.summary.charAt(toCopy.summary.length - 1));
      var numberAtEnd = true;
      if (isNaN(counter)) {
        counter = 0;
        numberAtEnd = false;
      }
      counter++;
      toCopy.summary =
        (numberAtEnd
          ? toCopy.summary.substring(0, toCopy.summary.length - 1)
          : toCopy.summary
        ).trim() +
        ' ' +
        counter;
    }
    let project: ApiProject = { ...this.selectedPROJ, endpoints: { ...this.selectedPROJ.endpoints, [toCopy._id]: toCopy } }
    this.updateApiProject(project).then(() => {
      this.toaster.success('Duplicate endpoint ' + toCopy.summary + ' created.');
    });
  }

  deleteEndp(endpId: string) {
    if (!endpId || !this.selectedPROJ.endpoints) return;

    const { [endpId]: toRemove, ...remaining } = this.selectedPROJ.endpoints;
    let project: ApiProject = { ...this.selectedPROJ, endpoints: remaining }

    this.confirmService
      .confirm({
        confirmTitle: 'Delete Confirmation',
        confirm: `Do you want to delete the endpoint '${toRemove.summary}'?`,
        confirmOk: 'Delete',
        confirmCancel: 'Cancel',
      })
      .then(() => {
        delete project.endpoints[endpId];
        this.updateApiProject(project).then(
          () => {
            this.toaster.success('Endpoint deleted.');
            this.endpForm.markAsPristine();
            if (endpId === this.selectedEndp._id) {
              this.openNewEndp();
            }
          },
          (e) => {
            console.error('Failed to delete endpoint', e);
            this.toaster.error(`Failed to delete endpoint: ${e.message}`);
          }
        );
      });
  }

  addDefaultResponse() {
    if (this.endpForm.controls['responses'].value.length === 0) {
      this.endpForm.patchValue({
        responses: [{
          code: '200',
          data: { "type": ["object"] },
          desc: '',
          noneStatus: false
        }]
      })
    }
  }

  resetBodyType(type) {
    if (type !== this.endpForm.value.body?.type) {
      switch (type) {
        case 'raw':
          setTimeout(() => {
            this.endpForm.patchValue({ body: { data: { type: 'object' } } })
          }, 0);
          break;
        case 'x-www-form-urlencoded':
        case 'form-data':
          setTimeout(() => {
            this.endpForm.patchValue({ body: { data: [] } })
          }, 0);
      }
    }
  }

  discardChange() {
    this.endpForm.markAsPristine();
    this.openEndp(this.selectedEndp);
  }

  setDirty() {
    this.endpForm.markAsDirty();
  }

  prerunUpdated(newVal) {
    if (newVal != this.endpForm.value.prerun) {
      this.endpForm.patchValue({ prerun: newVal });
      this.setDirty();
    }
  }

  postrunUpdated(newVal) {
    if (newVal != this.endpForm.value.postrun) {
      this.endpForm.patchValue({ postrun: newVal });
      this.setDirty();
    }
  }

  checkExistingEndp(name: string) {
    if (!name) return false;

    return this.selectedPROJ?.endpoints && Object.values(this.selectedPROJ.endpoints).find((e: ApiEndp) => e.summary.toLowerCase() ===
      name.toLowerCase()) !== undefined;
  }

  isEditing() {
    return !(this.selectedEndp._id === 'NEW');
  }

  trackByFn(index, item) {
    return index;
  }

  run(id: string) {
    //TODO: 
  }

  //TODO: Add option to add test from  response schema builder: open test builder
}
