import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { KeyVal } from 'src/app/models/KeyVal.model';
import LocalStore from 'src/app/services/localStore';
import { RememberService } from 'src/app/services/remember.service';
import { Toaster } from 'src/app/services/toaster.service';
import { HTTP_HEADERS, HTTP_METHODES, METHOD_WITH_BODY, RAW_BODY_TYPES } from 'src/app/utils/constants';
import { SaveReqDialogComponent } from '../../save-req-dialog/save-req-dialog.component';

@Component({
  selector: 'app-tab-request',
  templateUrl: './tab-request.component.html',
  styleUrls: ['./tab-request.component.scss']
})
export class TabRequestComponent implements OnInit, OnDestroy {
  httpMethods = HTTP_METHODES;
  RAW_BODY_TYPES = RAW_BODY_TYPES;
  HTTP_HEADERS = HTTP_HEADERS;
  form: FormGroup;
  private _destroy: Subject<boolean> = new Subject<boolean>();

  dummy = ''
  flags = {
    showReq: true,
    reqTab: 'auth_basic',
    urlParamsCount: 0,
    headersCount: 0
  }
  constructor(private fb: FormBuilder,
    private remember: RememberService,
    private dialog: MatDialog,
    private toastr: Toaster) {
    this.form = fb.group({
      name: [''],
      method: ['POST'],
      url: ['asdddddddddddP{{aaa}}aaaaa{{host}}'],
      urlParams: [[]],
      headers: [[]],
      body: fb.group({
        type: ['raw'],
        selectedRaw: [{ name: "JSON", val: "application/json" }],
        xForms: [[]],
        formData: [[]],
        rawData: ['test']
      }),
      savedResp: [''],
      prescript: [''],
      postscript: [''],
      respCodes: [[]]
    });

    this.form.controls.urlParams.valueChanges
      .pipe(takeUntil(this._destroy))
      .subscribe((value: KeyVal[]) => {
        this.flags.urlParamsCount = value.filter(v => v.key).length;
      })
    this.form.controls.headers.valueChanges
      .pipe(takeUntil(this._destroy))
      .subscribe((value: KeyVal[]) => {
        this.flags.headersCount = value.filter(v => v.key).length;
      })

    //load last layout
    this.flags.reqTab = LocalStore.get(LocalStore.REQ_TAB) || 'ReqParam';
  }

  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();
  }

  ngOnInit(): void {
  }

  initReqSave() {
    // if(fromProject?){
    //   update the endpoint with prerun and postrun
    // }
    let request = this.form.value;
    let saveData = {
      url: request.url,
      method: request.method,
      Req: {
        url_params: request.urlParams,
        headers: request.headers
      },
      Body: null,
      tabId: 'TODO:',//TODO:
      respCodes: request.respCodes,
      prescript: request.prescript,
      postscript: request.postscript,
      name: request.name,
      savedResp: request.savedResp
    }
    if (METHOD_WITH_BODY.includes(request.method)) {
      let body = { type: request.body.type };
      switch (request.body.type) {
        case 'form-data':
          saveData.Body = { ...body, formData: request.body.formData };
          //TODO: Handle the input type file eg: formatRequestForSave
          break;
        case 'x-www-form-urlencoded':
          saveData.Body = { ...body, xForms: request.body.xForms };
          break;
        case 'raw':
          saveData.Body = { ...body, selectedRaw: request.body.selectedRaw, rawData: request.body.rawData };
          break;
        case 'graphql':
          saveData.Body = { ...body, selectedRaw: request.body.selectedRaw, rawData: request.body.rawData, gqlVars: request.body.gqlVars };
          break;
      }
    }
    console.log(saveData);
    this.dialog.open(SaveReqDialogComponent, { data: saveData });
  }

  selectTab(type: string, name: string) {
    this.flags[type] = name;
    LocalStore.set(type, name);
    //TODO: Utils.storage.set(type, name);
  }

  initRawBody() {
    // request.Editor.Req.object.completers = [];
    // changeEditorMode(request.Body.selectedRaw.name, 'Req');
  }
  initGQLBody() {
    // request.Editor.Req.object.completers = [{
    //     getCompletions: function (editor, session, pos, prefix, callback) {
    //         callback(null, request.GQLSuggests);
    //     }
    // }]
    // changeEditorMode('graphql', 'Req');
    // GraphQL.loadSchema(request.URL, request.METHOD).then(function (types) {
    //     console.log(types);
    //     request.GQLTypes = types;
    //     request.GQLSuggests = types.suggests;
    //     delete types.suggests;
    // }, function (e) {
    //     request.GQLTypes = null;
    // })
  }

  removeAuthHeader() {
    this.form.patchValue({ headers: this.form.value.headers.filter((h: KeyVal) => h.key.toLocaleLowerCase() !== 'authorization') })
    this.toastr.info('Authorization header removed.');
  }
  updateHeader(name: string, value: string) {
    let headers: KeyVal[] = this.form.value.headers.filter((h: KeyVal) => h.key.toLocaleLowerCase() !== name.toLocaleLowerCase());
    this.form.patchValue({ headers: [...headers, { key: name, val: value, active: true }] });
    this.toastr.info('Header updated');
  }
  prerunUpdated(newVal) {
    if (newVal != this.form.value.prescript) {
      this.form.patchValue({ prescript: newVal });
      this.setDirty();
    }
  }

  postrunUpdated(newVal) {
    if (newVal != this.form.value.postscript) {
      this.form.patchValue({ postscript: newVal });
      this.setDirty();
    }
  }

  setDirty() {
    this.form.markAsDirty();
  }
}
