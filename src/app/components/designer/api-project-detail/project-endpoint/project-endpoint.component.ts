import { Component, OnInit, Input, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ApiEndp, ApiProject, ApiTrait, NewApiEndp } from 'src/app/models/ApiProject.model';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { Toaster } from 'src/app/services/toaster.service';
import { METHOD_WITH_BODY, MIMEs } from 'src/app/utils/constants';
import { Utils } from 'src/app/services/utils.service';
import apic from 'src/app/utils/apic';
import { Subject } from 'rxjs';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { ApiProjectDetailService } from '../api-project-detail.service';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { ApiProjectUtils } from 'src/app/utils/ApiProject.utils';
import { TestBuilderOption } from 'src/app/models/TestBuilderOption.model';
import { TestBuilderSave } from 'src/app/components/common/json-test-builder/json-test-builder.component';

@Component({
  selector: 'app-project-endpoint',
  templateUrl: './project-endpoint.component.html',
  styleUrls: ['../api-project-detail.component.css'],
})
export class ProjectEndpointComponent implements OnInit, OnDestroy {
  selectedPROJ: ApiProject;
  selectedEndp: ApiEndp;
  endpForm: FormGroup;
  private _destroy: Subject<boolean> = new Subject<boolean>();
  testBuilderOpt: TestBuilderOption = null;

  schemesSugg = [{ key: 'http', val: 'HTTP' }, { key: 'https', val: 'HTTPS' }, { key: 'ws', val: 'ws' }, { key: 'wss', val: 'wss' }];
  MIMEs = MIMEs;
  METHOD_WITH_BODY = METHOD_WITH_BODY;
  flags = {
    allOptn: true,
    more: true,
    traitQP: [], //query params from trait
    traitHP: [] //header params from trait
  }

  constructor(
    private fb: FormBuilder,
    private toaster: Toaster,
    private confirmService: ConfirmService,
    private apiProjService: ApiProjectService,
    private apiProjectDetailService: ApiProjectDetailService,
    private route: ActivatedRoute,
    private router: Router
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

    this.apiProjectDetailService.onSelectedProj$
      .pipe(takeUntil(this._destroy))
      .subscribe(project => {
        this.selectedPROJ = project;
        if (this.selectedEndp) {
          this.handleEndpSelect(this.selectedEndp._id);
        }
      })

    this.route.params
      .pipe(takeUntil(this._destroy))
      .subscribe(({ endpId }) => {
        this.handleEndpSelect(endpId);
      })
  }

  private handleEndpSelect(endpId: string) {
    this.selectedEndp = this.selectedPROJ?.endpoints?.[endpId];
    if (!this.selectedEndp) {
      if (endpId?.toLocaleLowerCase() !== 'NEW'.toLocaleLowerCase()) {
        // this.toaster.warn('Selected folder doesn\'t exist.');
        this.router.navigate(['../', 'new'], { relativeTo: this.route });
        return;
      } else {
        this.selectedEndp = NewApiEndp;
      }
    }

    this.flags.traitQP = [];
    this.flags.traitHP = [];
    let processedEndp = { ...this.selectedEndp }
    if (this.selectedEndp.traits?.length > 0) {
      this.selectedEndp.traits.forEach((t: ApiTrait) => {
        processedEndp = ApiProjectUtils.importTraitData(t._id, this.selectedEndp, this.selectedPROJ);
        this.flags.traitQP = [...this.flags.traitQP, ...ApiProjectUtils.getTraitQueryParamNames(t._id, this.selectedPROJ)]
        this.flags.traitHP = [...this.flags.traitHP, ...ApiProjectUtils.getTraitHeaderNames(t._id, this.selectedPROJ)]
      })
    }

    let { summary, path, method, folder, traits, tags, security, operationId, schemes, consumes, produces, description, pathParams, queryParams, headers, body, responses, postrun, prerun } = processedEndp;
    if (!folder) folder = '';
    this.endpForm.patchValue({ summary, path, method, folder, traits: [...traits], tags: [...tags], security: [...(security || [])], operationId, schemes: [...schemes], consumes: [...consumes], produces: [...produces], description, pathParams, queryParams, headers, body: { ...body }, responses: [...responses], postrun, prerun });

    this.addDefaultResponse();
    this.endpForm.markAsPristine();
    this.endpForm.markAsUntouched();
  }

  async createEndp(allowDup?: boolean) {
    if (!this.endpForm.valid) return;
    let endp: ApiEndp = { ...this.endpForm.value, _id: this.isEditing() ? this.selectedEndp._id : new Date().getTime() + apic.s8(), };

    if (this.checkExistingEndp(endp.summary) && !this.isEditing() && !allowDup) {
      this.toaster.error('Endpoint ' + endp.summary + ' already exists');
      return;
    }

    //remove the trait data added before we save it
    endp.traits?.forEach(t => {
      endp = ApiProjectUtils.removeTraitData(t._id, endp, this.selectedPROJ);
    });

    var projToUpdate: ApiProject = { ...this.selectedPROJ, endpoints: { ...this.selectedPROJ.endpoints, [endp._id]: endp } };
    try {
      await this.apiProjService.updateAPIProject(projToUpdate)
      this.endpForm.markAsPristine();
      this.endpForm.markAsUntouched();

      if (this.isEditing()) {
        this.toaster.success('Endpoint updated.');
        this.selectedEndp = endp;
      } else {
        this.toaster.success('Endpoint created.');
        this.router.navigate(['../', endp._id], { relativeTo: this.route })
      }

    } catch (e) {
      console.error('Failed to create/update endpoint', e, endp);
      this.toaster.error(`Failed to create/update endpoint: ${e?.message || e || ''}`);
    }
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

  importTraitData(traitId) {
    let endp: ApiEndp = { ...this.endpForm.value, _id: this.isEditing() ? this.selectedEndp._id : new Date().getTime() + apic.s8() };
    endp = ApiProjectUtils.importTraitData(traitId, endp, this.selectedPROJ);
    let { pathParams, queryParams, headers, responses } = endp;
    this.endpForm.patchValue({ pathParams, queryParams, headers, responses })
    this.flags.traitQP = [...this.flags.traitQP, ...ApiProjectUtils.getTraitQueryParamNames(traitId, this.selectedPROJ)]
    this.flags.traitHP = [...this.flags.traitHP, ...ApiProjectUtils.getTraitHeaderNames(traitId, this.selectedPROJ)]
  }

  onTraitRemove(traitId: string) {
    let { responses, pathParams, headers, queryParams } = ApiProjectUtils.removeTraitData(traitId, this.endpForm.value, this.selectedPROJ);
    this.endpForm.patchValue({ responses, pathParams, headers, queryParams });
  }

  async duplicateEndp(id: string) {
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
    try {
      await this.apiProjService.updateAPIProject(project)
      this.toaster.success('Duplicate endpoint ' + toCopy.summary + ' created.');
    } catch (e) {
      this.toaster.error(`Failed to duplicate: ${e?.message || e || ''}`);
    }
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
      .then(async () => {
        delete project.endpoints[endpId];
        try {
          await this.apiProjService.updateAPIProject(project)
          this.toaster.success('Endpoint deleted.');
          this.endpForm.markAsPristine();
          this.router.navigate(['../', 'new'], { relativeTo: this.route })
        } catch (e) {
          console.error('Failed to delete endpoint', e);
          this.toaster.error(`Failed to delete endpoint: ${e?.message || e || ''}`);

        }
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
    this.handleEndpSelect(this.selectedEndp._id)
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

  canDeactivate() {
    return new Promise<boolean>((resolve) => {
      if (this.endpForm.dirty) {
        this.confirmService.confirm({
          confirmTitle: 'Unsaved data !',
          confirm: 'Endpoint view has some unsaved data. Current action will discard any unsave changes.',
          confirmOk: 'Discard',
          confirmCancel: 'No, let me save'
        }).then(() => {
          resolve(true)
        }).catch(() => {
          resolve(false)
        })
      } else {
        resolve(true)
      }
    })
  }

  run(endpId: string) {
    this.apiProjectDetailService.runEndp(endpId, this.selectedPROJ);
  }

  openTestBuilder(entity) {
    let top = document.querySelector('.designer-cont').scrollTop;
    this.testBuilderOpt = {
      parent: entity._parent,
      key: entity._key,
      val: entity._default,
      showRun: false,
      show: true,
      top: entity.top + top - 100
    }
  }

  saveBuilderTests({ tests, autoSave }: TestBuilderSave) {
    this.endpForm.patchValue({ postrun: this.endpForm.value.postrun + '\n' + tests });
    this.testBuilderOpt.show = false;
    // if (METHOD_WITH_BODY.includes(this.endpForm.value.method.toUpperCase())) {
    //   this.selectedTab.setValue(5)
    // } else {
    //   this.selectedTab.setValue(4)
    // }
    if (autoSave) {
      this.createEndp();
    } else {
      this.toaster.info('Test added to postrun scripts.')
    }
  }

  ngOnDestroy(): void {
    this._destroy.next(true);
    this._destroy.complete();
  }

  ngOnInit(): void { }

  //TODO: Add option to add test from  response schema builder: open test builder
}
